import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Edit3,
  Layers,
  MapPin,
  ShoppingBag,
  Ticket,
  User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { ApiError } from '../services/api';
import { eventsService } from '../services/events.service';
import { ordersService } from '../services/orders.service';
import { ticketsService } from '../services/tickets.service';
import type { EventItem, TicketType } from '../types/api';
import {
  formatCurrency,
  formatDateRange,
  formatDateTime,
  formatPersonName,
} from '../utils/format';
import { saveGuestOrderToken } from '../utils/guestOrders';
import { AlertBanner } from '../components/AlertBanner';
import { EventCard } from '../components/EventCard';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/common/Skeleton';
import { QuantitySelector } from '../components/tickets/QuantitySelector';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<EventItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const [evData, tiersData, relatedPage] = await Promise.all([
          eventsService.getById(id),
          ticketsService.getTypesByEvent(id),
          eventsService.list({ page: 1, limit: 4, status: 'PUBLISHED' }),
        ]);
        if (active) {
          setEvent(evData);
          setTicketTypes(tiersData);
          setRelatedEvents(
            relatedPage.items.filter((item) => item.id !== evData.id).slice(0, 3),
          );
          setQuantities({});
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

  const selectedItems = useMemo(() => {
    return ticketTypes
      .map((tier) => ({
        tier,
        quantity: quantities[tier.id] ?? 0,
      }))
      .filter((entry) => entry.quantity > 0);
  }, [ticketTypes, quantities]);

  const totalSelectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalCents = selectedItems.reduce(
    (sum, i) => sum + Math.round(Number(i.tier.price) * 100) * i.quantity,
    0,
  );

  const canManageEvent =
    user?.role === 'ADMIN' ||
    (user?.role === 'ORGANIZER' && event?.organizerId === user.id);

  const isEventOpenForSale =
    event?.status === 'PUBLISHED' && new Date(event.endDate) > new Date();

  async function handleCheckout() {
    setOrderError(null);
    if (selectedItems.length === 0) return;

    if (user?.role === 'SCANNER') {
      setOrderError('Scanner accounts cannot purchase tickets.');
      return;
    }

    if (!isAuthenticated) {
      const cleanName = guestName.trim();
      const cleanEmail = guestEmail.trim().toLowerCase();
      if (cleanName.length < 2) {
        setOrderError('Please enter your full name for ticket delivery.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setOrderError('Please enter a valid email address to receive your QR tickets.');
        return;
      }
    }

    try {
      setCreatingOrder(true);
      const order = await ordersService.create({
        items: selectedItems.map((i) => ({
          ticketTypeId: i.tier.id,
          quantity: i.quantity,
        })),
        ...(!isAuthenticated
          ? {
              guestName: guestName.trim(),
              guestEmail: guestEmail.trim().toLowerCase(),
              guestPhone: guestPhone.trim() || undefined,
            }
          : {}),
      });

      if (order.guestToken) {
        saveGuestOrderToken(order.id, order.guestToken);
      }

      showToast('Seats reserved for 15 minutes. Complete checkout below.', {
        variant: 'success',
      });
      navigate(
        order.guestToken
          ? `/checkout/${order.id}?token=${encodeURIComponent(order.guestToken)}`
          : `/checkout/${order.id}`,
      );
    } catch (err) {
      setOrderError(
        err instanceof ApiError ? err.message : 'Could not reserve tickets.',
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  if (loading) {
    return (
      <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={300} />
        <Skeleton height={34} width="55%" />
        <Skeleton height={20} width="40%" />
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
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Discover</Link>
        <ChevronRight size={14} />
        <Link to="/events">Events</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {event.title}
        </span>
      </nav>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <Link to="/events" className="btn btn-secondary btn-sm">
          <ArrowLeft size={15} />
          <span>All Events</span>
        </Link>

        {canManageEvent && (
          <Link to={`/organizer/events/${event.id}/edit`} className="btn btn-primary btn-sm">
            <Edit3 size={15} />
            <span>Edit Event &amp; Tiers</span>
          </Link>
        )}
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
            <Ticket size={46} />
            <span>{event.category || 'Universal E-Ticket Experience'}</span>
          </div>
        )}
      </div>

      <div className="detail-grid">
        <div className="card card-padded">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <span className="badge badge-info">{event.category || 'General'}</span>
            <StatusBadge status={event.status} />
          </div>

          <h1 className="page-title" style={{ marginBottom: 18 }}>
            {event.title}
          </h1>

          <div className="event-meta" style={{ fontSize: '0.95rem', gap: 10, marginBottom: 24 }}>
            <div className="event-meta-row">
              <Calendar size={17} color="var(--color-primary)" />
              <span>{formatDateRange(event.startDate, event.endDate)} (ICT)</span>
            </div>
            <div className="event-meta-row">
              <MapPin size={17} color="var(--color-primary)" />
              <span>
                {event.venue}
                {event.location ? ` · ${event.location}` : ''}
              </span>
            </div>
            <div className="event-meta-row">
              <User size={17} color="var(--color-primary)" />
              <span>
                Organized by <strong>{formatPersonName(event.organizer)}</strong>
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 22 }}>
            <h2 className="card-title" style={{ marginBottom: 10 }}>
              About This Event
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-line' }}>
              {event.description || 'No description has been added for this event yet.'}
            </p>
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--color-border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              fontSize: '0.86rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div>
              <div className="meta-caption">Starts</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {formatDateTime(event.startDate)}
              </div>
            </div>
            <div>
              <div className="meta-caption">Ends</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {formatDateTime(event.endDate)}
              </div>
            </div>
          </div>
        </div>

        <aside className="card card-padded" style={{ position: 'sticky', top: 94 }}>
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
              <Layers size={18} color="var(--color-primary)" />
              <h2 className="card-title">Select Tickets</h2>
            </div>
            <span className="badge">{ticketTypes.length} tiers</span>
          </div>

          {!isEventOpenForSale && (
            <AlertBanner
              variant="warning"
              message={`Ticket sales are closed (Event status: ${event.status}).`}
            />
          )}

          {orderError && <AlertBanner variant="error" message={orderError} />}

          {ticketTypes.length === 0 ? (
            <div className="tier-card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No ticket tiers have been configured for this event yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ticketTypes.map((tier) => {
                const maxSelectable = Math.min(20, tier.remainingQuantity);
                const qty = quantities[tier.id] ?? 0;
                const isSelected = qty > 0;
                const pct =
                  tier.totalQuantity > 0
                    ? Math.round((tier.remainingQuantity / tier.totalQuantity) * 100)
                    : 0;

                return (
                  <div
                    key={tier.id}
                    className={`tier-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {isSelected && <Check size={15} color="var(--color-primary)" />}
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{tier.name}</h3>
                      </div>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '1.08rem',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {formatCurrency(tier.price)}
                      </span>
                    </div>

                    {tier.description && (
                      <p
                        style={{
                          fontSize: '0.84rem',
                          color: 'var(--color-text-secondary)',
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
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 10,
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {tier.remainingQuantity > 0
                          ? `${tier.remainingQuantity} available`
                          : 'Sold Out'}
                      </span>

                      <QuantitySelector
                        value={qty}
                        max={maxSelectable}
                        disabled={!isEventOpenForSale || tier.remainingQuantity <= 0}
                        label={tier.name}
                        onChange={(nextQty) =>
                          setQuantities((prev) => ({ ...prev, [tier.id]: nextQty }))
                        }
                      />
                    </div>

                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ticketTypes.length > 0 && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {selectedItems.map((entry) => (
                <div
                  key={entry.tier.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.86rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span>
                    {entry.tier.name} × {entry.quantity}
                  </span>
                  <strong>
                    {formatCurrency(
                      (Math.round(Number(entry.tier.price) * 100) * entry.quantity) / 100,
                    )}
                  </strong>
                </div>
              ))}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.08rem',
                  paddingTop: selectedItems.length > 0 ? 8 : 0,
                  borderTop: selectedItems.length > 0 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  Total ({totalSelectedCount} ticket{totalSelectedCount === 1 ? '' : 's'})
                </span>
                <strong style={{ color: 'var(--color-primary)' }}>
                  {formatCurrency(subtotalCents / 100)}
                </strong>
              </div>

              {!isAuthenticated && totalSelectedCount > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-ivory)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-forest-dark)' }}>
                      Guest Ticket Details
                    </strong>
                    <Link
                      to="/login"
                      state={{ from: location }}
                      style={{ fontSize: '0.76rem', color: 'var(--color-primary)', fontWeight: 600 }}
                    >
                      Or sign in
                    </Link>
                  </div>

                  <div className="input-group">
                    <label htmlFor="guest-name" className="input-label">
                      Full Name *
                    </label>
                    <input
                      id="guest-name"
                      type="text"
                      className="input"
                      placeholder="e.g. Dara Sok"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="guest-email" className="input-label">
                      Email Address (for QR pass) *
                    </label>
                    <input
                      id="guest-email"
                      type="email"
                      className="input"
                      placeholder="you@gmail.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="guest-phone" className="input-label">
                      Phone Number (optional)
                    </label>
                    <input
                      id="guest-phone"
                      type="tel"
                      className="input"
                      placeholder="+855 12 345 678"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ marginTop: 6 }}
                disabled={!isEventOpenForSale || totalSelectedCount === 0 || creatingOrder}
                onClick={handleCheckout}
              >
                <ShoppingBag size={17} />
                <span>
                  {creatingOrder
                    ? 'Reserving Seats...'
                    : !isAuthenticated
                      ? 'Buy Tickets Without Login'
                      : 'Continue to Checkout'}
                </span>
              </button>
            </div>
          )}
        </aside>
      </div>

      {relatedEvents.length > 0 && (
        <section style={{ marginTop: 52 }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">More Upcoming Experiences</h2>
              <p className="page-subtitle">Explore other live events currently open for booking.</p>
            </div>
          </div>
          <div className="grid-3">
            {relatedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
