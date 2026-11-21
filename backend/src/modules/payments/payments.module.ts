import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { KHQRPaymentProvider } from './providers/khqr-payment.provider';
import { MockPaymentProvider } from './providers/mock-payment.provider';

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider, KHQRPaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
