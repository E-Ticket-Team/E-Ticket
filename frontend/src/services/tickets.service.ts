import type {
  CreateTicketTypePayload,
  EventItem,
  TicketDetail,
  TicketType,
  UpdateTicketTypePayload,
  ValidateTicketResponse,
} from '../types/api';
import { API_V1, apiRequest } from './api';

export const ticketsService = {
  getTypesByEvent(eventId: string): Promise<TicketType[]> {
    return apiRequest<TicketType[]>(
      `${API_V1}/tickets/types/event/${encodeURIComponent(eventId)}`,
    );
  },

  createType(payload: CreateTicketTypePayload): Promise<TicketType> {
    return apiRequest<TicketType>(`${API_V1}/tickets/types`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateType(id: string, payload: UpdateTicketTypePayload): Promise<TicketType> {
    return apiRequest<TicketType>(
      `${API_V1}/tickets/types/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  deleteType(id: string): Promise<void> {
    return apiRequest<void>(`${API_V1}/tickets/types/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getMyTickets(): Promise<TicketDetail[]> {
    return apiRequest<TicketDetail[]>(`${API_V1}/tickets/my`);
  },

  getByCode(code: string): Promise<TicketDetail> {
    return apiRequest<TicketDetail>(
      `${API_V1}/tickets/${encodeURIComponent(code.trim())}`,
    );
  },

  getScannerEvents(): Promise<
    Array<
      Pick<
        EventItem,
        'id' | 'title' | 'venue' | 'location' | 'startDate' | 'endDate' | 'status'
      >
    >
  > {
    return apiRequest(`${API_V1}/tickets/scanner/events`);
  },

  validate(ticketCode: string, eventId?: string): Promise<ValidateTicketResponse> {
    return apiRequest<ValidateTicketResponse>(`${API_V1}/tickets/validate`, {
      method: 'POST',
      body: JSON.stringify({
        ticketCode: ticketCode.trim(),
        ...(eventId ? { eventId } : {}),
      }),
    });
  },
};
