import type {
  EventAnalyticsData,
  EventScannerAssignment,
  OrderSummary,
  OrganizerDashboardData,
  TicketDetail,
  TicketStatus,
} from '../types/api';
import { API_V1, apiRequest } from './api';

export const organizerService = {
  getDashboard(): Promise<OrganizerDashboardData> {
    return apiRequest<OrganizerDashboardData>(`${API_V1}/organizer/dashboard`);
  },

  getOrders(): Promise<OrderSummary[]> {
    return apiRequest<OrderSummary[]>(`${API_V1}/organizer/orders`);
  },

  getEventAnalytics(eventId: string): Promise<EventAnalyticsData> {
    return apiRequest<EventAnalyticsData>(
      `${API_V1}/organizer/events/${encodeURIComponent(eventId)}/analytics`,
    );
  },

  getEventAttendees(
    eventId: string,
    params?: { search?: string; ticketTypeId?: string; status?: TicketStatus | 'ALL' },
  ): Promise<TicketDetail[]> {
    const qs = new URLSearchParams();
    if (params?.search?.trim()) qs.set('search', params.search.trim());
    if (params?.ticketTypeId && params.ticketTypeId !== 'ALL') {
      qs.set('ticketTypeId', params.ticketTypeId);
    }
    if (params?.status && params.status !== 'ALL') {
      qs.set('status', params.status);
    }
    const queryStr = qs.toString();
    return apiRequest<TicketDetail[]>(
      `${API_V1}/organizer/events/${encodeURIComponent(eventId)}/attendees${queryStr ? `?${queryStr}` : ''}`,
    );
  },

  getEventCheckIns(eventId: string): Promise<TicketDetail[]> {
    return apiRequest<TicketDetail[]>(
      `${API_V1}/organizer/events/${encodeURIComponent(eventId)}/check-ins`,
    );
  },

  getEventScanners(eventId: string): Promise<EventScannerAssignment[]> {
    return apiRequest<EventScannerAssignment[]>(
      `${API_V1}/organizer/events/${encodeURIComponent(eventId)}/scanners`,
    );
  },

  assignScanner(eventId: string, email: string): Promise<EventScannerAssignment> {
    return apiRequest<EventScannerAssignment>(
      `${API_V1}/organizer/events/${encodeURIComponent(eventId)}/scanners`,
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
    );
  },

  removeScanner(eventId: string, userId: string): Promise<void> {
    return apiRequest<void>(
      `${API_V1}/organizer/events/${encodeURIComponent(eventId)}/scanners/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  },
};
