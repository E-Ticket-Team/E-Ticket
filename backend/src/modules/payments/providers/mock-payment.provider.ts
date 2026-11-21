import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import * as crypto from 'crypto';
import {
  PaymentExecutionInput,
  PaymentExecutionResult,
  PaymentProviderStrategy,
} from './payment-provider.interface';

/**
 * Development-only simulated payment provider for local & automated E2E testing.
 * Never represents a real banking or card gateway settlement.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProviderStrategy {
  readonly provider = PaymentProvider.MOCK;

  async processPayment(
    input: PaymentExecutionInput,
  ): Promise<PaymentExecutionResult> {
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const providerReference = `MOCK-REF-${suffix}`;
    const outcome = input.simulateOutcome ?? 'SUCCEEDED';

    if (outcome === 'FAILED') {
      return {
        provider: this.provider,
        status: 'FAILED',
        providerReference,
        failureReason: 'Simulated payment decline (development mock provider)',
        metadata: {
          isDevelopmentMock: true,
          simulatedOutcome: 'FAILED',
          idempotencyKey: input.idempotencyKey,
        },
      };
    }

    return {
      provider: this.provider,
      status: 'SUCCEEDED',
      providerReference,
      metadata: {
        isDevelopmentMock: true,
        simulatedOutcome: 'SUCCEEDED',
        amount: input.amount,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
      },
    };
  }
}
