import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
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
import { AlertBanner } from '../components/AlertBanner';
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
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const [evData, tiersData] = await Promise.all([
          eventsService.getById(id),
          ticketsService.getTypesByEvent(id),
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

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (user?.role === 'SCANNER') {
      setOrderError('Scanner accounts cannot purchase tickets.');
      return;
    }

    try {
      setCreatingOrder(true);
      const order = await ordersService.create({
        items: selectedItems.map((i) => ({
          ticketTypeId: i.tier.id,
          quantity: i.quantity,
        })),
      });
      showToast('Tickets reserved for 15 minutes. Complete checkout below.', {
        variant: 'success',
      });
      navigate(`/checkout/${order.id}`);
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
        <Skeleton height={280} />
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

        {canManageEvent && (
          <Link to={`/organizer/events/${event.id}/edit`} className="btn btn-primary">
            <Edit3 size={16} />
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

          <div className="event-meta" style={{ fontSize: '0.94rem', gap: 10, marginBottom: 22 }}>
            <div className="event-meta-row">
              <Calendar size={17} />
              <span>{formatDateRange(event.startDate, event.endDate)} (ICT)</span>
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
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              <strong>Starts:</strong> {formatDateTime(event.startDate)}
            </div>
            <div>
              <strong>Ends:</strong> {formatDateTime(event.endDate)}
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
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Select Tickets</h2>
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No ticket tiers have been configured for this event yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ticketTypes.map((tier) => {
                const maxSelectable = Math.min(20, tier.remainingQuantity);
                const qty = quantities[tier.id] ?? 0;
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
                          fontSize: '0.84rem',
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
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 10,
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selected Tickets</span>
                <strong>{totalSelectedCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <span style={{ fontWeight: 700 }}>Order Total</span>
                <strong style={{ color: 'var(--brand-primary)' }}>
                  {formatCurrency(subtotalCents / 100)}
                </strong>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                disabled={!isEventOpenForSale || totalSelectedCount === 0 || creatingOrder}
                onClick={handleCheckout}
              >
                <ShoppingBag size={17} />
                <span>
                  {creatingOrder
                    ? 'Reserving Seats...'
                    : !isAuthenticated
                      ? 'Sign In to Purchase'
                      : 'Reserve & Checkout'}
                </span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
