import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  MapPin,
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const heroRef = useRef<HTMLElement | null>(null);
  const eventsSectionRef = useRef<HTMLElement | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalPublished, setTotalPublished] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroImgError, setHeroImgError] = useState(false);

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
  const showHeroBanner = Boolean(spotlightEvent?.bannerUrl && !heroImgError);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
      {/* Clean Banner-Forward Ticket Buying Hero */}
      <section ref={heroRef} className="landing-hero">
        <div className="landing-hero-grid">
          <div>
            <div className="eyebrow-label hero-eyebrow">
              <span>Live Events &amp; Instant Guest Booking</span>
            </div>

            <h1 className="hero-title">
              Discover Moments <span className="text-emerald">Worth Remembering.</span>
            </h1>

            <p className="landing-hero-desc hero-description">
              Browse concerts, conferences, sports, and cultural nights. Pick your seats and check out directly in seconds—no mandatory account signup required.
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
              <Link
                to={spotlightEvent ? `/events/${spotlightEvent.id}` : '/events'}
                className="btn btn-primary btn-lg"
              >
                <Ticket size={17} />
                <span>{spotlightEvent ? 'Buy Tickets Now' : 'Explore Events'}</span>
              </Link>

              <Link
                to="/events"
                className="btn btn-secondary btn-lg"
              >
                <CalendarDays size={16} />
                <span>Upcoming Events</span>
              </Link>
            </div>
          </div>

          {/* Featured Event Banner Card */}
          <div className="hero-poster-frame hero-showcase">
            <div className="hero-poster-card">
              <div className="hero-poster-media">
                {showHeroBanner && (
                  <img
                    src={spotlightEvent!.bannerUrl!}
                    alt={spotlightEvent!.title}
                    onError={() => setHeroImgError(true)}
                  />
                )}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-primary-soft)',
                      backgroundColor: 'rgba(5, 46, 37, 0.72)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {spotlightEvent?.category || 'Featured Event'}
                  </span>
                  <span className="badge badge-success">On Sale Now</span>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-primary-soft)',
                      fontWeight: 600,
                    }}
                  >
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    alignItems: 'flex-start',
                  }}
                >
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
                    <span>Buy Tickets</span>
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

        {/* Hairline Marketplace Metrics Strip */}
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
            <div className="metrics-strip-label">Seats ready to reserve</div>
          </div>
        </div>
      </section>

      {error && <AlertBanner variant="error" title="Backend Connection Issue" message={error} />}

      {/* Upcoming Events Grid */}
      <section ref={eventsSectionRef}>
        <div className="section-header section-reveal">
          <div>
            <div className="eyebrow-label" style={{ marginBottom: 8 }}>
              <span>On Sale Now</span>
            </div>
            <h2 className="section-title">Upcoming Events</h2>
            <p className="page-subtitle">
              Real-time seat availability synced directly with venue inventory—reserve in seconds.
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
          <EventCardSkeletonGrid count={6} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Ticket size={24} />}
            title="No published events yet"
            description="Host your first event in Organizer Studio to publish tickets live."
            action={
              <Link to="/organization" className="btn btn-primary">
                Explore Organizer Platform
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

      {/* Clean Invitation Banner to Dedicated Business Landing Page */}
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
            For Businesses &amp; Event Creators
          </div>
          <h2 className="section-title" style={{ color: 'var(--color-white)' }}>
            Hosting Concerts, Summits, or Live Shows?
          </h2>
          <p>
            Explore our dedicated organizer platform to see how atomic reservations, QR pass issuance, and venue gate scanners power sold-out events.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/organization"
            className="btn btn-lg"
            style={{
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-forest-dark)',
              borderColor: 'var(--color-white)',
            }}
          >
            <Building2 size={17} />
            <span>Explore Business Platform</span>
            <ArrowRight size={16} />
          </Link>
          {canOrganize && (
            <Link
              to="/organizer/events/new"
              className="btn btn-lg"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: 'var(--color-white)',
                borderColor: 'rgba(255,255,255,0.28)',
              }}
            >
              <span>Create Event</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
