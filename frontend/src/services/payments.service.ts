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

function guestHeaders(guestToken?: string | null): Record<string, string> {
  return guestToken ? { 'x-guest-token': guestToken } : {};
}

export const paymentsService = {
  processOrderPayment(
    orderId: string,
    payload: ProcessPaymentPayload,
    guestToken?: string | null,
  ): Promise<ProcessPaymentResult> {
    return apiRequest<ProcessPaymentResult>(
      `${API_V1}/orders/${encodeURIComponent(orderId)}/payment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: guestHeaders(guestToken),
        skipUnauthorizedCallback: Boolean(guestToken),
      },
    );
  },

  getOrderPaymentStatus(
    orderId: string,
    guestToken?: string | null,
  ): Promise<{
    orderId: string;
    orderStatus: string;
    totalAmount: string | number;
    currency: string;
    payments: PaymentRecord[];
  }> {
    return apiRequest(`${API_V1}/orders/${encodeURIComponent(orderId)}/payment`, {
      headers: guestHeaders(guestToken),
      skipUnauthorizedCallback: Boolean(guestToken),
    });
  },
};
