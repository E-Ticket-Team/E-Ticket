export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: string | number;
  totalQuantity: number;
  remainingQuantity: number;
  createdAt: string;
  updatedAt: string;
  event?: EventItem;
}

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  venue: string;
  location: string | null;
  bannerUrl: string | null;
  startDate: string;
  endDate: string;
  status: EventStatus;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  organizer?: UserSummary;
  ticketTypes?: TicketType[];
}

export interface OrderSummary {
  id: string;
  userId: string;
  totalAmount: string | number;
  status: OrderStatus;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
  user?: UserSummary;
}

export interface TicketDetail {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketCode: string;
  qrCode: string | null;
  status: TicketStatus;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ticketType: TicketType & { event: EventItem };
  order?: OrderSummary;
}

export interface ValidateTicketResponse {
  valid: boolean;
  message: string;
  ticket: TicketDetail;
}

export interface DatabaseHealth {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  database: DatabaseHealth;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  category?: string;
  venue: string;
  location?: string;
  bannerUrl?: string;
  startDate: string;
  endDate: string;
  status?: EventStatus;
  organizerId: string;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

export interface CreateTicketTypePayload {
  eventId: string;
  name: string;
  description?: string;
  price: number;
  totalQuantity: number;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path?: string;
  method?: string;
}
