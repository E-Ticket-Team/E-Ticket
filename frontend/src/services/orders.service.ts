import type { OrderSummary } from '../types/api';
import { API_V1, apiRequest } from './api';

export interface CreateOrderPayload {
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

function guestHeaders(guestToken?: string | null): Record<string, string> {
  return guestToken ? { 'x-guest-token': guestToken } : {};
}

export const ordersService = {
  create(payload: CreateOrderPayload): Promise<OrderSummary> {
    return apiRequest<OrderSummary>(`${API_V1}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listMine(): Promise<OrderSummary[]> {
    return apiRequest<OrderSummary[]>(`${API_V1}/orders`);
  },

  getById(id: string, guestToken?: string | null): Promise<OrderSummary> {
    return apiRequest<OrderSummary>(`${API_V1}/orders/${encodeURIComponent(id)}`, {
      headers: guestHeaders(guestToken),
      skipUnauthorizedCallback: Boolean(guestToken),
    });
  },

  cancel(
    id: string,
    reason?: string,
    guestToken?: string | null,
  ): Promise<OrderSummary> {
    return apiRequest<OrderSummary>(
      `${API_V1}/orders/${encodeURIComponent(id)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
        headers: guestHeaders(guestToken),
        skipUnauthorizedCallback: Boolean(guestToken),
      },
    );
  },
};
