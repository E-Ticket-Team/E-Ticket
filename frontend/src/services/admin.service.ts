import type {
  AdminOverviewData,
  AdminUserRow,
  OrderStatus,
  OrderSummary,
  PaginatedResponse,
  Role,
  TicketDetail,
  TicketStatus,
} from '../types/api';
import { API_V1, apiRequest } from './api';

export const adminService = {
  getOverview(): Promise<AdminOverviewData> {
    return apiRequest<AdminOverviewData>(`${API_V1}/admin/overview`);
  },

  listUsers(params?: {
    page?: number;
    limit?: number;
    role?: Role | 'ALL';
    search?: string;
  }): Promise<PaginatedResponse<AdminUserRow>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.role && params.role !== 'ALL') qs.set('role', params.role);
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    const queryStr = qs.toString();
    return apiRequest<PaginatedResponse<AdminUserRow>>(
      `${API_V1}/admin/users${queryStr ? `?${queryStr}` : ''}`,
    );
  },

  updateUser(
    id: string,
    payload: { role?: Role; isActive?: boolean },
  ): Promise<AdminUserRow> {
    return apiRequest<AdminUserRow>(
      `${API_V1}/admin/users/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  createUser(payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    organizationName?: string;
    phoneNumber?: string;
    role: Role;
    isActive?: boolean;
  }): Promise<AdminUserRow> {
    return apiRequest<AdminUserRow>(`${API_V1}/admin/users`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus | 'ALL';
    search?: string;
  }): Promise<PaginatedResponse<OrderSummary>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    const queryStr = qs.toString();
    return apiRequest<PaginatedResponse<OrderSummary>>(
      `${API_V1}/admin/orders${queryStr ? `?${queryStr}` : ''}`,
    );
  },

  listTickets(params?: {
    page?: number;
    limit?: number;
    status?: TicketStatus | 'ALL';
    search?: string;
  }): Promise<PaginatedResponse<TicketDetail>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    const queryStr = qs.toString();
    return apiRequest<PaginatedResponse<TicketDetail>>(
      `${API_V1}/admin/tickets${queryStr ? `?${queryStr}` : ''}`,
    );
  },
};
