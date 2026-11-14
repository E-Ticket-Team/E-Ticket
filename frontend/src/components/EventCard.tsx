import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import type { EventItem } from '../types/api';
import {
  formatCurrency,
  formatDateRange,
  getEventCapacitySummary,
  getLowestPrice,
} from '../utils/format';
import { StatusBadge } from './StatusBadge';

export function EventCard({ event }: { event: EventItem }) {
  const [imgError, setImgError] = useState(false);
  const lowestPrice = getLowestPrice(event.ticketTypes);
  const { total, remaining } = getEventCapacitySummary(event);
  const showImage = Boolean(event.bannerUrl && !imgError);

  return (
    <article className="event-card">
      <Link to={`/events/${event.id}`} className="event-banner">
        {showImage ? (
          <img
            src={event.bannerUrl!}
            alt={event.title}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="event-banner-fallback">
            <Ticket size={30} />
            <span>{event.category || 'Live Event'}</span>
          </div>
        )}
      </Link>

      <div className="event-card-body">
        <div className="event-card-badges">
          <span className="badge badge-info">{event.category || 'General'}</span>
          <StatusBadge status={event.status} />
        </div>

        <Link to={`/events/${event.id}`}>
          <h3 className="event-card-title">{event.title}</h3>
        </Link>

        <div className="event-meta">
          <div className="event-meta-row">
            <Calendar size={15} />
            <span>{formatDateRange(event.startDate, event.endDate)}</span>
          </div>
          <div className="event-meta-row">
            <MapPin size={15} />
            <span>
              {event.venue}
              {event.location ? ` · ${event.location}` : ''}
            </span>
          </div>
        </div>

        <div className="event-card-footer">
          <div>
            <span className="price-tag">
              {lowestPrice !== null ? `From ${formatCurrency(lowestPrice)}` : 'No tiers yet'}
            </span>
            <span className="price-sub">
              {total > 0 ? `${remaining} of ${total} tickets left` : 'Tier setup pending'}
            </span>
          </div>

          <Link to={`/events/${event.id}`} className="btn btn-primary btn-sm">
            View Event
          </Link>
        </div>
      </div>
    </article>
  );
}
