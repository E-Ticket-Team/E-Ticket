import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  DollarSign,
  Receipt,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { adminService } from '../../services/admin.service';
import type {
  AdminOverviewData,
  AdminUserRow,
  OrderSummary,
  Role,
  TicketDetail,
} from '../../types/api';
import { formatCurrency, formatDateTime, formatPersonName } from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { StatusBadge } from '../../components/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { Skeleton } from '../../components/common/Skeleton';
import { StatCard } from '../../components/common/StatCard';

type AdminTab = 'overview' | 'users' | 'orders' | 'tickets';

export function AdminDashboardPage() {
  const { user: actingAdmin } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [tickets, setTickets] = useState<TicketDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ov, usrPage, ordPage, tktPage] = await Promise.all([
        adminService.getOverview(),
        adminService.listUsers({
          limit: 50,
          role: roleFilter,
          search: userSearch,
        }),
        adminService.listOrders({ limit: 50 }),
        adminService.listTickets({ limit: 50 }),
      ]);
      setOverview(ov);
      setUsers(usrPage.items);
      setOrders(ordPage.items);
      setTickets(tktPage.items);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to load admin console.',
      );
    } finally {
      setLoading(false);
    }
  }, [roleFilter, userSearch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleRoleChange(targetId: string, nextRole: Role) {
    try {
      const updated = await adminService.updateUser(targetId, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === targetId ? { ...u, ...updated } : u)));
      showToast(`Updated ${updated.email} role to ${nextRole}.`, { variant: 'success' });
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

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Admin navigation">
        <div className="sidebar-group-title">Admin Console</div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-link ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            <ShieldCheck size={16} />
            <span>Platform Overview</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            <Users size={16} />
            <span>Users &amp; Roles</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            <Receipt size={16} />
            <span>Orders Monitor</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${tab === 'tickets' ? 'active' : ''}`}
            onClick={() => setTab('tickets')}
          >
            <Ticket size={16} />
            <span>Tickets Monitor</span>
          </button>
        </nav>
      </aside>

      <div>
        <PageHeader
          title="Platform Administration"
          subtitle="Manage platform accounts, roles, orders, and issued ticket integrity."
        />

        {error && <AlertBanner variant="error" message={error} />}

        {loading && !overview ? (
          <Skeleton height={220} />
        ) : (
          <>
            {tab === 'overview' && overview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="kpi-grid" style={{ marginBottom: 0 }}>
                  <StatCard
                    label="Total Users"
                    value={overview.users.total}
                    hint={`ORG ${overview.users.byRole.ORGANIZER ?? 0} · CUST ${overview.users.byRole.CUSTOMER ?? 0} · SCAN ${overview.users.byRole.SCANNER ?? 0}`}
                    icon={<Users size={18} />}
                  />
                  <StatCard
                    label="Events"
                    value={overview.events.total}
                    hint={`${overview.events.published} published`}
                    icon={<CalendarDays size={18} />}
                    tone="brand"
                  />
                  <StatCard
                    label="Net Order Volume"
                    value={formatCurrency(overview.orders.netVolume)}
                    hint={`${overview.orders.paid} paid of ${overview.orders.total} orders`}
                    icon={<DollarSign size={18} />}
                    tone="success"
                  />
                  <StatCard
                    label="Tickets Issued"
                    value={overview.tickets.totalIssued}
                    hint={`${overview.tickets.checkedIn} checked in`}
                    icon={<Ticket size={18} />}
                    tone="warning"
                  />
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div>
                <div className="filter-bar">
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Search users by email, name, or organization..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <select
                    className="select"
                    style={{ width: 180 }}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="ORGANIZER">ORGANIZER</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="SCANNER">SCANNER</option>
                  </select>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Activity</th>
                        <th style={{ textAlign: 'right' }}>Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isSelf = u.id === actingAdmin?.id;
                        return (
                          <tr key={u.id}>
                            <td>
                              <div style={{ fontWeight: 700 }}>{formatPersonName(u)}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {u.email}
                              </div>
                            </td>
                            <td>
                              <select
                                className="select"
                                aria-label={`Role for ${u.email}`}
                                value={u.role}
                                disabled={isSelf}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                                style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}
                              >
                                <option value="CUSTOMER">CUSTOMER</option>
                                <option value="ORGANIZER">ORGANIZER</option>
                                <option value="SCANNER">SCANNER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </td>
                            <td>
                              <StatusBadge status={u.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                            </td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {u._count?.events ?? 0} events · {u._count?.orders ?? 0} orders
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                                disabled={isSelf}
                                onClick={() => handleToggleActive(u)}
                              >
                                {u.isActive ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <span className="code-chip" style={{ fontSize: '0.75rem' }}>
                            {o.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td>{o.user?.email}</td>
                        <td>
                          <strong>{formatCurrency(o.totalAmount)}</strong>
                        </td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{formatDateTime(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'tickets' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ticket Code</th>
                      <th>Event</th>
                      <th>Tier</th>
                      <th>Owner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <span className="code-chip" style={{ fontSize: '0.78rem' }}>
                            {t.ticketCode}
                          </span>
                        </td>
                        <td>{t.ticketType.event.title}</td>
                        <td>{t.ticketType.name}</td>
                        <td>{t.order?.user?.email}</td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
