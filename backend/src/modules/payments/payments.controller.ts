import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
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
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Confirm and process payment for a pending order (user or guest token)',
    description:
      'Verifies order ownership or guest order token, processes via MockPaymentProvider (development) or configured provider, atomically transitions order to PAID, and issues QR tickets once.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment processed' })
  processOrderPayment(
    @Param('id') orderId: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: AuthenticatedActor | null,
    @Headers('x-guest-token') guestTokenHeader?: string,
    @Query('token') guestTokenQuery?: string,
  ) {
    return this.paymentsService.processOrderPayment(
      orderId,
      dto,
      user,
      guestTokenHeader || guestTokenQuery || null,
    );
  }

  @Get('orders/:id/payment')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Retrieve payment status and attempts for an order (user or guest token)',
  })
  getOrderPayment(
    @Param('id') orderId: string,
    @CurrentUser() user: AuthenticatedActor | null,
    @Headers('x-guest-token') guestTokenHeader?: string,
    @Query('token') guestTokenQuery?: string,
  ) {
    return this.paymentsService.getOrderPayments(
      orderId,
      user,
      guestTokenHeader || guestTokenQuery || null,
    );
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
