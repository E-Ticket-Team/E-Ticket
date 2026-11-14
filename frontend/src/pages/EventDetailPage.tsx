import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Edit3,
  Layers,
  MapPin,
  Ticket,
  User,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { EventItem, TicketType } from '../types/api';
import {
  formatCurrency,
  formatDateRange,
  formatDateTime,
  formatPersonName,
} from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { StatusBadge } from '../components/StatusBadge';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const [evData, tiersData] = await Promise.all([
          api.getEvent(id),
          api.getTicketTypesByEvent(id),
        ]);
        if (active) {
          setEvent(evData);
          setTicketTypes(tiersData);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load event details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading event details...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div>
        <Link to="/events" className="btn btn-secondary" style={{ marginBottom: 20 }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <AlertBanner
          variant="error"
          title="Event Unavailable"
          message={error || 'Event could not be found.'}
        />
      </div>
    );
  }

  const showImage = Boolean(event.bannerUrl && !imgError);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <Link to="/events" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>All Events</span>
        </Link>

        <Link to={`/organizer/events/${event.id}/edit`} className="btn btn-primary">
          <Edit3 size={16} />
          <span>Edit Event &amp; Tiers</span>
        </Link>
      </div>

      <div className="detail-banner">
        {showImage ? (
          <img
            src={event.bannerUrl!}
            alt={event.title}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="event-banner-fallback">
            <Ticket size={44} />
            <span>{event.category || 'Universal E-Ticket Event'}</span>
          </div>
        )}
      </div>

      <div className="detail-grid">
        <div className="card card-padded">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <span className="badge badge-info">{event.category || 'General'}</span>
            <StatusBadge status={event.status} />
          </div>

          <h1 className="page-title" style={{ marginBottom: 16 }}>
            {event.title}
          </h1>

          <div className="event-meta" style={{ fontSize: '0.95rem', gap: 10, marginBottom: 22 }}>
            <div className="event-meta-row">
              <Calendar size={17} />
              <span>{formatDateRange(event.startDate, event.endDate)}</span>
            </div>
            <div className="event-meta-row">
              <MapPin size={17} />
              <span>
                {event.venue}
                {event.location ? ` · ${event.location}` : ''}
              </span>
            </div>
            <div className="event-meta-row">
              <User size={17} />
              <span>
                Organized by <strong>{formatPersonName(event.organizer)}</strong>
                {event.organizer?.email ? ` (${event.organizer.email})` : ''}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10 }}>
              About This Event
            </h2>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
              {event.description || 'No description has been added for this event yet.'}
            </p>
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              <strong style={{ color: 'var(--text-secondary)' }}>Starts:</strong>{' '}
              {formatDateTime(event.startDate)}
            </div>
            <div>
              <strong style={{ color: 'var(--text-secondary)' }}>Ends:</strong>{' '}
              {formatDateTime(event.endDate)}
            </div>
            <div>
              <strong style={{ color: 'var(--text-secondary)' }}>Event ID:</strong>{' '}
              <span className="code-chip" style={{ fontSize: '0.78rem' }}>
                {event.id}
              </span>
            </div>
          </div>
        </div>

        <aside className="card card-padded">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="var(--brand-primary)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Ticket Tiers</h2>
            </div>
            <span className="badge">{ticketTypes.length} tiers</span>
          </div>

          {ticketTypes.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: 18,
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
                No ticket tiers have been configured for this event yet.
              </p>
              <Link
                to={`/organizer/events/${event.id}/edit`}
                className="btn btn-primary btn-sm"
              >
                Add Ticket Tier
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ticketTypes.map((tier) => {
                const sold = Math.max(0, tier.totalQuantity - tier.remainingQuantity);
                const pct =
                  tier.totalQuantity > 0
                    ? Math.round((tier.remainingQuantity / tier.totalQuantity) * 100)
                    : 0;

                return (
                  <div key={tier.id} className="tier-card">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{tier.name}</h3>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '1.08rem',
                          color: 'var(--brand-primary)',
                        }}
                      >
                        {formatCurrency(tier.price)}
                      </span>
                    </div>

                    {tier.description && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          marginBottom: 10,
                        }}
                      >
                        {tier.description}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      <span>{tier.remainingQuantity} remaining</span>
                      <span>
                        {sold} / {tier.totalQuantity} issued
                      </span>
                    </div>

                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Link to="/tickets" className="btn btn-secondary" style={{ width: '100%' }}>
              Look Up an Existing Ticket
            </Link>
            <Link to="/scanner" className="btn btn-dark" style={{ width: '100%' }}>
              Verify Ticket at Gate
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
