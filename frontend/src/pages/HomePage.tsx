import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { EventItem } from '../types/api';
import { getEventCapacitySummary, SAMPLE_TICKET_CODE } from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';

export function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const data = await api.listEvents();
        if (active) {
          setEvents(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to reach the backend API. Make sure the server is running on port 4000.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const publishedEvents = events.filter((e) => e.status === 'PUBLISHED');
  const featuredEvents = (publishedEvents.length > 0 ? publishedEvents : events).slice(0, 6);
  const totalTicketsLeft = events.reduce(
    (sum, ev) => sum + getEventCapacitySummary(ev).remaining,
    0,
  );
  const totalTiers = events.reduce((sum, ev) => sum + (ev.ticketTypes?.length ?? 0), 0);

  function handleTicketLookup(e: FormEvent) {
    e.preventDefault();
    const cleaned = ticketCode.trim();
    if (!cleaned) return;
    navigate(`/tickets/${encodeURIComponent(cleaned)}`);
  }

  return (
    <div>
      <section className="hero">
        <div>
          <div className="hero-eyebrow">
            <Sparkles size={14} />
            <span>Universal E-Ticketing Platform</span>
          </div>
          <h1>Discover live events, access QR passes & verify entry in seconds.</h1>
          <p>
            Manage events, configure ticket tiers, retrieve digital QR passes, and validate
            single-entry check-ins directly with your NestJS + PostgreSQL backend.
          </p>
          <div className="hero-actions">
            <Link to="/events" className="btn btn-primary btn-lg">
              <CalendarDays size={18} />
              <span>Browse All Events</span>
            </Link>
            <Link to="/scanner" className="btn btn-secondary btn-lg">
              <QrCode size={18} />
              <span>Open Gate Scanner</span>
            </Link>
            <Link to="/organizer/events/new" className="btn btn-dark btn-lg" style={{ borderColor: '#475569' }}>
              <span>Create Event</span>
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-title">
            <ShieldCheck size={18} />
            <span>Platform Snapshot</span>
          </div>
          <div className="hero-stat-grid">
            <div className="hero-stat">
              <div className="hero-stat-value">{events.length}</div>
              <div className="hero-stat-label">Total Events</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{publishedEvents.length}</div>
              <div className="hero-stat-label">Published Live</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{totalTiers}</div>
              <div className="hero-stat-label">Ticket Tiers</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{totalTicketsLeft}</div>
              <div className="hero-stat-label">Seats Available</div>
            </div>
          </div>

          <form onSubmit={handleTicketLookup} style={{ marginTop: 16 }}>
            <label
              htmlFor="home-ticket-lookup"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-inverse-muted)',
                marginBottom: 8,
              }}
            >
              Quick Ticket Pass Lookup
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="home-ticket-lookup"
                className="input"
                placeholder={`e.g. ${SAMPLE_TICKET_CODE}`}
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Search size={16} />
              </button>
            </div>
          </form>
        </div>
      </section>

      {error && <AlertBanner variant="error" title="Backend Connection Issue" message={error} />}

      <section>
        <div className="section-header">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.5rem' }}>
              Featured Events
            </h2>
            <p className="page-subtitle">
              Live and upcoming experiences synced directly from the events catalog.
            </p>
          </div>
          <Link to="/events" className="btn btn-secondary">
            <span>View All Events</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading events from API...
          </div>
        ) : featuredEvents.length === 0 ? (
          <EmptyState
            icon={<Ticket size={24} />}
            title="No events found yet"
            description="Create your first event in Organizer Studio or run the backend Prisma seed script to load sample data."
            action={
              <Link to="/organizer/events/new" className="btn btn-primary">
                Create First Event
              </Link>
            }
          />
        ) : (
          <div className="grid-3">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
