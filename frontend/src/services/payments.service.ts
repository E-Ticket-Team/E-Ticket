import type {
  PaymentProvider,
  PaymentRecord,
  ProcessPaymentResult,
} from '../types/api';
import { API_V1, apiRequest } from './api';

export interface ProcessPaymentPayload {
  provider?: PaymentProvider;
  idempotencyKey?: string;
  simulateOutcome?: 'SUCCEEDED' | 'FAILED';
}

export const paymentsService = {
  processOrderPayment(
    orderId: string,
    payload: ProcessPaymentPayload,
  ): Promise<ProcessPaymentResult> {
    return apiRequest<ProcessPaymentResult>(
      `${API_V1}/orders/${encodeURIComponent(orderId)}/payment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  getOrderPaymentStatus(orderId: string): Promise<{
    orderId: string;
    orderStatus: string;
    totalAmount: string | number;
    currency: string;
    payments: PaymentRecord[];
  }> {
    return apiRequest(`${API_V1}/orders/${encodeURIComponent(orderId)}/payment`);
  },
};
