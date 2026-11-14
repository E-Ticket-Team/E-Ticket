import type { EventStatus, OrderStatus, TicketStatus } from '../types/api';

type AnyStatus = EventStatus | TicketStatus | OrderStatus | string;

export function StatusBadge({ status }: { status: AnyStatus }) {
  const normalized = String(status).toUpperCase();

  let variantClass = 'badge';
  if (
    normalized === 'PUBLISHED' ||
    normalized === 'VALID' ||
    normalized === 'PAID' ||
    normalized === 'OK' ||
    normalized === 'UP'
  ) {
    variantClass = 'badge badge-success';
  } else if (normalized === 'DRAFT' || normalized === 'PENDING' || normalized === 'USED') {
    variantClass = 'badge badge-warning';
  } else if (
    normalized === 'CANCELLED' ||
    normalized === 'REFUNDED' ||
    normalized === 'ERROR' ||
    normalized === 'DOWN'
  ) {
    variantClass = 'badge badge-danger';
  } else if (normalized === 'COMPLETED') {
    variantClass = 'badge badge-info';
  }

  return <span className={variantClass}>{normalized}</span>;
}
