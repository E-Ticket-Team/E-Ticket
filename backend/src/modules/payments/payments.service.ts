import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  TicketStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import {
  generateTicketCode,
  hashCredential,
  signTicketCredential,
} from '../../common/utils/qr-credential.util';
import { AuthenticatedActor } from '../events/events.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentWebhookDto,
  ProcessPaymentDto,
} from './dto/process-payment.dto';
import { KHQRPaymentProvider } from './providers/khqr-payment.provider';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import {
  PaymentExecutionResult,
  PaymentProviderStrategy,
} from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly qrSigningSecret: string;
  private readonly providers: Map<PaymentProvider, PaymentProviderStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    mockProvider: MockPaymentProvider,
    khqrProvider: KHQRPaymentProvider,
  ) {
    this.qrSigningSecret =
      this.configService.get<string>('jwt.qrSigningSecret') ||
      this.configService.get<string>('jwt.secret') ||
      'eticket-qr-signing-secret-change-in-production-2026';

    this.providers = new Map<PaymentProvider, PaymentProviderStrategy>([
      [PaymentProvider.MOCK, mockProvider],
      [PaymentProvider.KHQR, khqrProvider],
    ]);
  }

  async processOrderPayment(
    orderId: string,
    dto: ProcessPaymentDto,
    currentUser?: AuthenticatedActor | null,
    guestToken?: string | null,
  ) {
    await this.ordersService.expireOrderIfStale(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    this.ordersService.assertOrderAccess(order, currentUser, guestToken);

    const idempotencyKey =
      dto.idempotencyKey?.trim() || `pay-${orderId}-${crypto.randomUUID()}`;

    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (existingPayment) {
      if (existingPayment.orderId !== orderId) {
        throw new ConflictException(
          'Idempotency key has already been used for a different order',
        );
      }
      const hydratedOrder = await this.ordersService.getOrderById(
        orderId,
        currentUser,
        guestToken,
      );
      return {
        idempotentReplay: true,
        payment: existingPayment,
        order: hydratedOrder,
      };
    }

    this.ensureOrderPayable(order.status, order.expiresAt);

    const providerKey = dto.provider ?? PaymentProvider.MOCK;
    const strategy = this.providers.get(providerKey);
    if (!strategy) {
      throw new BadRequestException(`Unsupported payment provider: ${providerKey}`);
    }

    const execution = await strategy.processPayment({
      orderId: order.id,
      amount: order.totalAmount.toString(),
      currency: order.currency,
      idempotencyKey,
      simulateOutcome: dto.simulateOutcome,
    });

    return this.settlePayment(orderId, idempotencyKey, execution);
  }

  async getOrderPayments(
    orderId: string,
    currentUser?: AuthenticatedActor | null,
    guestToken?: string | null,
  ) {
    const order = await this.ordersService.getOrderById(
      orderId,
      currentUser,
      guestToken,
    );
    return {
      orderId: order.id,
      orderStatus: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      payments: order.payments,
    };
  }

  async handleWebhook(
    signatureHeader: string | undefined,
    dto: PaymentWebhookDto,
  ) {
    if (!signatureHeader) {
      throw new UnauthorizedException('Missing webhook signature header');
    }

    const expectedSig = crypto
      .createHmac('sha256', this.qrSigningSecret)
      .update(`${dto.orderId}:${dto.providerReference}:${dto.status}`)
      .digest('hex');

    const providedBuf = Buffer.from(signatureHeader.trim(), 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    await this.ordersService.expireOrderIfStale(dto.orderId);

    const existingByIdem = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existingByIdem) {
      if (existingByIdem.orderId !== dto.orderId) {
        throw new ConflictException('Webhook idempotency key mismatch');
      }
      const order = await this.prisma.order.findUniqueOrThrow({
        where: { id: dto.orderId },
        include: { items: true, payments: true, tickets: true },
      });
      return {
        idempotentReplay: true,
        payment: existingByIdem,
        order: this.ordersService.formatOrder(order),
      };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${dto.orderId}" not found`);
    }

    if (order.status === OrderStatus.PAID) {
      const hydrated = await this.prisma.order.findUniqueOrThrow({
        where: { id: dto.orderId },
        include: { items: true, payments: true, tickets: true },
      });
      return {
        idempotentReplay: true,
        payment: hydrated.payments[0] ?? null,
        order: this.ordersService.formatOrder(hydrated),
      };
    }

    this.ensureOrderPayable(order.status, order.expiresAt);

    return this.settlePayment(dto.orderId, dto.idempotencyKey, {
      provider: dto.provider,
      status: dto.status,
      providerReference: dto.providerReference,
      failureReason: dto.failureReason,
      metadata: { source: 'webhook' },
    });
  }

  private async settlePayment(
    orderId: string,
    idempotencyKey: string,
    execution: PaymentExecutionResult,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      if (execution.status === 'FAILED') {
        const failedPayment = await tx.payment.create({
          data: {
            orderId,
            provider: execution.provider,
            amount: order.totalAmount,
            currency: order.currency,
            status: PaymentStatus.FAILED,
            idempotencyKey,
            providerReference: execution.providerReference,
            failureReason: execution.failureReason,
            metadata: execution.metadata as any,
          },
        });

        const latestOrder = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            items: { include: { ticketType: { include: { event: true } } } },
            payments: { orderBy: { createdAt: 'desc' } },
            tickets: true,
          },
        });

        return {
          idempotentReplay: false,
          payment: failedPayment,
          order: this.ordersService.formatOrder(latestOrder),
        };
      }

      const now = new Date();
      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.PENDING,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: {
          status: OrderStatus.PAID,
          paidAt: now,
          paymentReference: execution.providerReference,
        },
      });

      if (claimed.count !== 1) {
        throw new ConflictException(
          'Order cannot be confirmed because it was already paid, cancelled, or expired',
        );
      }

      const payment = await tx.payment.create({
        data: {
          orderId,
          provider: execution.provider,
          amount: order.totalAmount,
          currency: order.currency,
          status: PaymentStatus.SUCCEEDED,
          idempotencyKey,
          providerReference: execution.providerReference,
          paidAt: now,
          metadata: execution.metadata as any,
        },
      });

      // Idempotent ticket issuance: issue exact item quantities only once
      const existingTicketCount = await tx.ticket.count({
        where: { orderId },
      });

      if (existingTicketCount === 0) {
        for (const item of order.items) {
          for (let i = 0; i < item.quantity; i++) {
            const ticketId = crypto.randomUUID();
            const ticketCode = generateTicketCode();
            const qrPayload = signTicketCredential(
              ticketId,
              ticketCode,
              this.qrSigningSecret,
            );
            const qrTokenHash = hashCredential(qrPayload);

            await tx.ticket.create({
              data: {
                id: ticketId,
                orderId,
                ticketTypeId: item.ticketTypeId,
                ticketCode,
                qrTokenHash,
                status: TicketStatus.VALID,
              },
            });
          }
        }
      }

      const fullOrder = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: { include: { ticketType: { include: { event: true } } } },
          payments: { orderBy: { createdAt: 'desc' } },
          tickets: {
            include: { ticketType: { include: { event: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return {
        idempotentReplay: false,
        payment,
        order: this.ordersService.formatOrder(fullOrder),
      };
    });
  }

  private ensureOrderPayable(status: OrderStatus, expiresAt: Date | null) {
    if (status === OrderStatus.PAID) {
      throw new ConflictException('Order has already been paid');
    }
    if (status === OrderStatus.EXPIRED || (expiresAt && expiresAt <= new Date())) {
      throw new ConflictException('Order reservation has expired');
    }
    if (status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Order has been cancelled');
    }
  }
}
