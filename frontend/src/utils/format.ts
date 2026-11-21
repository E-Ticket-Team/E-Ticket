import type { EventItem, TicketType, UserProfile, UserSummary } from '../types/api';

const DISPLAY_TIMEZONE = 'Asia/Phnom_Penh';

export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Date TBD';
  }

  const dayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const sameDay = dayKey.format(start) === dayKey.format(end);

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
  });

  if (sameDay) {
    return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }

  return `${dateFmt.format(start)} – ${dateFmt.format(end)}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function formatPersonName(
  user?: UserSummary | UserProfile | null,
): string {
  if (!user) return 'Event Organizer';
  if ('organizationName' in user && user.organizationName) {
    return user.organizationName;
  }
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.email;
}

export function formatBuyerName(
  order?: {
    user?: UserSummary | null;
    guestName?: string | null;
    guestEmail?: string | null;
  } | null,
): string {
  if (!order) return 'Guest Attendee';
  if (order.user) return formatPersonName(order.user);
  return order.guestName || order.guestEmail || 'Guest Attendee';
}

export function formatBuyerEmail(
  order?: {
    user?: UserSummary | null;
    guestEmail?: string | null;
  } | null,
): string {
  if (!order) return '—';
  return order.user?.email || order.guestEmail || '—';
}

export function formatBuyerPhone(
  order?: {
    user?: UserSummary | null;
    guestPhone?: string | null;
  } | null,
): string {
  if (!order) return '—';
  return order.user?.phoneNumber || order.guestPhone || '—';
}

export function getLowestPrice(ticketTypes?: TicketType[]): number | null {
  if (!ticketTypes || ticketTypes.length === 0) return null;
  const prices = ticketTypes
    .map((t) => Number(t.price))
    .filter((n) => !Number.isNaN(n));
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function getEventCapacitySummary(event: EventItem): {
  total: number;
  remaining: number;
  sold: number;
} {
  const types = event.ticketTypes ?? [];
  const total = types.reduce((acc, t) => acc + t.totalQuantity, 0);
  const remaining = types.reduce((acc, t) => acc + t.remainingQuantity, 0);
  return {
    total,
    remaining,
    sold: Math.max(0, total - remaining),
  };
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
