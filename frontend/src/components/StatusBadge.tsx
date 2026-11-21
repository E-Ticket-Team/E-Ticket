import type { EventStatus, OrderStatus, PaymentStatus, TicketStatus } from '../types/api';

type AnyStatus = EventStatus | TicketStatus | OrderStatus | PaymentStatus | string;

export function StatusBadge({ status }: { status: AnyStatus }) {
  const normalized = String(status).toUpperCase();

  let variantClass = 'badge';
  if (
    normalized === 'PUBLISHED' ||
    normalized === 'VALID' ||
    normalized === 'PAID' ||
    normalized === 'SUCCEEDED' ||
    normalized === 'OK' ||
    normalized === 'UP' ||
    normalized === 'ACTIVE'
  ) {
    variantClass = 'badge badge-success';
  } else if (
    normalized === 'DRAFT' ||
    normalized === 'PENDING' ||
    normalized === 'USED' ||
    normalized === 'EXPIRED'
  ) {
    variantClass = 'badge badge-warning';
  } else if (
    normalized === 'CANCELLED' ||
    normalized === 'REFUNDED' ||
    normalized === 'FAILED' ||
    normalized === 'ERROR' ||
    normalized === 'DOWN' ||
    normalized === 'SUSPENDED'
  ) {
    variantClass = 'badge badge-danger';
  } else if (normalized === 'COMPLETED') {
    variantClass = 'badge badge-info';
  }

  return (
    <span className={variantClass}>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          flexShrink: 0,
        }}
      />
      {normalized}
    </span>
  );
}
