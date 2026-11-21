import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import {
  PaymentExecutionInput,
  PaymentExecutionResult,
  PaymentProviderStrategy,
} from './payment-provider.interface';

/**
 * Placeholder strategy defining the future NBC Bakong KHQR integration contract.
 * Intentionally unimplemented until live merchant credentials and Bakong API verification are configured.
 */
@Injectable()
export class KHQRPaymentProvider implements PaymentProviderStrategy {
  readonly provider = PaymentProvider.KHQR;

  async processPayment(
    _input: PaymentExecutionInput,
  ): Promise<PaymentExecutionResult> {
    throw new NotImplementedException(
      'KHQR live banking integration is not configured in this environment. Use MOCK provider for development testing.',
    );
  }
}
