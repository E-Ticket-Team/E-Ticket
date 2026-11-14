import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  CreateEventPayload,
  CreateTicketTypePayload,
  EventItem,
  HealthResponse,
  TicketDetail,
  TicketType,
  UpdateEventPayload,
  ValidateTicketResponse,
} from '../types/api';

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
const API_V1 = `${BASE_URL}/api/v1`;

export class ApiError extends Error {
  statusCode: number;
  errorType: string;
  details: string[];

  constructor(statusCode: number, errorType: string, message: string | string[]) {
    const details = Array.isArray(message) ? message : [message];
    super(details.join(' • '));
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, 'Request failed');
    }
    return undefined as T;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(
      response.status,
      'Invalid Response',
      `Unexpected non-JSON response (${response.status})`,
    );
  }

  if (!response.ok) {
    const errPayload = parsed as Partial<ApiErrorEnvelope>;
    throw new ApiError(
      errPayload.statusCode ?? response.status,
      errPayload.error ?? response.statusText,
      errPayload.message ?? 'An unexpected error occurred',
    );
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'success' in parsed &&
    (parsed as ApiSuccessEnvelope<T>).success === true &&
    'data' in parsed
  ) {
    return (parsed as ApiSuccessEnvelope<T>).data;
  }

  return parsed as T;
}

export const api = {
  // Health endpoint (not wrapped in TransformInterceptor)
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>(`${BASE_URL}/health`);
  },

  // Events
  async listEvents(filters?: { category?: string; status?: string }): Promise<EventItem[]> {
    const params = new URLSearchParams();
    if (filters?.category && filters.category.trim()) {
      params.set('category', filters.category.trim());
    }
    if (filters?.status && filters.status.trim()) {
      params.set('status', filters.status.trim());
    }
    const qs = params.toString();
    return request<EventItem[]>(`${API_V1}/events${qs ? `?${qs}` : ''}`);
  },

  async getEvent(id: string): Promise<EventItem> {
    return request<EventItem>(`${API_V1}/events/${encodeURIComponent(id)}`);
  },

  async createEvent(payload: CreateEventPayload): Promise<EventItem> {
    return request<EventItem>(`${API_V1}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEvent(id: string, payload: UpdateEventPayload): Promise<EventItem> {
    return request<EventItem>(`${API_V1}/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteEvent(id: string): Promise<void> {
    return request<void>(`${API_V1}/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Tickets & Ticket Types
  async getTicketTypesByEvent(eventId: string): Promise<TicketType[]> {
    return request<TicketType[]>(
      `${API_V1}/tickets/types/event/${encodeURIComponent(eventId)}`,
    );
  },

  async createTicketType(payload: CreateTicketTypePayload): Promise<TicketType> {
    return request<TicketType>(`${API_V1}/tickets/types`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getTicketByCode(code: string): Promise<TicketDetail> {
    return request<TicketDetail>(`${API_V1}/tickets/${encodeURIComponent(code.trim())}`);
  },

  async validateTicket(ticketCode: string): Promise<ValidateTicketResponse> {
    return request<ValidateTicketResponse>(`${API_V1}/tickets/validate`, {
      method: 'POST',
      body: JSON.stringify({ ticketCode: ticketCode.trim() }),
    });
  },
};
