import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { EventItem, EventStatus } from '../types/api';
import { formatDateRange, getEventCapacitySummary } from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

export function OrganizerDashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadEvents() {
    try {
      setLoading(true);
      const data = await api.listEvents();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load organizer events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const stats = useMemo(() => {
    const published = events.filter((e) => e.status === 'PUBLISHED').length;
    const drafts = events.filter((e) => e.status === 'DRAFT').length;
    const totalSeats = events.reduce((acc, e) => acc + getEventCapacitySummary(e).total, 0);
    return {
      totalEvents: events.length,
      published,
      drafts,
      totalSeats,
    };
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (statusFilter === 'ALL') return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  async function handleStatusChange(event: EventItem, nextStatus: EventStatus) {
    try {
      setUpdatingId(event.id);
      setError(null);
      await api.updateEvent(event.id, { status: nextStatus });
      setSuccessMsg(`Updated "${event.title}" status to ${nextStatus}.`);
      await loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update event status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError(null);
      await api.deleteEvent(deleteTarget.id);
      setSuccessMsg(`Deleted event "${deleteTarget.title}".`);
      setDeleteTarget(null);
      await loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete event.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Organizer Studio</h1>
          <p className="page-subtitle">
            Create events, manage publishing status, configure ticket tiers, and track capacity.
          </p>
        </div>

        <Link to="/organizer/events/new" className="btn btn-primary">
          <Plus size={17} />
          <span>Create Event</span>
        </Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{stats.totalEvents}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Published Live</div>
          <div className="kpi-value" style={{ color: 'var(--success-solid)' }}>
            {stats.published}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Drafts</div>
          <div className="kpi-value" style={{ color: 'var(--warning-solid)' }}>
            {stats.drafts}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Ticket Capacity</div>
          <div className="kpi-value" style={{ color: 'var(--brand-primary)' }}>
            {stats.totalSeats}
          </div>
        </div>
      </div>

      {error && <AlertBanner variant="error" title="Action Error" message={error} />}
      {successMsg && <AlertBanner variant="success" message={successMsg} />}

      <div className="filter-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          Manage Events ({visibleEvents.length})
        </div>
        <div style={{ minWidth: 190 }}>
          <select
            className="select"
            aria-label="Filter organizer events by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading organizer dashboard...
        </div>
      ) : visibleEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="No events in this view"
          description="Create a new event or switch your status filter to see existing events."
          action={
            <Link to="/organizer/events/new" className="btn btn-primary">
              Create Event
            </Link>
          }
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Schedule &amp; Venue</th>
                <th>Status</th>
                <th>Tiers &amp; Capacity</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((ev) => {
                const cap = getEventCapacitySummary(ev);
                return (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ev.category || 'Uncategorized'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.88rem' }}>
                        {formatDateRange(ev.startDate, ev.endDate)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ev.venue}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <StatusBadge status={ev.status} />
                        <select
                          className="select"
                          aria-label={`Change status for ${ev.title}`}
                          value={ev.status}
                          disabled={updatingId === ev.id}
                          onChange={(e) =>
                            handleStatusChange(ev, e.target.value as EventStatus)
                          }
                          style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }}
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="PUBLISHED">PUBLISHED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {ev.ticketTypes?.length ?? 0} tier(s)
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {cap.total > 0
                          ? `${cap.remaining} / ${cap.total} available`
                          : 'No capacity yet'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Link
                          to={`/events/${ev.id}`}
                          className="btn btn-secondary btn-sm"
                          title="View public event page"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </Link>
                        <Link
                          to={`/organizer/events/${ev.id}/edit`}
                          className="btn btn-primary btn-sm"
                          title="Edit event and ticket tiers"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          title="Delete event"
                          onClick={() => setDeleteTarget(ev)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Event"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.title}" and all of its ticket tiers?`
            : ''
        }
        confirmLabel="Delete Event"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
