import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  DollarSign,
  Edit3,
  Eye,
  Layers,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
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
  getEventCapacitySummary,
  getLowestPrice,
} from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { BuyersListCard } from '../../components/dashboard/BuyersListCard';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { DonutBreakdownCard } from '../../components/dashboard/DonutBreakdownCard';
import { OrganizerWorkspaceLayout } from '../../components/dashboard/OrganizerWorkspaceLayout';
import { SalesBarAnalyticsCard } from '../../components/dashboard/SalesBarAnalyticsCard';

type OrganizerTab = 'overview' | 'events' | 'orders';
type DonutView = 'by-event' | 'by-status';
type BarView = 'inventory' | 'daily';

const DONUT_COLORS = ['#087F5B', '#052E25', '#0D9488', '#65A30D'];

function formatDayShort(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate.slice(5);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function OrganizerDashboardPage({
  initialTab = 'overview',
}: {
  initialTab?: OrganizerTab;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [dashboard, setDashboard] = useState<OrganizerDashboardData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [eventSearch, setEventSearch] = useState('');
  const [donutView, setDonutView] = useState<DonutView>('by-event');
  const [barView, setBarView] = useState<BarView>('inventory');

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

  const visibleEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return events.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (!q) return true;
      return `${e.title} ${e.venue} ${e.category ?? ''}`.toLowerCase().includes(q);
    });
  }, [events, statusFilter, eventSearch]);

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
  const publishedCount = events.filter((e) => e.status === 'PUBLISHED').length;
  const draftCount = events.filter((e) => e.status === 'DRAFT').length;
  const paidOrdersCount = orders.filter((o) => o.status === 'PAID').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  const totalCapacity = useMemo(
    () =>
      dashboard?.eventBreakdown.reduce((acc, ev) => acc + ev.totalCapacity, 0) ?? 0,
    [dashboard],
  );

  const donutConfig = useMemo(() => {
    if (!summary || !dashboard) {
      return {
        centerPrimary: 0,
        centerSecondary: 0,
        centerCaption: 'Sold / Available',
        segments: [],
      };
    }

    if (donutView === 'by-status') {
      const validUnscanned = Math.max(0, summary.ticketsSold - summary.totalCheckIns);
      return {
        centerPrimary: summary.ticketsSold,
        centerSecondary: summary.availableTickets,
        centerCaption: 'Sold / Available',
        segments: [
          { id: 'used', label: 'Checked-In Attendees', value: summary.totalCheckIns, color: '#052E25' },
          { id: 'valid', label: 'Valid Sold Passes', value: validUnscanned, color: '#087F5B' },
          { id: 'available', label: 'Available Seats', value: summary.availableTickets, color: '#86EFAC' },
        ],
      };
    }

    const sortedEvents = [...dashboard.eventBreakdown]
      .filter((ev) => ev.ticketsSold > 0)
      .sort((a, b) => b.ticketsSold - a.ticketsSold);

    const topFour = sortedEvents.slice(0, 4).map((ev, i) => ({
      id: ev.eventId,
      label: ev.title,
      value: ev.ticketsSold,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

    const otherSold = sortedEvents
      .slice(4)
      .reduce((sum, ev) => sum + ev.ticketsSold, 0);

    const segments = [
      ...topFour,
      ...(otherSold > 0
        ? [{ id: 'other-events', label: 'Other Events', value: otherSold, color: '#14B8A6' }]
        : []),
      {
        id: 'available',
        label: 'Available Tickets',
        value: summary.availableTickets,
        color: '#86EFAC',
      },
    ];

    return {
      centerPrimary: summary.ticketsSold,
      centerSecondary: summary.availableTickets,
      centerCaption: 'Sold / Available',
      segments,
    };
  }, [summary, dashboard, donutView]);

  const barGroups = useMemo(() => {
    if (!dashboard) return [];

    if (barView === 'daily' || (dashboard.eventBreakdown.length === 0 && dashboard.salesOverTime.length > 0)) {
      return dashboard.salesOverTime.slice(-10).map((point) => ({
        label: formatDayShort(point.date),
        caption: `${point.date} · ${formatCurrency(point.revenue)}`,
        bars: [
          {
            key: 'tickets',
            label: 'Tickets Sold',
            color: '#087F5B',
            value: point.tickets,
          },
        ],
      }));
    }

    return dashboard.eventBreakdown.slice(0, 7).map((ev) => ({
      label: ev.title,
      caption: `${ev.title} (${formatCurrency(ev.netRevenue)})`,
      bars: [
        {
          key: 'sold',
          label: 'Tickets Sold',
          color: '#087F5B',
          value: ev.ticketsSold,
        },
        {
          key: 'checkedIn',
          label: 'Checked In',
          color: '#052E25',
          value: ev.checkIns,
        },
        {
          key: 'available',
          label: 'Available',
          color: '#86EFAC',
          value: ev.remainingQuantity,
        },
      ],
    }));
  }, [dashboard, barView]);

  const pageTitle =
    initialTab === 'events'
      ? 'My Events & Tiers'
      : initialTab === 'orders'
        ? 'Ticket Sales'
        : 'Dashboard';

  return (
    <OrganizerWorkspaceLayout
      pageTitle={pageTitle}
      pendingOrdersCount={pendingOrdersCount}
      notificationCount={pendingOrdersCount}
      notificationTitle={
        pendingOrdersCount > 0
          ? `${pendingOrdersCount} pending ticket order(s) — click to inspect`
          : 'All event orders settled'
      }
      onNotificationClick={() => navigate('/organizer/orders')}
      headerActions={
        <Link to="/organizer/events/new" className="btn btn-primary btn-sm">
          <Plus size={15} />
          <span>Create Event</span>
        </Link>
      }
    >
      {error && <AlertBanner variant="error" message={error} />}

      {loading ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Skeleton height={124} />
            <Skeleton height={124} />
            <Skeleton height={124} />
            <Skeleton height={124} />
          </div>
          <Skeleton height={280} />
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {initialTab === 'overview' && summary && (
            <div className="flex flex-col gap-5">
              {/* Row 1: 4 Organization KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <DashboardKpiCard
                  label="Total Events"
                  value={summary.totalEvents}
                  deltaText={`${publishedCount} live · ${draftCount} draft`}
                  deltaTone="neutral"
                  icon={<CalendarDays size={17} />}
                  actionLabel="Open My Events & Tiers"
                  onAction={() => navigate('/organizer/events')}
                />
                <DashboardKpiCard
                  label="Net Revenue"
                  value={formatCurrency(summary.netRevenue)}
                  deltaText={`${paidOrdersCount} paid · ${pendingOrdersCount} pending`}
                  deltaTone="positive"
                  icon={<DollarSign size={17} />}
                  actionLabel="Open Ticket Sales"
                  onAction={() => navigate('/organizer/orders')}
                />
                <DashboardKpiCard
                  label="Tickets Sold"
                  value={summary.ticketsSold}
                  deltaText={`${summary.checkInRate}% checked in`}
                  deltaTone={summary.checkInRate >= 20 ? 'positive' : 'warning'}
                  icon={<Ticket size={17} />}
                  actionLabel="Inspect attendees"
                  onAction={() => navigate('/organizer/attendees')}
                />
                <DashboardKpiCard
                  label="Tickets Available"
                  value={summary.availableTickets}
                  deltaText={`${totalCapacity} total seats`}
                  deltaTone="neutral"
                  icon={<TrendingUp size={17} />}
                  actionLabel="Manage tier capacity"
                  onAction={() => navigate('/organizer/events')}
                />
              </div>

              {/* Row 2: Donut Breakdown + Multi-Series Bar Analytics */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <div className="xl:col-span-5">
                  <DonutBreakdownCard
                    title="Total Ticket Breakdown"
                    subtitle="Active sales & remaining seat inventory"
                    centerPrimary={donutConfig.centerPrimary}
                    centerSecondary={donutConfig.centerSecondary}
                    centerCaption={donutConfig.centerCaption}
                    segments={donutConfig.segments}
                    emptyMessage="Create your first event ticket tier to visualize capacity breakdown."
                    headerSlot={
                      <div className="inline-flex rounded-xl bg-[#F1F6F1] p-0.5 border border-[#E3EBE5]">
                        <button
                          type="button"
                          onClick={() => setDonutView('by-event')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            donutView === 'by-event'
                              ? 'bg-white text-[#087F5B] shadow-sm'
                              : 'text-[#64766D] hover:text-[#052E25]'
                          }`}
                        >
                          By Event
                        </button>
                        <button
                          type="button"
                          onClick={() => setDonutView('by-status')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            donutView === 'by-status'
                              ? 'bg-white text-[#087F5B] shadow-sm'
                              : 'text-[#64766D] hover:text-[#052E25]'
                          }`}
                        >
                          By Status
                        </button>
                      </div>
                    }
                  />
                </div>

                <div className="xl:col-span-7">
                  <SalesBarAnalyticsCard
                    title="Ticket Sales Analytics"
                    subtitle={
                      barView === 'daily'
                        ? 'Daily settled ticket sales trend'
                        : 'Tickets sold, gate check-ins, and remaining inventory by event'
                    }
                    groups={barGroups}
                    emptyMessage="No ticket sales or event inventory recorded yet."
                    headerSlot={
                      <div className="inline-flex rounded-xl bg-[#F1F6F1] p-0.5 border border-[#E3EBE5]">
                        <button
                          type="button"
                          onClick={() => setBarView('inventory')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            barView === 'inventory'
                              ? 'bg-white text-[#087F5B] shadow-sm'
                              : 'text-[#64766D] hover:text-[#052E25]'
                          }`}
                        >
                          Event Inventory
                        </button>
                        <button
                          type="button"
                          onClick={() => setBarView('daily')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            barView === 'daily'
                              ? 'bg-white text-[#087F5B] shadow-sm'
                              : 'text-[#64766D] hover:text-[#052E25]'
                          }`}
                        >
                          Daily Sales
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Row 3: Searchable Organizer Buyers List */}
              <BuyersListCard
                title="Buyers List"
                subtitle="Customer and guest attendees who reserved tickets for your organization's events."
                orders={orders}
                events={events}
                defaultPageSize={8}
                emptyMessage="No ticket orders recorded for your events yet."
              />

              {/* Row 4: Organization Event Creation Studio & Features */}
              <section
                aria-label="Organization Event Creation Studio"
                className="bg-white border border-[#E3EBE5] rounded-2xl p-6 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-col gap-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E3EBE5]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#087F5B] mb-1">
                      <ShieldCheck size={14} />
                      <span>Organization Studio Features</span>
                    </div>
                    <h2 className="text-lg font-extrabold text-[#052E25] tracking-tight">
                      {summary.totalEvents === 0
                        ? 'Create Your First Event & Launch Ticket Sales'
                        : 'Event Creation Workflow & Studio Tools'}
                    </h2>
                    <p className="text-xs text-[#64766D] mt-0.5">
                      Everything your organization needs to build event pages, manage tier capacity, and validate guest entry at the gate.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Link to="/organizer/events/new" className="btn btn-primary btn-sm">
                      <CalendarPlus size={15} />
                      <span>
                        {summary.totalEvents === 0 ? 'Create Your First Event' : 'Create New Event'}
                      </span>
                    </Link>
                    <Link to="/organizer/events" className="btn btn-secondary btn-sm">
                      <span>Manage Events</span>
                      <ArrowRight size={14} />
                    </Link>
                    <Link to="/organizer/team" className="btn btn-secondary btn-sm">
                      <Users size={14} />
                      <span>Team &amp; Roles</span>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Link
                    to="/organizer/events/new"
                    className="group rounded-2xl border border-[#E3EBE5] bg-[#FAFCFA] hover:bg-white hover:border-[#087F5B]/45 hover:shadow-sm p-4 transition flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#E7F5EE] text-[#087F5B] shrink-0">
                        <CalendarPlus size={17} />
                      </span>
                      <div>
                        <h3 className="text-[13.5px] font-bold text-[#052E25] group-hover:text-[#087F5B] transition">
                          01. Create Event Page
                        </h3>
                        <p className="text-xs text-[#64766D] mt-1 leading-relaxed">
                          Publish schedules, venue location, custom banners, and instant guest checkout.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#087F5B]">
                      <span>Open Builder</span>
                      <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    to="/organizer/events"
                    className="group rounded-2xl border border-[#E3EBE5] bg-[#FAFCFA] hover:bg-white hover:border-[#087F5B]/45 hover:shadow-sm p-4 transition flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#E7F5EE] text-[#087F5B] shrink-0">
                        <Layers size={17} />
                      </span>
                      <div>
                        <h3 className="text-[13.5px] font-bold text-[#052E25] group-hover:text-[#087F5B] transition">
                          02. Ticket Tiers &amp; Pricing
                        </h3>
                        <p className="text-xs text-[#64766D] mt-1 leading-relaxed">
                          Configure VIP, Early Bird, or General tiers backed by 15-min atomic seat locks.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#087F5B]">
                      <span>Configure Tiers</span>
                      <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    to="/organizer/scanner"
                    className="group rounded-2xl border border-[#E3EBE5] bg-[#FAFCFA] hover:bg-white hover:border-[#087F5B]/45 hover:shadow-sm p-4 transition flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#E7F5EE] text-[#087F5B] shrink-0">
                        <QrCode size={17} />
                      </span>
                      <div>
                        <h3 className="text-[13.5px] font-bold text-[#052E25] group-hover:text-[#087F5B] transition">
                          03. Gate Staff &amp; QR Entry
                        </h3>
                        <p className="text-xs text-[#64766D] mt-1 leading-relaxed">
                          Authorize staff scanners and block duplicate entries with signed ETK1 QR passes.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#087F5B]">
                      <span>Launch Gate Scanner</span>
                      <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    to="/organizer/attendees"
                    className="group rounded-2xl border border-[#E3EBE5] bg-[#FAFCFA] hover:bg-white hover:border-[#087F5B]/45 hover:shadow-sm p-4 transition flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#E7F5EE] text-[#087F5B] shrink-0">
                        <Users size={17} />
                      </span>
                      <div>
                        <h3 className="text-[13.5px] font-bold text-[#052E25] group-hover:text-[#087F5B] transition">
                          04. Attendees &amp; Check-Ins
                        </h3>
                        <p className="text-xs text-[#64766D] mt-1 leading-relaxed">
                          Track issued boarding passes, contact info, and real-time door check-in telemetry.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#087F5B]">
                      <span>Inspect Attendees</span>
                      <ArrowRight size={13} />
                    </span>
                  </Link>
                </div>
              </section>
            </div>
          )}

          {/* MY EVENTS & TIERS TAB */}
          {initialTab === 'events' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white border border-[#E3EBE5] rounded-2xl p-4 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {(['ALL', 'PUBLISHED', 'DRAFT', 'COMPLETED', 'CANCELLED'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          statusFilter === st
                            ? 'bg-[#087F5B] text-white shadow-sm'
                            : 'bg-[#F6F8F5] text-[#53665E] hover:text-[#052E25]'
                        }`}
                      >
                        {st === 'ALL' ? `All (${events.length})` : st}
                      </button>
                    ),
                  )}
                </div>

                <div className="relative min-w-[220px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#82948B] pointer-events-none"
                  />
                  <input
                    type="search"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Filter events by title or venue..."
                    aria-label="Filter organizer events"
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-medium text-[#102A21] focus:outline-none focus:border-[#087F5B] focus:bg-white"
                  />
                </div>
              </div>

              {visibleEvents.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={26} />}
                  title="No matching events found"
                  description="Create a new event to configure ticket tiers, assign gate scanners, and open sales."
                  action={
                    <Link to="/organizer/events/new" className="btn btn-primary">
                      <Plus size={16} />
                      <span>Create First Event</span>
                    </Link>
                  }
                />
              ) : (
                <div className="bg-white border border-[#E3EBE5] rounded-2xl shadow-[0_2px_10px_rgba(5,46,37,0.04)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#F6F8F5] border-b border-[#E3EBE5]">
                          <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                            Event
                          </th>
                          <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                            Schedule &amp; Venue
                          </th>
                          <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                            Price From
                          </th>
                          <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                            Inventory
                          </th>
                          <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                            Status
                          </th>
                          <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEvents.map((ev) => {
                          const cap = getEventCapacitySummary(ev);
                          const lowPrice = getLowestPrice(ev.ticketTypes);
                          const soldPct =
                            cap.total > 0 ? Math.round((cap.sold / cap.total) * 100) : 0;
                          const isBusy = updatingId === ev.id;

                          return (
                            <tr
                              key={ev.id}
                              className="border-b border-[#E3EBE5] last:border-b-0 hover:bg-[#FAFCFA] transition-colors"
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3 min-w-[200px]">
                                  {ev.bannerUrl ? (
                                    <img
                                      src={ev.bannerUrl}
                                      alt=""
                                      className="w-11 h-11 rounded-xl object-cover border border-[#E3EBE5] shrink-0"
                                    />
                                  ) : (
                                    <span className="w-11 h-11 rounded-xl bg-[#E7F5EE] text-[#087F5B] flex items-center justify-center shrink-0">
                                      <CalendarDays size={18} />
                                    </span>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-bold text-[#052E25] truncate max-w-[220px]">
                                      {ev.title}
                                    </div>
                                    <div className="text-[11px] text-[#64766D]">
                                      {ev.ticketTypes?.length ?? 0} tier(s)
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs">
                                <div className="font-semibold text-[#102A21]">{ev.venue}</div>
                                <div className="text-[11px] text-[#82948B]">
                                  {formatDateRange(ev.startDate, ev.endDate)}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-bold text-[#052E25] tabular-nums">
                                {lowPrice !== null ? formatCurrency(lowPrice) : '—'}
                              </td>
                              <td className="py-3.5 px-4 min-w-[140px]">
                                <div className="flex items-center justify-between text-xs font-semibold tabular-nums mb-1">
                                  <span className="text-[#052E25]">{cap.sold} sold</span>
                                  <span className="text-[#82948B]">/ {cap.total}</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[#EFF4F0] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#087F5B]"
                                    style={{ width: `${Math.min(100, soldPct)}%` }}
                                  />
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <StatusBadge status={ev.status} />
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {ev.status === 'DRAFT' && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleStatusChange(ev, 'PUBLISHED')}
                                      className="btn btn-primary btn-sm"
                                    >
                                      Publish
                                    </button>
                                  )}
                                  {ev.status === 'PUBLISHED' && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleStatusChange(ev, 'DRAFT')}
                                      className="btn btn-secondary btn-sm"
                                    >
                                      Move Draft
                                    </button>
                                  )}
                                  <Link
                                    to={`/organizer/scanner?eventId=${ev.id}`}
                                    className="btn btn-secondary btn-sm"
                                    title="Scan gate passes for this event"
                                  >
                                    <QrCode size={13} />
                                  </Link>
                                  <Link
                                    to={`/organizer/events/${ev.id}/edit`}
                                    className="btn btn-secondary btn-sm"
                                    title="Edit event & ticket tiers"
                                  >
                                    <Edit3 size={13} />
                                  </Link>
                                  <Link
                                    to={`/events/${ev.id}`}
                                    className="btn btn-secondary btn-sm"
                                    title="Preview public page"
                                  >
                                    <Eye size={13} />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(ev)}
                                    className="btn btn-danger btn-sm"
                                    title="Delete event"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TICKET SALES / ORDERS TAB */}
          {initialTab === 'orders' && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <DashboardKpiCard
                  label="Total Orders"
                  value={orders.length}
                  deltaText="All time"
                  deltaTone="neutral"
                  icon={<Ticket size={17} />}
                />
                <DashboardKpiCard
                  label="Paid Orders"
                  value={paidOrdersCount}
                  deltaText="Settled checkouts"
                  deltaTone="positive"
                  icon={<TrendingUp size={17} />}
                />
                <DashboardKpiCard
                  label="Pending Holds"
                  value={pendingOrdersCount}
                  deltaText="15-min lock"
                  deltaTone={pendingOrdersCount > 0 ? 'warning' : 'neutral'}
                  icon={<CalendarDays size={17} />}
                />
                <DashboardKpiCard
                  label="Net Sales"
                  value={formatCurrency(summary?.netRevenue ?? 0)}
                  deltaText="After refunds"
                  deltaTone="positive"
                  icon={<DollarSign size={17} />}
                />
              </div>

              <BuyersListCard
                title="Ticket Sales & Buyers List"
                subtitle="Search and filter customer & guest purchases across your organization's events."
                orders={orders}
                events={events}
                defaultPageSize={12}
                emptyMessage="No ticket orders found for your organization."
              />
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Event?"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}" and remove its ticket tiers? Events with existing sold tickets cannot be deleted.`
            : ''
        }
        confirmLabel="Delete Event"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </OrganizerWorkspaceLayout>
  );
}
