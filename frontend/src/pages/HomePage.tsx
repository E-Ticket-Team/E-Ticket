import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { eventsService } from '../services/events.service';
import type { EventItem } from '../types/api';
import { getEventCapacitySummary } from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { EventCardSkeletonGrid } from '../components/common/Skeleton';

export function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalPublished, setTotalPublished] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [evPage, cats] = await Promise.all([
          eventsService.list({ page: 1, limit: 6, status: 'PUBLISHED', sortBy: 'startDate', sortOrder: 'asc' }),
          eventsService.getCategories(),
        ]);
        if (active) {
          setEvents(evPage.items);
          setTotalPublished(evPage.meta.total);
          setCategories(cats);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to reach the backend API.',
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

  const totalTicketsLeft = events.reduce(
    (sum, ev) => sum + getEventCapacitySummary(ev).remaining,
    0,
  );
  const totalTiers = events.reduce((sum, ev) => sum + (ev.ticketTypes?.length ?? 0), 0);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/events?search=${encodeURIComponent(q)}` : '/events');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <section className="hero" style={{ marginBottom: 0 }}>
        <div>
          <div className="hero-eyebrow">
            <Sparkles size={14} />
            <span>Universal E-Ticketing Platform</span>
          </div>
          <h1>Discover live events, book verified passes &amp; enter seamlessly.</h1>
          <p>
            Browse concerts, tech expos, workshops, and live shows. Reserve seats atomically,
            receive cryptographic QR passes, and check in securely at the venue gate.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20, maxWidth: 520 }}>
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="input"
                placeholder="Search by event name, venue, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search published events"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>

          <div className="hero-actions">
            <Link to="/events" className="btn btn-primary btn-lg">
              <CalendarDays size={18} />
              <span>Browse All Events</span>
            </Link>
            {isAuthenticated && (user?.role === 'ORGANIZER' || user?.role === 'ADMIN') ? (
              <Link to="/organizer" className="btn btn-dark btn-lg" style={{ borderColor: '#475569' }}>
                <span>Open Organizer Studio</span>
              </Link>
            ) : !isAuthenticated ? (
              <Link to="/register/organization" className="btn btn-dark btn-lg" style={{ borderColor: '#475569' }}>
                <span>Host an Event</span>
              </Link>
            ) : (
              <Link to="/my-tickets" className="btn btn-dark btn-lg" style={{ borderColor: '#475569' }}>
                <span>My Ticket Wallet</span>
              </Link>
            )}
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-title">
            <ShieldCheck size={18} />
            <span>Live Platform Snapshot</span>
          </div>
          <div className="hero-stat-grid">
            <div className="hero-stat">
              <div className="hero-stat-value">{totalPublished}</div>
              <div className="hero-stat-label">Published Events</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{categories.length}</div>
              <div className="hero-stat-label">Categories</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{totalTiers}</div>
              <div className="hero-stat-label">Featured Tiers</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{totalTicketsLeft}</div>
              <div className="hero-stat-label">Seats Available</div>
            </div>
          </div>
        </div>
      </section>

      {error && <AlertBanner variant="error" title="Backend Connection Issue" message={error} />}

      {categories.length > 0 && (
        <section>
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div>
              <h2 className="page-title" style={{ fontSize: '1.35rem' }}>
                Explore by Category
              </h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {categories.map((category) => (
              <Link
                key={category}
                to={`/events?category=${encodeURIComponent(category)}`}
                className="btn btn-secondary btn-sm"
              >
                <Tag size={14} />
                <span>{category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-header">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.5rem' }}>
              Featured &amp; Upcoming Events
            </h2>
            <p className="page-subtitle">
              Live experiences ready for instant reservation and QR pass issuance.
            </p>
          </div>
          <Link to="/events" className="btn btn-secondary">
            <span>View Full Directory</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <EventCardSkeletonGrid count={3} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Ticket size={24} />}
            title="No published events yet"
            description="Sign in as an organizer to publish your first event and configure ticket tiers."
            action={
              <Link to="/register/organization" className="btn btn-primary">
                Register as Organizer
              </Link>
            }
          />
        ) : (
          <div className="grid-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="page-title" style={{ fontSize: '1.45rem' }}>
              How Ticket Purchasing Works
            </h2>
            <p className="page-subtitle">
              End-to-end atomic reservations and tamper-resistant gate verification.
            </p>
          </div>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>
              Browse Events
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Filter upcoming concerts, conferences, and shows by date, category, and venue.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>
              Reserve Inventory
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Select VIP or General tiers—seats are atomically locked for 15 minutes at checkout.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>
              Verify Payment
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Confirm payment safely on the backend and receive unique HMAC-signed QR passes.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>
              Fast Gate Check-In
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Authorized staff scan your digital ticket once, preventing duplicate entry.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
