import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Edit3,
  Eye,
  Plus,
  Ticket,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useGSAP } from '../../animations/gsap';
import { runStaggerScrollReveal } from '../../animations/scroll-reveals';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { eventsService } from '../../services/events.service';
import { organizerService } from '../../services/organizer.service';
import type {
  EventItem,
  EventStatus,
  OrderSummary,
  OrganizerDashboardData,
} from '../../types/api';
import {
  formatCurrency,
  formatDateRange,
  formatDateTime,
  formatPersonName,
  getEventCapacitySummary,
} from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { Skeleton } from '../../components/common/Skeleton';
import { StatCard } from '../../components/common/StatCard';
import { AnalyticsChart } from '../../components/dashboard/AnalyticsChart';
import { OrganizerSidebar } from '../../components/dashboard/OrganizerSidebar';

type OrganizerTab = 'overview' | 'events' | 'orders';

export function OrganizerDashboardPage({
  initialTab = 'overview',
}: {
  initialTab?: OrganizerTab;
}) {
  const { showToast } = useToast();
  const kpiRef = useRef<HTMLDivElement | null>(null);

  const [dashboard, setDashboard] = useState<OrganizerDashboardData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashData, eventsPage, ordersData] = await Promise.all([
        organizerService.getDashboard(),
        eventsService.list({ mine: true, page: 1, limit: 100 }),
        organizerService.getOrders(),
      ]);
      setDashboard(dashData);
      setEvents(eventsPage.items);
      setOrders(ordersData);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load organizer dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useGSAP(
    () => {
      if (!loading && dashboard && initialTab === 'overview') {
        runStaggerScrollReveal('.kpi-card', kpiRef.current);
      }
    },
    { dependencies: [loading, dashboard, initialTab], scope: kpiRef },
  );

  const visibleEvents = useMemo(() => {
    if (statusFilter === 'ALL') return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  async function handleStatusChange(event: EventItem, nextStatus: EventStatus) {
    try {
      setUpdatingId(event.id);
      setError(null);
      await eventsService.update(event.id, { status: nextStatus });
      showToast(`Updated "${event.title}" to ${nextStatus}.`, { variant: 'success' });
      await loadData();
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
      await eventsService.remove(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.title}".`, { variant: 'info' });
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete event.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const summary = dashboard?.summary;

  return (
    <div className="dashboard-shell">
      <OrganizerSidebar />

      <div>
        <PageHeader
          title={
            initialTab === 'events'
              ? 'My Events & Ticket Tiers'
              : initialTab === 'orders'
                ? 'Event Orders'
                : 'Organizer Overview'
          }
          subtitle={
            initialTab === 'events'
              ? 'Create, publish, cancel, and manage pricing tiers for your events.'
              : initialTab === 'orders'
                ? 'Track customer ticket orders and payment references for your events.'
                : 'Live sales, revenue, inventory, and gate check-in performance.'
          }
          actions={
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {initialTab === 'overview' && (
                <Link to="/organizer/attendees" className="btn btn-secondary">
                  <span>Attendees</span>
                </Link>
              )}
              <Link to="/organizer/events/new" className="btn btn-primary">
                <Plus size={17} />
                <span>Create Event</span>
              </Link>
            </div>
          }
        />

        {error && <AlertBanner variant="error" title="Action Error" message={error} />}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton height={110} />
            <Skeleton height={240} />
          </div>
        ) : initialTab === 'overview' && dashboard && summary ? (
          <div ref={kpiRef} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <StatCard
                label="Total Events"
                value={summary.totalEvents}
                hint={`${summary.publishedEvents} published · ${summary.draftEvents} draft`}
                icon={<CalendarDays size={18} />}
              />
              <StatCard
                label="Tickets Sold"
                value={summary.ticketsSold}
                hint={`${summary.availableTickets} seats still available`}
                icon={<Ticket size={18} />}
                tone="brand"
              />
              <StatCard
                label="Net Revenue"
                value={formatCurrency(summary.netRevenue)}
                hint={`Gross ${formatCurrency(summary.grossRevenue)} · Refunded ${formatCurrency(summary.refundedAmount)}`}
                icon={<DollarSign size={18} />}
                tone="success"
              />
              <StatCard
                label="Total Check-Ins"
                value={summary.totalCheckIns}
                hint={`${summary.checkInRate}% check-in rate`}
                icon={<CheckCircle2 size={18} />}
                tone="warning"
              />
            </div>

            <div className="grid-2">
              <AnalyticsChart
                title="Revenue Over Time"
                subtitle="Daily settled ticket revenue (USD)"
                formatAsCurrency
                points={dashboard.salesOverTime.map((d) => ({
                  label: d.date,
                  value: Number(d.revenue),
                  secondaryLabel: `${d.tickets} ticket(s)`,
                }))}
                emptyMessage="No paid orders recorded yet."
              />

              <AnalyticsChart
                title="Event Sales Breakdown"
                subtitle="Tickets issued per event"
                points={dashboard.eventBreakdown.map((ev) => ({
                  label: ev.title,
                  value: ev.ticketsSold,
                  secondaryLabel: `${ev.checkIns} checked in`,
                }))}
                emptyMessage="Create and publish an event to see breakdown."
              />
            </div>

            <div className="card card-padded">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color="var(--color-primary)" />
                  <h2 className="card-title">Event Performance</h2>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {dashboard.revenuePolicy}
                </span>
              </div>

              {dashboard.eventBreakdown.length === 0 ? (
                <div className="chart-empty">No events found for your organizer account.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Status</th>
                        <th>Sold / Capacity</th>
                        <th>Check-Ins</th>
                        <th>Net Revenue</th>
                        <th style={{ textAlign: 'right' }}>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.eventBreakdown.map((row) => (
                        <tr key={row.eventId}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{row.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                              {row.venue}
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="tabular-nums">
                            <strong>{row.ticketsSold}</strong> / {row.totalCapacity} ({row.remainingQuantity} left)
                          </td>
                          <td className="tabular-nums">
                            {row.checkIns} ({row.checkInRate}%)
                          </td>
                          <td className="tabular-nums">
                            <strong>{formatCurrency(row.netRevenue)}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link
                              to={`/organizer/events/${row.eventId}/edit`}
                              className="btn btn-secondary btn-sm"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : initialTab === 'orders' ? (
          orders.length === 0 ? (
            <EmptyState
              icon={<Ticket size={24} />}
              title="No event orders yet"
              description="Customer ticket reservations and completed purchases for your events will appear here."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <span className="code-chip" style={{ fontSize: '0.75rem' }}>
                          {ord.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{formatPersonName(ord.user)}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {ord.user?.email}
                        </div>
                      </td>
                      <td>
                        {(ord.items ?? []).map((item) => (
                          <div key={item.id} style={{ fontSize: '0.84rem' }}>
                            {item.ticketType.event.title} — {item.ticketType.name} × {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="tabular-nums">
                        <strong>{formatCurrency(ord.totalAmount)}</strong>
                      </td>
                      <td>
                        <StatusBadge status={ord.status} />
                      </td>
                      <td className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {formatDateTime(ord.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <>
            <div className="filter-bar" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Your Events ({visibleEvents.length})
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

            {visibleEvents.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={24} />}
                title="No events in this view"
                description="Create a new event or change the status filter above."
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
                            <div style={{ fontWeight: 700 }}>{ev.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {ev.category || 'Uncategorized'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.86rem' }}>
                              {formatDateRange(ev.startDate, ev.endDate)}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
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
                            <div className="tabular-nums" style={{ fontWeight: 600 }}>
                              {ev.ticketTypes?.length ?? 0} tier(s)
                            </div>
                            <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {cap.total > 0
                                ? `${cap.remaining} / ${cap.total} available`
                                : 'No tiers yet'}
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
                              >
                                <Edit3 size={14} />
                                <span>Edit</span>
                              </Link>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                title="Delete draft event"
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
          </>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Event"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}"? Events with existing orders cannot be deleted and must be cancelled instead.`
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
