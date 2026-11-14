import type { EventItem, TicketType, UserSummary } from '../types/api';

export const DEFAULT_ORGANIZER_ID = 'a0000000-0000-0000-0000-000000000001';
export const SAMPLE_TICKET_CODE = 'TKT-2026-VIP-001';

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

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
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

export function formatPersonName(user?: UserSummary | null): string {
  if (!user) return 'Event Organizer';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.email;
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
