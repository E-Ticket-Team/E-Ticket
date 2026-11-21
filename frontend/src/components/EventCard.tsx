import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Ticket } from 'lucide-react';
import type { EventItem } from '../types/api';
import {
  formatCurrency,
  formatDateRange,
  getEventCapacitySummary,
  getLowestPrice,
} from '../utils/format';

function getDateBadge(iso: string): { month: string; day: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    month: 'short',
  }).format(date);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
  }).format(date);
  return { month, day };
}

export function EventCard({ event }: { event: EventItem }) {
  const [imgError, setImgError] = useState(false);
  const lowestPrice = getLowestPrice(event.ticketTypes);
  const { total, remaining } = getEventCapacitySummary(event);
  const showImage = Boolean(event.bannerUrl && !imgError);
  const dateBadge = getDateBadge(event.startDate);

  return (
    <article className="event-card">
      <Link to={`/events/${event.id}`} className="event-banner">
        {dateBadge && (
          <div className="event-date-chip" aria-hidden="true">
            <span className="event-date-chip-month">{dateBadge.month}</span>
            <span className="event-date-chip-day">{dateBadge.day}</span>
          </div>
        )}

        {showImage ? (
          <img
            src={event.bannerUrl!}
            alt={event.title}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="event-banner-fallback">
            <Ticket size={28} />
            <span>{event.category || 'Live Experience'}</span>
          </div>
        )}
      </Link>

      <div className="event-card-body">
        <div className="event-card-badges">
          <span className="eyebrow-label" style={{ fontSize: '0.7rem' }}>
            {event.category || 'Live Event'}
          </span>
          {total > 0 && remaining <= 10 && remaining > 0 && (
            <span className="badge badge-warning">Few Left</span>
          )}
        </div>

        <Link to={`/events/${event.id}`}>
          <h3 className="event-card-title">{event.title}</h3>
        </Link>

        <div className="event-meta">
          <span>{formatDateRange(event.startDate, event.endDate)}</span>
          <div className="event-meta-row">
            <MapPin size={14} color="var(--color-primary)" />
            <span>
              {event.venue}
              {event.location ? ` · ${event.location}` : ''}
            </span>
          </div>
        </div>

        <div className="event-card-footer">
          <div>
            <span className="price-tag">
              {lowestPrice !== null ? `From ${formatCurrency(lowestPrice)}` : 'Tiers Pending'}
            </span>
            <span className="price-sub">
              {total > 0 ? `${remaining} available` : 'Coming soon'}
            </span>
          </div>

          <Link to={`/events/${event.id}`} className="btn btn-secondary btn-sm">
            <span>Tickets</span>
            <ArrowRight size={14} className="arrow-shift" />
          </Link>
        </div>
      </div>
    </article>
  );
}
