import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, Plus, Save } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { EventStatus, TicketType } from '../types/api';
import {
  DEFAULT_ORGANIZER_ID,
  formatCurrency,
  toDatetimeLocalValue,
} from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';

export function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Event form fields matching CreateEventDto / UpdateEventDto
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<EventStatus>('PUBLISHED');
  const [organizerId, setOrganizerId] = useState(DEFAULT_ORGANIZER_ID);

  // Ticket tiers (available when editing an event)
  const [tiers, setTiers] = useState<TicketType[]>([]);
  const [tierName, setTierName] = useState('');
  const [tierDesc, setTierDesc] = useState('');
  const [tierPrice, setTierPrice] = useState('25');
  const [tierQty, setTierQty] = useState('100');
  const [savingTier, setSavingTier] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);
  const [tierSuccess, setTierSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const eventId = id;
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [ev, eventTiers] = await Promise.all([
          api.getEvent(eventId),
          api.getTicketTypesByEvent(eventId),
        ]);
        if (!active) return;
        setTitle(ev.title);
        setDescription(ev.description ?? '');
        setCategory(ev.category ?? '');
        setVenue(ev.venue);
        setLocation(ev.location ?? '');
        setBannerUrl(ev.bannerUrl ?? '');
        setStartDate(toDatetimeLocalValue(ev.startDate));
        setEndDate(toDatetimeLocalValue(ev.endDate));
        setStatus(ev.status);
        setOrganizerId(ev.organizerId || DEFAULT_ORGANIZER_ID);
        setTiers(eventTiers);
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load event.');
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

  async function handleEventSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Please provide valid start and end dates.');
      return;
    }
    if (end <= start) {
      setError('End date must be after the start date.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      venue: venue.trim(),
      location: location.trim() || undefined,
      bannerUrl: bannerUrl.trim() || undefined,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status,
      organizerId: organizerId.trim(),
    };

    try {
      setSaving(true);
      if (isEdit && id) {
        await api.updateEvent(id, payload);
        setSuccessMsg('Event details updated successfully.');
      } else {
        const created = await api.createEvent(payload);
        navigate(`/organizer/events/${created.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to save event. Check your organizer ID and required fields.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTier(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setTierError(null);
    setTierSuccess(null);

    const priceNum = Number(tierPrice);
    const qtyNum = Number(tierQty);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setTierError('Price must be a positive number.');
      return;
    }
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      setTierError('Total quantity must be a whole number of at least 1.');
      return;
    }

    try {
      setSavingTier(true);
      const created = await api.createTicketType({
        eventId: id,
        name: tierName.trim(),
        description: tierDesc.trim() || undefined,
        price: priceNum,
        totalQuantity: qtyNum,
      });
      setTiers((prev) => [...prev, created]);
      setTierName('');
      setTierDesc('');
      setTierPrice('25');
      setTierQty('100');
      setTierSuccess(`Added ticket tier "${created.name}".`);
    } catch (err) {
      setTierError(err instanceof ApiError ? err.message : 'Unable to create ticket tier.');
    } finally {
      setSavingTier(false);
    }
  }

  if (loading) {
    return (
      <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading event editor...
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <Link to="/organizer" className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }}>
            <ArrowLeft size={15} />
            <span>Back to Organizer Studio</span>
          </Link>
          <h1 className="page-title">{isEdit ? 'Edit Event & Ticket Tiers' : 'Create New Event'}</h1>
          <p className="page-subtitle">
            {isEdit
              ? 'Update event details or configure ticket pricing tiers.'
              : 'Create an event first, then add VIP, Early Bird, or General Admission ticket tiers.'}
          </p>
        </div>

        {isEdit && id && (
          <Link to={`/events/${id}`} className="btn btn-secondary">
            View Public Event Page
          </Link>
        )}
      </div>

      {error && <AlertBanner variant="error" title="Could not save event" message={error} />}
      {successMsg && <AlertBanner variant="success" message={successMsg} />}

      <div className={isEdit ? 'detail-grid' : ''}>
        <form onSubmit={handleEventSubmit} className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Event Information</h2>

          <div className="input-group">
            <label htmlFor="event-title" className="input-label">
              Event Title *
            </label>
            <input
              id="event-title"
              className="input"
              placeholder="e.g. Phnom Penh Music Festival 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="event-category" className="input-label">
                Category
              </label>
              <input
                id="event-category"
                className="input"
                placeholder="e.g. Music, Conference, Sports"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="event-status" className="input-label">
                Event Status
              </label>
              <select
                id="event-status"
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="event-venue" className="input-label">
                Venue *
              </label>
              <input
                id="event-venue"
                className="input"
                placeholder="e.g. Koh Pich Theater"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="event-location" className="input-label">
                City / Location
              </label>
              <input
                id="event-location"
                className="input"
                placeholder="e.g. Phnom Penh, Cambodia"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="event-start" className="input-label">
                Start Date &amp; Time *
              </label>
              <input
                id="event-start"
                type="datetime-local"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="event-end" className="input-label">
                End Date &amp; Time *
              </label>
              <input
                id="event-end"
                type="datetime-local"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="event-banner" className="input-label">
              Banner Image URL
            </label>
            <input
              id="event-banner"
              type="url"
              className="input"
              placeholder="https://example.com/images/banner.jpg"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="event-description" className="input-label">
              Description
            </label>
            <textarea
              id="event-description"
              className="textarea"
              placeholder="Describe the event schedule, speakers, artists, or venue notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="event-organizer" className="input-label">
              Organizer User ID *
            </label>
            <input
              id="event-organizer"
              className="input"
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Defaults to the seeded organizer ID ({DEFAULT_ORGANIZER_ID}).
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
            <Link to="/organizer" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event & Continue'}</span>
            </button>
          </div>
        </form>

        {isEdit && id && (
          <aside className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="var(--brand-primary)" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Ticket Tiers</h2>
              </div>
              <span className="badge">{tiers.length}</span>
            </div>

            {tiers.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tiers.map((t) => (
                  <div key={t.id} className="tier-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: '0.96rem' }}>{t.name}</strong>
                      <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                        {formatCurrency(t.price)}
                      </span>
                    </div>
                    {t.description && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {t.description}
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      {t.remainingQuantity} / {t.totalQuantity} remaining
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleCreateTier}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700 }}>Add New Ticket Tier</h3>

              {tierError && <AlertBanner variant="error" message={tierError} />}
              {tierSuccess && <AlertBanner variant="success" message={tierSuccess} />}

              <div className="input-group">
                <label htmlFor="tier-name" className="input-label">
                  Tier Name *
                </label>
                <input
                  id="tier-name"
                  className="input"
                  placeholder="e.g. Early Bird, VIP Pass"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="input-group">
                  <label htmlFor="tier-price" className="input-label">
                    Price (USD) *
                  </label>
                  <input
                    id="tier-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="input"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="tier-qty" className="input-label">
                    Quantity *
                  </label>
                  <input
                    id="tier-qty"
                    type="number"
                    min="1"
                    step="1"
                    className="input"
                    value={tierQty}
                    onChange={(e) => setTierQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="tier-desc" className="input-label">
                  Perks / Description
                </label>
                <input
                  id="tier-desc"
                  className="input"
                  placeholder="e.g. Priority entry and lounge access"
                  value={tierDesc}
                  onChange={(e) => setTierDesc(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingTier}>
                <Plus size={16} />
                <span>{savingTier ? 'Adding...' : 'Add Ticket Tier'}</span>
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
