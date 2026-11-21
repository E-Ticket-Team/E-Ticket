import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedActor } from '../events/events.service';
import {
  PaymentWebhookDto,
  ProcessPaymentDto,
} from './dto/process-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:id/payment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Confirm and process payment for a pending order (idempotent)',
    description:
      'Verifies order ownership, processes via MockPaymentProvider (development) or configured provider, atomically transitions order to PAID, and issues QR tickets once.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment processed' })
  processOrderPayment(
    @Param('id') orderId: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.paymentsService.processOrderPayment(orderId, dto, user);
  }

  @Get('orders/:id/payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Retrieve payment status and attempts for an order',
  })
  getOrderPayment(
    @Param('id') orderId: string,
    @CurrentUser() user: AuthenticatedActor,
  ) {
    return this.paymentsService.getOrderPayments(orderId, user);
  }

  @Post('payments/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment provider webhook callback (HMAC signature verified & idempotent)',
  })
  handleWebhook(
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    return this.paymentsService.handleWebhook(signature, dto);
  }
}
