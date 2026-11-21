import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Plus,
  QrCode,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { eventsService } from '../../services/events.service';
import { organizerService } from '../../services/organizer.service';
import { ticketsService } from '../../services/tickets.service';
import type {
  EventScannerAssignment,
  EventStatus,
  TicketType,
} from '../../types/api';
import { formatCurrency, toDatetimeLocalValue } from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { OrganizerSidebar } from '../../components/dashboard/OrganizerSidebar';

export function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<EventStatus>('DRAFT');

  // Ticket tiers
  const [tiers, setTiers] = useState<TicketType[]>([]);
  const [tierName, setTierName] = useState('');
  const [tierDesc, setTierDesc] = useState('');
  const [tierPrice, setTierPrice] = useState('25');
  const [tierQty, setTierQty] = useState('100');
  const [savingTier, setSavingTier] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  // Editing an existing tier
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editTierPrice, setEditTierPrice] = useState('');
  const [editTierQty, setEditTierQty] = useState('');
  const [editTierName, setEditTierName] = useState('');

  // Scanners
  const [scanners, setScanners] = useState<EventScannerAssignment[]>([]);
  const [scannerEmail, setScannerEmail] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [assigningScanner, setAssigningScanner] = useState(false);

  useEffect(() => {
    if (!id) return;
    const eventId = id;
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [ev, eventTiers, eventScanners] = await Promise.all([
          eventsService.getById(eventId),
          ticketsService.getTypesByEvent(eventId),
          organizerService.getEventScanners(eventId),
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
        setTiers(eventTiers);
        setScanners(eventScanners);
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
    };

    try {
      setSaving(true);
      if (isEdit && id) {
        await eventsService.update(id, payload);
        showToast('Event details saved.', { variant: 'success' });
      } else {
        const created = await eventsService.create(payload);
        showToast('Event created! Now configure ticket tiers and scanners.', {
          variant: 'success',
        });
        navigate(`/organizer/events/${created.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTier(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setTierError(null);

    const priceNum = Number(tierPrice);
    const qtyNum = Number(tierQty);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setTierError('Price must be 0 or greater.');
      return;
    }
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      setTierError('Quantity must be a whole number of at least 1.');
      return;
    }

    try {
      setSavingTier(true);
      const created = await ticketsService.createType({
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
      showToast(`Added ticket tier "${created.name}".`, { variant: 'success' });
    } catch (err) {
      setTierError(err instanceof ApiError ? err.message : 'Unable to add ticket tier.');
    } finally {
      setSavingTier(false);
    }
  }

  async function handleSaveTierEdit(tierId: string) {
    setTierError(null);
    const priceNum = Number(editTierPrice);
    const qtyNum = Number(editTierQty);
    if (!Number.isFinite(priceNum) || priceNum < 0 || !Number.isInteger(qtyNum) || qtyNum < 1) {
      setTierError('Invalid price or quantity.');
      return;
    }

    try {
      const updated = await ticketsService.updateType(tierId, {
        name: editTierName.trim(),
        price: priceNum,
        totalQuantity: qtyNum,
      });
      setTiers((prev) => prev.map((t) => (t.id === tierId ? updated : t)));
      setEditingTierId(null);
      showToast(`Updated tier "${updated.name}".`, { variant: 'success' });
    } catch (err) {
      setTierError(err instanceof ApiError ? err.message : 'Unable to update tier.');
    }
  }

  async function handleDeleteTier(tierId: string) {
    setTierError(null);
    try {
      await ticketsService.deleteType(tierId);
      setTiers((prev) => prev.filter((t) => t.id !== tierId));
      showToast('Ticket tier deleted.', { variant: 'info' });
    } catch (err) {
      setTierError(err instanceof ApiError ? err.message : 'Unable to delete tier.');
    }
  }

  async function handleAssignScanner(e: FormEvent) {
    e.preventDefault();
    if (!id || !scannerEmail.trim()) return;
    setScannerError(null);
    setAssigningScanner(true);

    try {
      const assignment = await organizerService.assignScanner(
        id,
        scannerEmail.trim(),
      );
      setScanners((prev) => [assignment, ...prev]);
      setScannerEmail('');
      showToast(`Assigned scanner ${assignment.user.email}.`, { variant: 'success' });
    } catch (err) {
      setScannerError(
        err instanceof ApiError ? err.message : 'Unable to assign scanner.',
      );
    } finally {
      setAssigningScanner(false);
    }
  }

  async function handleRemoveScanner(userId: string) {
    if (!id) return;
    setScannerError(null);
    try {
      await organizerService.removeScanner(id, userId);
      setScanners((prev) => prev.filter((s) => s.userId !== userId));
      showToast('Scanner removed from event.', { variant: 'info' });
    } catch (err) {
      setScannerError(
        err instanceof ApiError ? err.message : 'Unable to remove scanner.',
      );
    }
  }

  return (
    <div className="dashboard-shell">
      <OrganizerSidebar />

      <div>
        <div className="section-header">
          <div>
            <Link to="/organizer/events" className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }}>
              <ArrowLeft size={15} />
              <span>Back to My Events</span>
            </Link>
            <h1 className="page-title">{isEdit ? 'Edit Event, Tiers & Gate Scanners' : 'Create New Event'}</h1>
            <p className="page-subtitle">
              {isEdit
                ? 'Update event metadata, pricing tiers, or authorized gate scanners.'
                : 'Your organizer identity is linked automatically from your authenticated account.'}
            </p>
          </div>

          {isEdit && id && (
            <Link to={`/events/${id}`} className="btn btn-secondary">
              View Public Event Page
            </Link>
          )}
        </div>

        {error && <AlertBanner variant="error" title="Could not save event" message={error} />}

        {loading ? (
          <div className="card card-padded" style={{ color: 'var(--text-muted)' }}>
            Loading event editor...
          </div>
        ) : (
          <div className={isEdit ? 'detail-grid' : ''}>
            <form
              onSubmit={handleEventSubmit}
              className="card card-padded"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Event Details</h2>

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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
                <Link to="/organizer/events" className="btn btn-secondary">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : isEdit ? 'Save Event' : 'Create Event & Add Tiers'}</span>
                </button>
              </div>
            </form>

            {isEdit && id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <aside className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={18} color="var(--brand-primary)" />
                      <h2 style={{ fontSize: '1.12rem', fontWeight: 700 }}>Ticket Tiers</h2>
                    </div>
                    <span className="badge">{tiers.length}</span>
                  </div>

                  {tierError && <AlertBanner variant="error" message={tierError} />}

                  {tiers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {tiers.map((t) => {
                        const isEditingThis = editingTierId === t.id;
                        return (
                          <div key={t.id} className="tier-card">
                            {isEditingThis ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input
                                  className="input"
                                  value={editTierName}
                                  onChange={(e) => setEditTierName(e.target.value)}
                                />
                                <div className="form-grid-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input"
                                    value={editTierPrice}
                                    onChange={(e) => setEditTierPrice(e.target.value)}
                                  />
                                  <input
                                    type="number"
                                    min="1"
                                    className="input"
                                    value={editTierQty}
                                    onChange={(e) => setEditTierQty(e.target.value)}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleSaveTierEdit(t.id)}
                                  >
                                    Save Tier
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setEditingTierId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <strong style={{ fontSize: '0.95rem' }}>{t.name}</strong>
                                  <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                                    {formatCurrency(t.price)}
                                  </span>
                                </div>
                                {t.description && (
                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {t.description}
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    {t.remainingQuantity} / {t.totalQuantity} remaining
                                  </span>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => {
                                        setEditingTierId(t.id);
                                        setEditTierName(t.name);
                                        setEditTierPrice(String(t.price));
                                        setEditTierQty(String(t.totalQuantity));
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      aria-label={`Delete ${t.name}`}
                                      onClick={() => handleDeleteTier(t.id)}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <form
                    onSubmit={handleCreateTier}
                    className="tier-card"
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 700 }}>Add Ticket Tier</h3>
                    <input
                      className="input"
                      placeholder="Tier name (e.g. Early Bird, VIP Pass) *"
                      value={tierName}
                      onChange={(e) => setTierName(e.target.value)}
                      required
                    />
                    <div className="form-grid-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="Price USD *"
                        value={tierPrice}
                        onChange={(e) => setTierPrice(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="input"
                        placeholder="Quantity *"
                        value={tierQty}
                        onChange={(e) => setTierQty(e.target.value)}
                        required
                      />
                    </div>
                    <input
                      className="input"
                      placeholder="Perks / description (optional)"
                      value={tierDesc}
                      onChange={(e) => setTierDesc(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={savingTier}>
                      <Plus size={16} />
                      <span>{savingTier ? 'Adding...' : 'Add Ticket Tier'}</span>
                    </button>
                  </form>
                </aside>

                <aside className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <QrCode size={18} color="var(--brand-primary)" />
                    <h2 style={{ fontSize: '1.12rem', fontWeight: 700 }}>Authorized Gate Scanners</h2>
                  </div>

                  {scannerError && <AlertBanner variant="error" message={scannerError} />}

                  <form onSubmit={handleAssignScanner} style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="email"
                      className="input"
                      placeholder="Scanner account email (e.g. scanner@eticket.com)"
                      value={scannerEmail}
                      onChange={(e) => setScannerEmail(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={assigningScanner}>
                      <UserPlus size={15} />
                      <span>Assign</span>
                    </button>
                  </form>

                  {scanners.length === 0 ? (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      No dedicated SCANNER accounts assigned yet (you can still scan your own event).
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {scanners.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>{s.user.email}</strong>
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveScanner(s.userId)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
