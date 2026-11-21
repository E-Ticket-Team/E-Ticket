import { PaymentProvider } from '@prisma/client';

export interface PaymentExecutionInput {
  orderId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  simulateOutcome?: 'SUCCEEDED' | 'FAILED';
}

export interface PaymentExecutionResult {
  provider: PaymentProvider;
  status: 'SUCCEEDED' | 'FAILED';
  providerReference: string;
  failureReason?: string;
  metadata: Record<string, unknown>;
}

export interface PaymentProviderStrategy {
  readonly provider: PaymentProvider;
  processPayment(input: PaymentExecutionInput): Promise<PaymentExecutionResult>;
}
