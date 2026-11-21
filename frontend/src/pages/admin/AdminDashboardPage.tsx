import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  DollarSign,
  Edit3,
  Eye,
  LayoutDashboard,
  Plus,
  Receipt,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { adminService } from '../../services/admin.service';
import { eventsService } from '../../services/events.service';
import type {
  AdminOverviewData,
  AdminUserRow,
  EventItem,
  EventStatus,
  OrderStatus,
  OrderSummary,
  PaginationMeta,
  Role,
  TicketDetail,
  TicketStatus,
} from '../../types/api';
import {
  formatBuyerEmail,
  formatBuyerName,
  formatBuyerPhone,
  formatCurrency,
  formatDateTime,
  formatPersonName,
  getEventCapacitySummary,
} from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { BuyersListCard } from '../../components/dashboard/BuyersListCard';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import {
  DashboardShellLayout,
  type DashboardNavItem,
} from '../../components/dashboard/DashboardShellLayout';
import { DonutBreakdownCard } from '../../components/dashboard/DonutBreakdownCard';
import { SalesBarAnalyticsCard } from '../../components/dashboard/SalesBarAnalyticsCard';

type AdminTab = 'overview' | 'events' | 'users' | 'orders' | 'tickets';
type DonutMode = 'tickets' | 'orders' | 'users';

const ROLE_CAPABILITIES: Record<Role, { title: string; summary: string }> = {
  ADMIN: {
    title: 'Super Admin (Full System)',
    summary: 'All consoles, user/role creation, all events & gate scanning.',
  },
  ORGANIZER: {
    title: 'Organization Admin',
    summary: 'Create events, pricing tiers, buyers list, team & own gate scan.',
  },
  SCANNER: {
    title: 'Gate Staff (Scanner)',
    summary: 'QR & manual ticket check-in only for organization-assigned events.',
  },
  CUSTOMER: {
    title: 'Ticket Buyer',
    summary: 'Browse live events, book tickets & manage QR boarding passes.',
  },
};

const TAB_TITLES: Record<AdminTab, string> = {
  overview: 'System Dashboard',
  events: 'All Platform Events',
  users: 'Users & Role Access',
  orders: 'Orders Monitor',
  tickets: 'Tickets Monitor',
};

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

export function AdminDashboardPage() {
  const { user: actingAdmin } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [donutMode, setDonutMode] = useState<DonutMode>('tickets');

  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Events Governance state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsMeta, setEventsMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsSearch, setEventsSearch] = useState('');
  const [eventsStatusFilter, setEventsStatusFilter] = useState<EventStatus | 'ALL'>('ALL');
  const [eventsLoading, setEventsLoading] = useState(true);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Users Directory state
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersMeta, setUsersMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [usersLoading, setUsersLoading] = useState(true);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserOrgName, setNewUserOrgName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('ORGANIZER');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Orders Monitor state (shared with Overview Buyers List)
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(8);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Tickets Monitor state
  const [tickets, setTickets] = useState<TicketDetail[]>([]);
  const [ticketsMeta, setTicketsMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const data = await adminService.getOverview();
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load platform overview.');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      const res = await eventsService.list({
        page: eventsPage,
        limit: 12,
        search: eventsSearch,
        status: eventsStatusFilter === 'ALL' ? undefined : eventsStatusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setEvents(res.items);
      setEventsMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load platform events.');
    } finally {
      setEventsLoading(false);
    }
  }, [eventsPage, eventsSearch, eventsStatusFilter]);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await adminService.listUsers({
        page: usersPage,
        limit: 15,
        role: roleFilter,
        search: userSearch,
      });
      setUsers(res.items);
      setUsersMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load user directory.');
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, roleFilter, userSearch]);

  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const res = await adminService.listOrders({
        page: orderPage,
        limit: orderPageSize,
        status: orderStatusFilter === 'ALL' ? undefined : orderStatusFilter,
        search: orderSearch,
      });
      setOrders(res.items);
      setOrdersTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load platform orders.');
    } finally {
      setOrdersLoading(false);
    }
  }, [orderPage, orderPageSize, orderStatusFilter, orderSearch]);

  const loadTickets = useCallback(async () => {
    try {
      setTicketsLoading(true);
      const res = await adminService.listTickets({
        page: ticketsPage,
        limit: 15,
        status: ticketStatusFilter === 'ALL' ? undefined : ticketStatusFilter,
        search: ticketSearch,
      });
      setTickets(res.items);
      setTicketsMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load issued tickets.');
    } finally {
      setTicketsLoading(false);
    }
  }, [ticketsPage, ticketStatusFilter, ticketSearch]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function refreshAll() {
    await Promise.all([
      loadOverview(),
      loadEvents(),
      loadUsers(),
      loadOrders(),
      loadTickets(),
    ]);
    showToast('Platform data refreshed.', { variant: 'info' });
  }

  async function handleRoleChange(targetId: string, nextRole: Role) {
    try {
      const updated = await adminService.updateUser(targetId, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, ...updated } : u)));
      showToast(`Updated ${updated.email} role to ${nextRole}.`, { variant: 'success' });
      loadOverview();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update role.', {
        variant: 'error',
      });
    }
  }

  async function handleToggleActive(target: AdminUserRow) {
    try {
      const updated = await adminService.updateUser(target.id, {
        isActive: !target.isActive,
      });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, ...updated } : u)));
      showToast(
        `${updated.email} is now ${updated.isActive ? 'ACTIVE' : 'SUSPENDED'}.`,
        { variant: 'info' },
      );
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update status.', {
        variant: 'error',
      });
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword) return;
    try {
      setCreatingUser(true);
      setCreateUserError(null);
      const created = await adminService.createUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        firstName: newUserFirstName.trim() || undefined,
        lastName: newUserLastName.trim() || undefined,
        organizationName: newUserOrgName.trim() || undefined,
        phoneNumber: newUserPhone.trim() || undefined,
        role: newUserRole,
      });
      showToast(`Created user ${created.email} (${created.role}).`, {
        variant: 'success',
      });
      setCreateUserOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserOrgName('');
      setNewUserPhone('');
      setNewUserRole('ORGANIZER');
      await Promise.all([loadUsers(), loadOverview()]);
    } catch (err) {
      setCreateUserError(
        err instanceof ApiError ? err.message : 'Unable to create user.',
      );
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleEventStatusChange(event: EventItem, nextStatus: EventStatus) {
    try {
      setUpdatingEventId(event.id);
      await eventsService.update(event.id, { status: nextStatus });
      showToast(`Updated "${event.title}" to ${nextStatus}.`, { variant: 'success' });
      await Promise.all([loadEvents(), loadOverview()]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to update event status.', {
        variant: 'error',
      });
    } finally {
      setUpdatingEventId(null);
    }
  }

  async function handleConfirmDeleteEvent() {
    if (!deleteTarget) return;
    try {
      setDeletingEvent(true);
      await eventsService.remove(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.title}".`, { variant: 'info' });
      setDeleteTarget(null);
      await Promise.all([loadEvents(), loadOverview()]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to delete event.', {
        variant: 'error',
      });
      setDeleteTarget(null);
    } finally {
      setDeletingEvent(false);
    }
  }

  const pendingOrdersCount = overview?.orders.pending ?? 0;

  const navItems: DashboardNavItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: <LayoutDashboard size={17} />,
      active: tab === 'overview',
      onClick: () => setTab('overview'),
    },
    {
      id: 'events',
      label: 'All Events',
      icon: <CalendarDays size={17} />,
      active: tab === 'events',
      badge: overview?.events.total,
      onClick: () => setTab('events'),
    },
    {
      id: 'users',
      label: 'Users & Roles',
      icon: <Users size={17} />,
      active: tab === 'users',
      badge: overview?.users.total,
      onClick: () => setTab('users'),
    },
    {
      id: 'orders',
      label: 'Orders Monitor',
      icon: <Receipt size={17} />,
      active: tab === 'orders',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      onClick: () => setTab('orders'),
    },
    {
      id: 'tickets',
      label: 'Tickets Monitor',
      icon: <Ticket size={17} />,
      active: tab === 'tickets',
      onClick: () => setTab('tickets'),
    },
  ];

  const secondaryNavItems: DashboardNavItem[] = [
    {
      id: 'organizer-studio',
      label: 'Organizer Studio',
      icon: <Building2 size={17} />,
      to: '/organizer',
    },
    {
      id: 'gate-scanner',
      label: 'Gate Scanner',
      icon: <ScanLine size={17} />,
      to: '/organizer/scanner',
    },
  ];

  const donutConfig = useMemo(() => {
    if (!overview) {
      return {
        centerPrimary: 0,
        centerSecondary: 0,
        centerCaption: 'No Data',
        segments: [],
      };
    }

    if (donutMode === 'orders') {
      const cancelledCombined =
        (overview.orders.cancelled ?? 0) + (overview.orders.expired ?? 0);
      return {
        centerPrimary: overview.orders.paid,
        centerSecondary: overview.orders.pending ?? 0,
        centerCaption: 'Paid / Pending',
        segments: [
          { id: 'paid', label: 'Paid Orders', value: overview.orders.paid, color: '#087F5B' },
          { id: 'pending', label: 'Pending Holds', value: overview.orders.pending ?? 0, color: '#F59E0B' },
          { id: 'refunded', label: 'Refunded', value: overview.orders.refunded ?? 0, color: '#0D9488' },
          { id: 'cancelled', label: 'Cancelled / Expired', value: cancelledCombined, color: '#DC2626' },
        ],
      };
    }

    if (donutMode === 'users') {
      return {
        centerPrimary: overview.users.total,
        centerSecondary: undefined,
        centerCaption: 'Registered Accounts',
        segments: [
          { id: 'customers', label: 'Customers', value: overview.users.byRole.CUSTOMER ?? 0, color: '#087F5B' },
          { id: 'organizers', label: 'Organizers', value: overview.users.byRole.ORGANIZER ?? 0, color: '#052E25' },
          { id: 'scanners', label: 'Scanners', value: overview.users.byRole.SCANNER ?? 0, color: '#14B8A6' },
          { id: 'admins', label: 'Admins', value: overview.users.byRole.ADMIN ?? 0, color: '#65A30D' },
        ],
      };
    }

    const validCount =
      overview.tickets.valid ??
      Math.max(0, overview.tickets.totalIssued - overview.tickets.checkedIn - (overview.tickets.cancelled ?? 0));
    const soldActive = validCount + overview.tickets.checkedIn;

    return {
      centerPrimary: soldActive,
      centerSecondary: overview.events.remainingCapacity ?? 0,
      centerCaption: 'Sold / Available',
      segments: [
        { id: 'valid', label: 'Valid Sold Passes', value: validCount, color: '#087F5B' },
        { id: 'used', label: 'Checked-In Passes', value: overview.tickets.checkedIn, color: '#052E25' },
        { id: 'available', label: 'Available Inventory', value: overview.events.remainingCapacity ?? 0, color: '#86EFAC' },
        { id: 'cancelled', label: 'Cancelled Tickets', value: overview.tickets.cancelled ?? 0, color: '#DC2626' },
      ],
    };
  }, [overview, donutMode]);

  const barGroups = useMemo(() => {
    const series = overview?.salesOverTime ?? [];
    return series.slice(-10).map((point) => ({
      label: formatDayShort(point.date),
      caption: `${point.date} · ${formatCurrency(point.revenue)}`,
      bars: [
        {
          key: 'tickets',
          label: 'Tickets Sold',
          color: '#087F5B',
          value: point.tickets,
        },
        {
          key: 'orders',
          label: 'Paid Orders',
          color: '#052E25',
          value: point.paidOrders,
        },
      ],
    }));
  }, [overview]);

  const checkInPercent =
    overview && overview.tickets.totalIssued > 0
      ? Math.round((overview.tickets.checkedIn / overview.tickets.totalIssued) * 100)
      : 0;

  return (
    <DashboardShellLayout
      pageTitle={TAB_TITLES[tab]}
      workspaceLabel="Admin Console"
      roleTitle="Super Admin"
      navItems={navItems}
      secondaryNavItems={secondaryNavItems}
      notificationCount={pendingOrdersCount}
      notificationTitle={
        pendingOrdersCount > 0
          ? `${pendingOrdersCount} pending order(s) — click to review`
          : 'No pending orders'
      }
      onNotificationClick={() => {
        setOrderStatusFilter(pendingOrdersCount > 0 ? 'PENDING' : 'ALL');
        setOrderPage(1);
        setTab('orders');
      }}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={overviewLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link to="/organizer/events/new" className="btn btn-primary btn-sm">
            <Plus size={15} />
            <span>New Event</span>
          </Link>
        </div>
      }
    >
      {error && <AlertBanner variant="error" message={error} />}

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* Row 1: 4 Platform KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <DashboardKpiCard
              label="Total Users"
              value={overview?.users.total ?? 0}
              deltaText={`${overview?.users.byRole.ORGANIZER ?? 0} org · ${overview?.users.byRole.CUSTOMER ?? 0} buyers`}
              deltaTone="neutral"
              icon={<Users size={17} />}
              actionLabel="Manage users and roles"
              onAction={() => setTab('users')}
            />
            <DashboardKpiCard
              label="System Events"
              value={overview?.events.total ?? 0}
              deltaText={`${overview?.events.published ?? 0} live · ${overview?.events.draft ?? 0} draft`}
              deltaTone="positive"
              icon={<CalendarDays size={17} />}
              actionLabel="Manage all events"
              onAction={() => setTab('events')}
            />
            <DashboardKpiCard
              label="Net Platform Volume"
              value={formatCurrency(overview?.orders.netVolume ?? 0)}
              deltaText={`${overview?.orders.paid ?? 0} paid · ${pendingOrdersCount} pending`}
              deltaTone="positive"
              icon={<DollarSign size={17} />}
              actionLabel="Inspect orders monitor"
              onAction={() => setTab('orders')}
            />
            <DashboardKpiCard
              label="Tickets Issued"
              value={overview?.tickets.totalIssued ?? 0}
              deltaText={`${overview?.tickets.checkedIn ?? 0} checked in (${checkInPercent}%)`}
              deltaTone={checkInPercent >= 20 ? 'positive' : 'warning'}
              icon={<Ticket size={17} />}
              actionLabel="Inspect issued tickets"
              onAction={() => setTab('tickets')}
            />
          </div>

          {/* Row 2: Donut Breakdown (5) + Grouped Sales Bar Chart (7) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-5">
              <DonutBreakdownCard
                title="Platform Breakdown"
                subtitle="Inventory & role distribution across the system"
                centerPrimary={donutConfig.centerPrimary}
                centerSecondary={donutConfig.centerSecondary}
                centerCaption={donutConfig.centerCaption}
                segments={donutConfig.segments}
                headerSlot={
                  <div className="inline-flex rounded-xl bg-[#F1F6F1] p-0.5 border border-[#E3EBE5]">
                    {(['tickets', 'orders', 'users'] as DonutMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDonutMode(mode)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                          donutMode === mode
                            ? 'bg-white text-[#087F5B] shadow-sm'
                            : 'text-[#64766D] hover:text-[#052E25]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                }
              />
            </div>

            <div className="xl:col-span-7">
              <SalesBarAnalyticsCard
                title="Platform Sales Analytics"
                subtitle="Daily settled ticket volume & paid orders"
                groups={barGroups}
                emptyMessage="No paid orders settled yet. Daily sales trends appear after your first completed checkout."
                headerSlot={
                  <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className="h-7 px-3 rounded-lg border border-[#C8D6CD] bg-[#FAFCFA] hover:bg-[#E7F5EE] text-[11px] font-bold text-[#052E25] transition"
                  >
                    Full Orders
                  </button>
                }
              />
            </div>
          </div>

          {/* Row 3: Searchable Buyers List */}
          <BuyersListCard
            title="Buyers List"
            subtitle="Platform-wide ticket reservations, contact numbers, and settlement statuses."
            orders={orders}
            loading={ordersLoading}
            serverPagination={{
              total: ordersTotal,
              page: orderPage,
              pageSize: orderPageSize,
              onPageChange: setOrderPage,
              onPageSizeChange: (nextSize) => {
                setOrderPageSize(nextSize);
                setOrderPage(1);
              },
              search: orderSearch,
              onSearchChange: (q) => {
                setOrderSearch(q);
                setOrderPage(1);
              },
              statusFilter: orderStatusFilter,
              onStatusFilterChange: (st) => {
                setOrderStatusFilter(st);
                setOrderPage(1);
              },
            }}
          />
        </div>
      )}

      {/* ALL EVENTS GOVERNANCE TAB */}
      {tab === 'events' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-[#E3EBE5] rounded-2xl p-4 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[240px] flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#82948B] pointer-events-none"
                />
                <input
                  type="search"
                  value={eventsSearch}
                  onChange={(e) => {
                    setEventsSearch(e.target.value);
                    setEventsPage(1);
                  }}
                  placeholder="Search event title, venue, category..."
                  aria-label="Search platform events"
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-medium text-[#102A21] focus:outline-none focus:border-[#087F5B] focus:bg-white"
                />
              </div>

              <select
                aria-label="Filter platform events by status"
                value={eventsStatusFilter}
                onChange={(e) => {
                  setEventsStatusFilter(e.target.value as EventStatus | 'ALL');
                  setEventsPage(1);
                }}
                className="h-9 px-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-semibold text-[#102A21]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-[#64766D]">
              Showing <strong className="text-[#052E25]">{eventsMeta.total}</strong> total events
            </div>
          </div>

          <div className="bg-white border border-[#E3EBE5] rounded-2xl shadow-[0_2px_10px_rgba(5,46,37,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              {eventsLoading ? (
                <div className="p-8 text-center text-sm text-[#64766D]">
                  Loading platform events...
                </div>
              ) : events.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64766D]">
                  No events match the current filter.
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F6F8F5] border-b border-[#E3EBE5]">
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Event
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Organizer
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Venue &amp; Schedule
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Inventory
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Status
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Governance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => {
                      const cap = getEventCapacitySummary(ev);
                      const soldPct = cap.total > 0 ? Math.round((cap.sold / cap.total) * 100) : 0;
                      const busy = updatingEventId === ev.id;
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
                                  {ev.category || 'Uncategorized'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#102A21]">
                            <div className="font-semibold">
                              {formatPersonName(ev.organizer)}
                            </div>
                            <div className="text-[11px] text-[#82948B]">
                              {ev.organizer?.email || ev.organizerId.slice(0, 8)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#53665E]">
                            <div className="font-medium text-[#102A21]">{ev.venue}</div>
                            <div className="text-[11px] text-[#82948B] tabular-nums">
                              {formatDateTime(ev.startDate)}
                            </div>
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
                              <select
                                aria-label={`Status for ${ev.title}`}
                                value={ev.status}
                                disabled={busy}
                                onChange={(e) =>
                                  handleEventStatusChange(ev, e.target.value as EventStatus)
                                }
                                className="h-8 px-2 rounded-lg border border-[#C8D6CD] bg-white text-xs font-semibold text-[#102A21]"
                              >
                                <option value="PUBLISHED">PUBLISHED</option>
                                <option value="DRAFT">DRAFT</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                              <Link
                                to={`/organizer/events/${ev.id}/edit`}
                                className="btn btn-secondary btn-sm"
                                title="Edit event and tiers"
                              >
                                <Edit3 size={13} />
                              </Link>
                              <Link
                                to={`/events/${ev.id}`}
                                className="btn btn-secondary btn-sm"
                                title="View public event page"
                              >
                                <Eye size={13} />
                              </Link>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                title="Delete event"
                                onClick={() => setDeleteTarget(ev)}
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
              )}
            </div>
          </div>

          <Pagination meta={eventsMeta} onPageChange={setEventsPage} />
        </div>
      )}

      {/* USERS & ROLES TAB */}
      {tab === 'users' && (
        <div className="flex flex-col gap-5">
          {/* Role Capabilities Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {(Object.keys(ROLE_CAPABILITIES) as Role[]).map((rKey) => (
              <div
                key={rKey}
                className="bg-white border border-[#E3EBE5] rounded-2xl p-4 shadow-[0_2px_8px_rgba(5,46,37,0.03)]"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <StatusBadge status={rKey} />
                  <span className="text-[11px] font-bold text-[#64766D] tabular-nums">
                    {overview?.users.byRole[rKey] ?? 0} users
                  </span>
                </div>
                <div className="text-xs font-bold text-[#052E25]">
                  {ROLE_CAPABILITIES[rKey].title}
                </div>
                <p className="text-[11.5px] text-[#53665E] mt-1 leading-relaxed">
                  {ROLE_CAPABILITIES[rKey].summary}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#E3EBE5] rounded-2xl p-4 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[240px] flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#82948B] pointer-events-none"
                />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  placeholder="Search user name, organization, email..."
                  aria-label="Search platform users"
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-medium text-[#102A21] focus:outline-none focus:border-[#087F5B] focus:bg-white"
                />
              </div>

              <select
                aria-label="Filter users by role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as Role | 'ALL');
                  setUsersPage(1);
                }}
                className="h-9 px-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-semibold text-[#102A21]"
              >
                <option value="ALL">All Roles</option>
                <option value="CUSTOMER">Customers</option>
                <option value="ORGANIZER">Organizers</option>
                <option value="SCANNER">Gate Scanners</option>
                <option value="ADMIN">Administrators</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-[#64766D]">
                <strong className="text-[#052E25]">{usersMeta.total}</strong> registered accounts
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateUserError(null);
                  setCreateUserOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <UserPlus size={14} />
                <span>Add User &amp; Role</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E3EBE5] rounded-2xl shadow-[0_2px_10px_rgba(5,46,37,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              {usersLoading ? (
                <div className="p-8 text-center text-sm text-[#64766D]">
                  Loading registered users...
                </div>
              ) : users.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64766D]">
                  No users matched that filter.
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F6F8F5] border-b border-[#E3EBE5]">
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Name / Organization
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Email &amp; Phone
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Role Assignment
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        What Role Permits
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Activity
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Status
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Access Control
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = u.id === actingAdmin?.id;
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-[#E3EBE5] last:border-b-0 hover:bg-[#FAFCFA] transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="text-[13px] font-bold text-[#052E25]">
                              {formatPersonName(u)}
                            </div>
                            {isSelf && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#087F5B]">
                                <ShieldCheck size={11} />
                                Current Admin Session
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-medium text-[#102A21]">{u.email}</div>
                            <div className="text-[11px] text-[#82948B] tabular-nums">
                              {u.phoneNumber || '—'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              aria-label={`Role for ${u.email}`}
                              value={u.role}
                              disabled={isSelf}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                              className="h-8 px-2.5 rounded-lg border border-[#C8D6CD] bg-white text-xs font-semibold text-[#102A21] disabled:opacity-50"
                            >
                              <option value="CUSTOMER">CUSTOMER</option>
                              <option value="ORGANIZER">ORGANIZER</option>
                              <option value="SCANNER">SCANNER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-[11.5px] text-[#53665E] max-w-[230px]">
                            {ROLE_CAPABILITIES[u.role].summary}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#53665E] tabular-nums">
                            {u._count?.events ?? 0} events · {u._count?.orders ?? 0} orders
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={u.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleToggleActive(u)}
                              className={`btn btn-sm ${
                                u.isActive ? 'btn-danger' : 'btn-secondary'
                              }`}
                            >
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <Pagination meta={usersMeta} onPageChange={setUsersPage} />
        </div>
      )}

      {/* ORDERS MONITOR TAB */}
      {tab === 'orders' && (
        <div className="flex flex-col gap-5">
          <BuyersListCard
            title="Platform Orders & Buyers List"
            subtitle="Complete payment references, buyer phone contacts, and order settlement history across all organizers."
            orders={orders}
            loading={ordersLoading}
            serverPagination={{
              total: ordersTotal,
              page: orderPage,
              pageSize: orderPageSize,
              onPageChange: setOrderPage,
              onPageSizeChange: (nextSize) => {
                setOrderPageSize(nextSize);
                setOrderPage(1);
              },
              search: orderSearch,
              onSearchChange: (q) => {
                setOrderSearch(q);
                setOrderPage(1);
              },
              statusFilter: orderStatusFilter,
              onStatusFilterChange: (st) => {
                setOrderStatusFilter(st);
                setOrderPage(1);
              },
            }}
          />
        </div>
      )}

      {/* TICKETS MONITOR TAB */}
      {tab === 'tickets' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-[#E3EBE5] rounded-2xl p-4 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[240px] flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#82948B] pointer-events-none"
                />
                <input
                  type="search"
                  value={ticketSearch}
                  onChange={(e) => {
                    setTicketSearch(e.target.value);
                    setTicketsPage(1);
                  }}
                  placeholder="Search ticket code, buyer name, email..."
                  aria-label="Search issued tickets"
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-medium text-[#102A21] focus:outline-none focus:border-[#087F5B] focus:bg-white"
                />
              </div>

              <select
                aria-label="Filter tickets by status"
                value={ticketStatusFilter}
                onChange={(e) => {
                  setTicketStatusFilter(e.target.value as TicketStatus | 'ALL');
                  setTicketsPage(1);
                }}
                className="h-9 px-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-semibold text-[#102A21]"
              >
                <option value="ALL">All Ticket States</option>
                <option value="VALID">Valid</option>
                <option value="USED">Checked In (Used)</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-[#64766D]">
              <strong className="text-[#052E25]">{ticketsMeta.total}</strong> tickets tracked
            </div>
          </div>

          <div className="bg-white border border-[#E3EBE5] rounded-2xl shadow-[0_2px_10px_rgba(5,46,37,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              {ticketsLoading ? (
                <div className="p-8 text-center text-sm text-[#64766D]">
                  Loading issued tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64766D]">
                  No tickets match your current filter.
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F6F8F5] border-b border-[#E3EBE5]">
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Ticket Code
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Buyer &amp; Phone
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Email
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Event &amp; Tier
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Status
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                        Checked In At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-[#E3EBE5] last:border-b-0 hover:bg-[#FAFCFA] transition-colors"
                      >
                        <td className="py-3.5 px-4 text-xs font-mono font-bold text-[#052E25] whitespace-nowrap">
                          {t.ticketCode}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-[#102A21]">
                            {formatBuyerName(t.order)}
                          </div>
                          <div className="text-[11px] text-[#82948B] tabular-nums">
                            {formatBuyerPhone(t.order)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#53665E]">
                          {formatBuyerEmail(t.order)}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-[#102A21]">
                            {t.ticketType.event.title}
                          </div>
                          <div className="text-[11px] text-[#82948B]">
                            {t.ticketType.name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#53665E] tabular-nums whitespace-nowrap">
                          {formatDateTime(t.usedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <Pagination meta={ticketsMeta} onPageChange={setTicketsPage} />
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Platform Event?"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}" and remove its ticket tiers? Events with active sold tickets are protected from deletion.`
            : ''
        }
        confirmLabel="Delete Event"
        busy={deletingEvent}
        onConfirm={handleConfirmDeleteEvent}
        onCancel={() => !deletingEvent && setDeleteTarget(null)}
      />

      {createUserOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Create Platform User"
          onClick={() => !creatingUser && setCreateUserOpen(false)}
        >
          <div
            className="modal-panel max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#E3EBE5]">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#E7F5EE] text-[#087F5B] flex items-center justify-center">
                  <UserPlus size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#052E25]">
                    Create User &amp; Assign Role
                  </h2>
                  <p className="text-xs text-[#64766D]">
                    Configure account access and permissions immediately.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close create user dialog"
                onClick={() => !creatingUser && setCreateUserOpen(false)}
                className="p-1.5 rounded-lg text-[#64766D] hover:bg-[#F6F8F5]"
              >
                <X size={16} />
              </button>
            </div>

            {createUserError && (
              <div className="mb-3">
                <AlertBanner variant="error" message={createUserError} />
              </div>
            )}

            <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="input-group">
                  <label htmlFor="new-user-email" className="input-label">
                    Email *
                  </label>
                  <input
                    id="new-user-email"
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="member@company.com"
                    className="input"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="new-user-password" className="input-label">
                    Password * (min 8 chars)
                  </label>
                  <input
                    id="new-user-password"
                    type="password"
                    required
                    minLength={8}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Password123!"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="input-group">
                  <label htmlFor="new-user-first" className="input-label">
                    First Name
                  </label>
                  <input
                    id="new-user-first"
                    type="text"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="new-user-last" className="input-label">
                    Last Name
                  </label>
                  <input
                    id="new-user-last"
                    type="text"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="input-group">
                  <label htmlFor="new-user-role" className="input-label">
                    Role *
                  </label>
                  <select
                    id="new-user-role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Role)}
                    className="select"
                  >
                    <option value="ORGANIZER">ORGANIZER (Organization Admin)</option>
                    <option value="SCANNER">SCANNER (Gate Staff)</option>
                    <option value="ADMIN">ADMIN (Full Super Admin)</option>
                    <option value="CUSTOMER">CUSTOMER (Buyer)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="new-user-phone" className="input-label">
                    Phone Number
                  </label>
                  <input
                    id="new-user-phone"
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+855 12 888 999"
                    className="input"
                  />
                </div>
              </div>

              {newUserRole === 'ORGANIZER' && (
                <div className="input-group">
                  <label htmlFor="new-user-org" className="input-label">
                    Organization Name
                  </label>
                  <input
                    id="new-user-org"
                    type="text"
                    value={newUserOrgName}
                    onChange={(e) => setNewUserOrgName(e.target.value)}
                    placeholder="Cambodia Events Studio"
                    className="input"
                  />
                </div>
              )}

              <div className="rounded-xl bg-[#E7F5EE] border border-[#D5EDE1] px-3.5 py-2.5 text-xs text-[#064E3B]">
                <strong>Permissions:</strong> {ROLE_CAPABILITIES[newUserRole].summary}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={creatingUser}
                  onClick={() => setCreateUserOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={creatingUser} className="btn btn-primary">
                  <UserPlus size={15} />
                  <span>{creatingUser ? 'Creating...' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShellLayout>
  );
}
