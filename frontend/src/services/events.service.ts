import type {
  CreateEventPayload,
  EventItem,
  EventQueryParams,
  PaginatedResponse,
  UpdateEventPayload,
} from '../types/api';
import { API_V1, apiRequest } from './api';

export const eventsService = {
  list(params?: EventQueryParams): Promise<PaginatedResponse<EventItem>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    if (params?.category && params.category !== 'ALL') qs.set('category', params.category);
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.startAfter) qs.set('startAfter', params.startAfter);
    if (params?.endBefore) qs.set('endBefore', params.endBefore);
    if (params?.sortBy) qs.set('sortBy', params.sortBy);
    if (params?.sortOrder) qs.set('sortOrder', params.sortOrder);
    if (params?.mine) qs.set('mine', 'true');
    const queryStr = qs.toString();
    return apiRequest<PaginatedResponse<EventItem>>(
      `${API_V1}/events${queryStr ? `?${queryStr}` : ''}`,
    );
  },

  getCategories(): Promise<string[]> {
    return apiRequest<string[]>(`${API_V1}/events/categories`);
  },

  getById(id: string): Promise<EventItem> {
    return apiRequest<EventItem>(`${API_V1}/events/${encodeURIComponent(id)}`);
  },

  create(payload: CreateEventPayload): Promise<EventItem> {
    return apiRequest<EventItem>(`${API_V1}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateEventPayload): Promise<EventItem> {
    return apiRequest<EventItem>(`${API_V1}/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<void> {
    return apiRequest<void>(`${API_V1}/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
