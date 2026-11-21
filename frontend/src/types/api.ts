export type Role = 'ADMIN' | 'ORGANIZER' | 'CUSTOMER' | 'SCANNER';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
export type PaymentProvider = 'MOCK' | 'KHQR';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleAuthConfig {
  enabled: boolean;
  clientId: string | null;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organizationName?: string | null;
  phoneNumber?: string | null;
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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface OrderItemDetail {
  id: string;
  orderId: string;
  ticketTypeId: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  ticketType: TicketType & { event: EventItem };
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  providerReference: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketCode: string;
  qrPayload?: string;
  qrCode?: string | null;
  status: TicketStatus;
  usedAt: string | null;
  checkedInById?: string | null;
  checkedInBy?: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  ticketType: TicketType & { event: EventItem };
  order?: OrderSummary;
}

export interface OrderSummary {
  id: string;
  userId: string;
  totalAmount: string | number;
  currency: string;
  status: OrderStatus;
  paymentReference: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: UserSummary;
  items?: OrderItemDetail[];
  payments?: PaymentRecord[];
  tickets?: TicketDetail[];
  _count?: { tickets: number };
}

export interface ProcessPaymentResult {
  idempotentReplay: boolean;
  payment: PaymentRecord;
  order: OrderSummary;
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

export interface EventQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  startAfter?: string;
  endBefore?: string;
  sortBy?: 'startDate' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  mine?: boolean;
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
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

export interface CreateTicketTypePayload {
  eventId: string;
  name: string;
  description?: string;
  price: number;
  totalQuantity: number;
}

export interface UpdateTicketTypePayload {
  name?: string;
  description?: string;
  price?: number;
  totalQuantity?: number;
}

export interface OrganizerDashboardData {
  summary: {
    totalEvents: number;
    publishedEvents: number;
    draftEvents: number;
    ticketsSold: number;
    availableTickets: number;
    grossRevenue: string;
    refundedAmount: string;
    netRevenue: string;
    totalCheckIns: number;
    checkInRate: number;
  };
  revenuePolicy: string;
  salesOverTime: Array<{ date: string; tickets: number; revenue: string }>;
  eventBreakdown: Array<{
    eventId: string;
    title: string;
    status: EventStatus;
    startDate: string;
    venue: string;
    totalCapacity: number;
    remainingQuantity: number;
    ticketsSold: number;
    checkIns: number;
    checkInRate: number;
    grossRevenue: string;
    refundedAmount: string;
    netRevenue: string;
  }>;
}

export interface EventAnalyticsData {
  event: {
    id: string;
    title: string;
    status: EventStatus;
    startDate: string;
    endDate: string;
    venue: string;
  };
  summary: {
    totalCapacity: number;
    remainingQuantity: number;
    ticketsSold: number;
    checkIns: number;
    checkInRate: number;
    grossRevenue: string;
    refundedAmount: string;
    netRevenue: string;
  };
  tierDistribution: Array<{
    ticketTypeId: string;
    name: string;
    price: string | number;
    totalQuantity: number;
    remainingQuantity: number;
    soldCount: number;
    checkedInCount: number;
    cancelledCount: number;
    netRevenue: string;
  }>;
  salesOverTime: Array<{ date: string; tickets: number; revenue: string }>;
}

export interface EventScannerAssignment {
  id: string;
  eventId: string;
  userId: string;
  assignedAt: string;
  user: UserSummary;
}

export interface AdminOverviewData {
  users: {
    total: number;
    byRole: Record<Role, number>;
  };
  events: {
    total: number;
    published: number;
  };
  orders: {
    total: number;
    paid: number;
    grossVolume: string;
    netVolume: string;
  };
  tickets: {
    totalIssued: number;
    checkedIn: number;
  };
}

export interface AdminUserRow extends UserProfile {
  _count?: {
    events: number;
    orders: number;
  };
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
