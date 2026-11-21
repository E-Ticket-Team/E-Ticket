import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  QrCode,
  Search,
  Ticket,
} from 'lucide-react';
import { useGSAP } from '../animations/gsap';
import { runHeroEntrance } from '../animations/page-animations';
import {
  runSectionHeadingReveal,
  runStaggerScrollReveal,
} from '../animations/scroll-reveals';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { eventsService } from '../services/events.service';
import type { EventItem } from '../types/api';
import {
  formatCurrency,
  formatDateRange,
  getEventCapacitySummary,
  getLowestPrice,
} from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { EventCardSkeletonGrid } from '../components/common/Skeleton';

export function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const heroRef = useRef<HTMLElement | null>(null);
  const eventsSectionRef = useRef<HTMLElement | null>(null);
  const editorialSectionRef = useRef<HTMLElement | null>(null);

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
          eventsService.list({
            page: 1,
            limit: 6,
            status: 'PUBLISHED',
            sortBy: 'startDate',
            sortOrder: 'asc',
          }),
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

  useGSAP(
    () => {
      runHeroEntrance(heroRef.current);
    },
    { scope: heroRef },
  );

  useGSAP(
    () => {
      if (!loading && events.length > 0) {
        runSectionHeadingReveal('.section-reveal', eventsSectionRef.current);
        runStaggerScrollReveal('.event-card', eventsSectionRef.current);
      }
    },
    { dependencies: [loading, events.length], scope: eventsSectionRef },
  );

  useGSAP(
    () => {
      runSectionHeadingReveal('.editorial-list-item', editorialSectionRef.current);
    },
    { scope: editorialSectionRef },
  );

  const spotlightEvent = events[0] ?? null;
  const spotlightPrice = spotlightEvent
    ? getLowestPrice(spotlightEvent.ticketTypes)
    : null;
  const spotlightCap = spotlightEvent
    ? getEventCapacitySummary(spotlightEvent)
    : { total: 0, remaining: 0, sold: 0 };

  const totalTicketsLeft = events.reduce(
    (sum, ev) => sum + getEventCapacitySummary(ev).remaining,
    0,
  );
  const totalTiers = events.reduce(
    (sum, ev) => sum + (ev.ticketTypes?.length ?? 0),
    0,
  );

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/events?search=${encodeURIComponent(q)}` : '/events');
  }

  const canOrganize = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      {/* Editorial Ivory Hero */}
      <section ref={heroRef} className="landing-hero">
        <div className="landing-hero-grid">
          <div>
            <div className="eyebrow-label hero-eyebrow">
              <span>Live Events &amp; Verified Passes</span>
            </div>

            <h1 className="hero-title">
              Discover Moments <span className="text-emerald">Worth Remembering.</span>
            </h1>

            <p className="landing-hero-desc hero-description">
              Find concerts, conferences, and cultural gatherings across the city. Reserve your seats directly and walk through the gate with one verified pass.
            </p>

            <form onSubmit={handleSearch} className="landing-search-bar hero-search">
              <div className="search-input-wrap" style={{ flex: 1 }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="input"
                  placeholder="Search events, venues, or cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search published events"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Find Tickets
              </button>
            </form>

            <div className="landing-hero-actions hero-actions">
              <Link to="/events" className="btn btn-primary btn-lg">
                <CalendarDays size={17} />
                <span>Explore Events</span>
              </Link>

              <Link
                to={
                  canOrganize
                    ? '/organizer/events/new'
                    : !isAuthenticated
                      ? '/register/organization'
                      : '/my-tickets'
                }
                className="btn btn-ghost btn-lg"
                style={{ color: 'var(--color-forest-dark)' }}
              >
                <span>
                  {canOrganize
                    ? 'Create an Event'
                    : !isAuthenticated
                      ? 'Create an Event'
                      : 'Open My Tickets'}
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Tactile Physical-Inspired Featured Event Ticket Showcase */}
          <div className="hero-poster-frame hero-showcase">
            <div className="hero-poster-card">
              <div className="hero-poster-media">
                {spotlightEvent?.bannerUrl && (
                  <img
                    src={spotlightEvent.bannerUrl}
                    alt={spotlightEvent.title}
                  />
                )}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-primary-soft)',
                    }}
                  >
                    {spotlightEvent?.category || 'Featured Event'}
                  </span>
                  <span className="badge badge-success">On Sale</span>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-inverse-muted)' }}>
                    {spotlightEvent
                      ? formatDateRange(spotlightEvent.startDate, spotlightEvent.endDate)
                      : 'Upcoming Live Series'}
                  </div>
                  <h2
                    style={{
                      color: 'var(--color-white)',
                      fontSize: '1.42rem',
                      fontWeight: 800,
                      marginTop: 4,
                    }}
                  >
                    {spotlightEvent ? spotlightEvent.title : 'Curated Experiences'}
                  </h2>
                </div>
              </div>

              <div className="hero-poster-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div>
                    <div className="meta-caption">Venue</div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        fontSize: '0.92rem',
                        marginTop: 4,
                      }}
                    >
                      <MapPin size={14} color="var(--color-primary)" />
                      <span>
                        {spotlightEvent
                          ? `${spotlightEvent.venue}${spotlightEvent.location ? ` · ${spotlightEvent.location}` : ''}`
                          : 'Phnom Penh'}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="meta-caption">Starting From</div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--color-primary)',
                        marginTop: 2,
                      }}
                    >
                      {spotlightPrice !== null ? formatCurrency(spotlightPrice) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-poster-stub">
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  <strong className="tabular-nums" style={{ color: 'var(--color-forest-dark)' }}>
                    {spotlightCap.remaining}
                  </strong>{' '}
                  of {spotlightCap.total} passes remaining
                </div>

                {spotlightEvent ? (
                  <Link
                    to={`/events/${spotlightEvent.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    <span>Reserve Pass</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <Link to="/events" className="btn btn-primary btn-sm">
                    Browse All
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Editorial Metrics Strip */}
        <div className="metrics-strip">
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">{totalPublished}</div>
            <div className="metrics-strip-label">Published live events</div>
          </div>
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">{categories.length}</div>
            <div className="metrics-strip-label">Curated event categories</div>
          </div>
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">{totalTiers}</div>
            <div className="metrics-strip-label">Active ticket pricing tiers</div>
          </div>
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">{totalTicketsLeft}</div>
            <div className="metrics-strip-label">Seats open for booking</div>
          </div>
        </div>
      </section>

      {error && <AlertBanner variant="error" title="Backend Connection Issue" message={error} />}

      {/* Featured Events & Category Strip */}
      <section ref={eventsSectionRef}>
        <div className="section-header section-reveal">
          <div>
            <div className="eyebrow-label" style={{ marginBottom: 8 }}>
              <span>On Sale Now</span>
            </div>
            <h2 className="section-title">Upcoming Events</h2>
            <p className="page-subtitle">
              Real-time seat availability synced directly with venue inventory.
            </p>
          </div>
          <Link to="/events" className="btn btn-secondary">
            <span>View All Events</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <Link
              to="/events"
              className="btn btn-primary btn-sm"
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              All Events
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                to={`/events?category=${encodeURIComponent(category)}`}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                {category}
              </Link>
            ))}
          </div>
        )}

        {loading ? (
          <EventCardSkeletonGrid count={3} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Ticket size={24} />}
            title="No published events yet"
            description="Sign in as an organizer to publish your first event and configure ticket tiers."
            action={
              <Link to="/register/organization" className="btn btn-primary">
                Host an Event
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

      {/* Split Editorial: How Ticketing Works */}
      <section ref={editorialSectionRef} className="feature-split">
        <div>
          <div className="eyebrow-label" style={{ marginBottom: 10 }}>
            <span>How It Works</span>
          </div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Built for real venues, not spreadsheets.
          </h2>
          <p className="page-subtitle" style={{ marginBottom: 24 }}>
            Every reservation locks inventory cleanly, issues verified passes upon payment settlement, and validates entry once at the door.
          </p>

          <div className="editorial-list">
            <div className="editorial-list-item">
              <div className="editorial-index">01</div>
              <div>
                <h3 className="card-title">Atomic Seat Reservation</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Selected tiers are held exclusively for 15 minutes during checkout so popular shows never oversell.
                </p>
              </div>
            </div>

            <div className="editorial-list-item">
              <div className="editorial-index">02</div>
              <div>
                <h3 className="card-title">Instant Boarding-Pass Wallet</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Confirmed orders issue unique QR credentials directly into My Tickets, ready for offline download or print.
                </p>
              </div>
            </div>

            <div className="editorial-list-item">
              <div className="editorial-index">03</div>
              <div>
                <h3 className="card-title">Single-Entry Gate Check-In</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Authorized venue staff scan passes via camera or USB reader with immediate duplicate-scan blocking.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Tactile Digital Pass Preview */}
        <div
          className="card"
          style={{
            padding: 28,
            backgroundColor: 'var(--color-ivory)',
            borderColor: 'var(--color-border-strong)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-white)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ padding: '22px 24px', borderBottom: '2px dashed var(--color-border-strong)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="badge badge-info">VIP ALL-ACCESS</span>
                <span className="badge badge-success">VALID</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {spotlightEvent?.title || 'Cambodia Tech Expo & Music Festival'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 6 }}>
                {spotlightEvent?.venue || 'Diamond Island Exhibition Center'}
              </p>
            </div>

            <div
              style={{
                padding: '20px 24px',
                backgroundColor: 'var(--color-ivory)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <div className="meta-caption">Pass Code</div>
                <div className="code-chip" style={{ marginTop: 4 }}>
                  ETK1 · VERIFIED
                </div>
              </div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-forest-dark)',
                }}
                aria-hidden="true"
              >
                <QrCode size={32} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Forest Green Organizer Invitation */}
      <section className="promo-forest">
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-primary-soft)',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              marginBottom: 8,
            }}
          >
            For Organizers &amp; Venues
          </div>
          <h2 className="section-title" style={{ color: 'var(--color-white)' }}>
            Publish Events and Track Gate Entry Live.
          </h2>
          <p>
            Launch event listings, configure ticket tiers, monitor real-time sales, and assign gate scanning staff from one quiet, fast workspace.
          </p>
        </div>

        <Link
          to={canOrganize ? '/organizer' : '/register/organization'}
          className="btn btn-lg"
          style={{
            backgroundColor: 'var(--color-white)',
            color: 'var(--color-forest-dark)',
            borderColor: 'var(--color-white)',
          }}
        >
          <span>{canOrganize ? 'Open Organizer Studio' : 'Start Hosting Events'}</span>
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
