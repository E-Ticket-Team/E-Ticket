import type { OrderSummary } from '../types/api';
import { API_V1, apiRequest } from './api';

export interface CreateOrderPayload {
  items: Array<{
    ticketTypeId: string;
    quantity: number;
  }>;
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

  getById(id: string): Promise<OrderSummary> {
    return apiRequest<OrderSummary>(`${API_V1}/orders/${encodeURIComponent(id)}`);
  },

  cancel(id: string, reason?: string): Promise<OrderSummary> {
    return apiRequest<OrderSummary>(
      `${API_V1}/orders/${encodeURIComponent(id)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    );
  },
};
