import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EventStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
  TicketStatus,
} from '@prisma/client';
import { fromMinorUnits, toMinorUnits } from '../../common/utils/money.util';
import { AuthenticatedActor } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CancelOrderDto, CreateOrderDto } from './dto/create-order.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
};

@Injectable()
export class OrdersService {
  private readonly reservationMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ticketsService: TicketsService,
  ) {
    this.reservationMinutes =
      this.configService.get<number>('orders.reservationMinutes') || 15;
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    await this.expireStaleOrders();

    // Coalesce duplicate ticketTypeIds deterministically to avoid deadlocks
    const qtyByTier = new Map<string, number>();
    for (const item of dto.items) {
      const nextQty = (qtyByTier.get(item.ticketTypeId) ?? 0) + item.quantity;
      if (nextQty > 20) {
        throw new BadRequestException(
          'Maximum 20 tickets per tier allowed in a single order',
        );
      }
      qtyByTier.set(item.ticketTypeId, nextQty);
    }

    const sortedItems = Array.from(qtyByTier.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const order = await this.prisma.$transaction(
          async (tx) => {
            const now = new Date();
            const tierIds = sortedItems.map((i) => i.ticketTypeId);
            const tiers = await tx.ticketType.findMany({
              where: { id: { in: tierIds } },
              include: { event: true },
            });

            const tierMap = new Map(tiers.map((t) => [t.id, t]));
            let totalCents = 0;
            const orderItemsData: Array<{
              ticketTypeId: string;
              quantity: number;
              unitPrice: string;
              subtotal: string;
            }> = [];

            for (const item of sortedItems) {
              const tier = tierMap.get(item.ticketTypeId);
              if (!tier) {
                throw new NotFoundException(
                  `Ticket type with ID "${item.ticketTypeId}" not found`,
                );
              }
              if (tier.event.status !== EventStatus.PUBLISHED) {
                throw new BadRequestException(
                  `Event "${tier.event.title}" is not currently open for ticket sales`,
                );
              }
              if (tier.event.endDate <= now) {
                throw new BadRequestException(
                  `Event "${tier.event.title}" has already ended`,
                );
              }

              // Conditional atomic inventory reservation
              const updated = await tx.ticketType.updateMany({
                where: {
                  id: item.ticketTypeId,
                  remainingQuantity: { gte: item.quantity },
                },
                data: {
                  remainingQuantity: { decrement: item.quantity },
                },
              });

              if (updated.count !== 1) {
                throw new ConflictException(
                  `Insufficient ticket inventory for "${tier.name}"`,
                );
              }

              const unitCents = toMinorUnits(tier.price);
              const subtotalCents = unitCents * item.quantity;
              totalCents += subtotalCents;

              orderItemsData.push({
                ticketTypeId: tier.id,
                quantity: item.quantity,
                unitPrice: fromMinorUnits(unitCents),
                subtotal: fromMinorUnits(subtotalCents),
              });
            }

            const expiresAt = new Date(
              now.getTime() + this.reservationMinutes * 60 * 1000,
            );

            return tx.order.create({
              data: {
                userId,
                totalAmount: fromMinorUnits(totalCents),
                currency: 'USD',
                status: OrderStatus.PENDING,
                expiresAt,
                items: {
                  create: orderItemsData,
                },
              },
              include: this.orderInclude(),
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        return this.formatOrder(order);
      } catch (err: any) {
        if (err?.code === 'P2034' && attempt < maxAttempts) {
          continue;
        }
        throw err;
      }
    }
  }

  async getMyOrders(userId: string) {
    await this.expireStaleOrders(userId);

    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.formatOrder(order));
  }

  async getOrderById(orderId: string, currentUser: AuthenticatedActor) {
    await this.expireOrderIfStale(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    if (
      order.userId !== currentUser.id &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return this.formatOrder(order);
  }

  async cancelOrder(
    orderId: string,
    dto: CancelOrderDto,
    currentUser: AuthenticatedActor,
  ) {
    await this.expireOrderIfStale(orderId);

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          tickets: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID "${orderId}" not found`);
      }

      if (
        order.userId !== currentUser.id &&
        currentUser.role !== Role.ADMIN
      ) {
        throw new ForbiddenException('You do not have permission to cancel this order');
      }

      const now = new Date();
      const reason = dto.reason?.trim() || 'Cancelled by user';

      if (order.status === OrderStatus.PENDING) {
        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PENDING,
            inventoryReleased: false,
          },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: now,
            cancellationReason: reason,
            inventoryReleased: true,
          },
        });

        if (claimed.count !== 1) {
          throw new ConflictException('Order status changed concurrently');
        }

        for (const item of order.items) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: { remainingQuantity: { increment: item.quantity } },
          });
        }
      } else if (order.status === OrderStatus.PAID) {
        const anyUsed = order.tickets.some(
          (t) => t.status === TicketStatus.USED,
        );
        if (anyUsed) {
          throw new BadRequestException(
            'Cannot refund an order after a ticket has already been checked in',
          );
        }

        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PAID,
            inventoryReleased: false,
          },
          data: {
            status: OrderStatus.REFUNDED,
            cancelledAt: now,
            cancellationReason: reason,
            inventoryReleased: true,
          },
        });

        if (claimed.count !== 1) {
          throw new ConflictException('Order status changed concurrently');
        }

        await tx.ticket.updateMany({
          where: { orderId: order.id, status: TicketStatus.VALID },
          data: { status: TicketStatus.CANCELLED },
        });

        await tx.payment.updateMany({
          where: { orderId: order.id, status: PaymentStatus.SUCCEEDED },
          data: { status: PaymentStatus.REFUNDED },
        });

        for (const item of order.items) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: { remainingQuantity: { increment: item.quantity } },
          });
        }
      } else {
        throw new BadRequestException(
          `Orders with status "${order.status}" cannot be cancelled`,
        );
      }

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: this.orderInclude(),
      });
    });

    return this.formatOrder(updatedOrder);
  }

  /**
   * Releases reserved inventory for a single stale PENDING order atomically.
   */
  async expireOrderIfStale(orderId: string): Promise<void> {
    const now = new Date();
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        status: OrderStatus.PENDING,
        inventoryReleased: false,
        expiresAt: { lte: now },
      },
      include: { items: true },
    });

    if (order) {
      await this.releaseSingleExpiredOrder(order.id, order.items);
    }
  }

  /**
   * Sweeps stale PENDING orders whose reservation window has elapsed and releases inventory once.
   */
  async expireStaleOrders(userId?: string): Promise<number> {
    const now = new Date();
    const staleOrders = await this.prisma.order.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: OrderStatus.PENDING,
        inventoryReleased: false,
        expiresAt: { lte: now },
      },
      include: { items: true },
      take: 50,
    });

    let releasedCount = 0;
    for (const order of staleOrders) {
      const released = await this.releaseSingleExpiredOrder(
        order.id,
        order.items,
      );
      if (released) {
        releasedCount += 1;
      }
    }
    return releasedCount;
  }

  private async releaseSingleExpiredOrder(
    orderId: string,
    items: Array<{ ticketTypeId: string; quantity: number }>,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.PENDING,
          inventoryReleased: false,
          expiresAt: { lte: now },
        },
        data: {
          status: OrderStatus.EXPIRED,
          inventoryReleased: true,
        },
      });

      if (claimed.count !== 1) {
        return false;
      }

      for (const item of items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { remainingQuantity: { increment: item.quantity } },
        });
      }

      return true;
    });
  }

  private orderInclude() {
    return {
      user: { select: SAFE_USER_SELECT },
      items: {
        include: {
          ticketType: {
            include: {
              event: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' as const },
      },
      tickets: {
        include: {
          ticketType: {
            include: {
              event: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  public formatOrder(order: any) {
    return {
      ...order,
      tickets: Array.isArray(order.tickets)
        ? order.tickets.map((t: any) => {
            const { qrTokenHash: _hidden, ...rest } = t;
            return {
              ...rest,
              qrPayload: this.ticketsService.buildQrPayload(t),
            };
          })
        : [],
    };
  }
}
