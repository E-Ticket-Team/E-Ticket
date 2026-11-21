import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Receipt, Ticket, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { ordersService } from '../../services/orders.service';
import type { OrderSummary } from '../../types/api';
import { formatCurrency, formatDateTime, formatPersonName } from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { Skeleton } from '../../components/common/Skeleton';

export function MyAccountPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ordersService.listMine();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load order history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      await ordersService.cancel(cancelTarget.id, 'Cancelled from account');
      showToast('Order updated and inventory released.', { variant: 'info' });
      setCancelTarget(null);
      await loadOrders();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to cancel order.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="My Account & Orders"
        subtitle="Manage your profile, track pending checkouts, and review order history."
        actions={
          <Link to="/my-tickets" className="btn btn-primary">
            <Ticket size={16} />
            <span>Open Ticket Wallet</span>
          </Link>
        }
      />

      {user && (
        <div className="card card-padded" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={20} color="var(--brand-primary)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Profile Information</h2>
            </div>
            <span className="badge badge-info">{user.role}</span>
          </div>

          <div className="grid-4">
            <div>
              <div className="meta-caption">Name</div>
              <div style={{ fontWeight: 600 }}>{formatPersonName(user)}</div>
            </div>
            <div>
              <div className="meta-caption">Email</div>
              <div style={{ fontWeight: 600 }}>{user.email}</div>
            </div>
            <div>
              <div className="meta-caption">Phone</div>
              <div style={{ fontWeight: 600 }}>{user.phoneNumber || '—'}</div>
            </div>
            <div>
              <div className="meta-caption">Member Since</div>
              <div style={{ fontWeight: 600 }}>{formatDateTime(user.createdAt)}</div>
            </div>
          </div>
        </div>
      )}

      {error && <AlertBanner variant="error" message={error} />}

      <h2 className="page-title" style={{ fontSize: '1.35rem', marginBottom: 14 }}>
        Order History
      </h2>

      {loading ? (
        <Skeleton height={180} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Receipt size={24} />}
          title="No orders yet"
          description="Reserve tickets on any published event to start an order."
          action={
            <Link to="/events" className="btn btn-primary">
              Browse Events
            </Link>
          }
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order &amp; Event</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const firstEvent = ord.items?.[0]?.ticketType?.event?.title || 'Event Order';
                const hasUsedTicket = ord.tickets?.some((t) => t.status === 'USED');
                const canCancel =
                  ord.status === 'PENDING' || (ord.status === 'PAID' && !hasUsedTicket);

                return (
                  <tr key={ord.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{firstEvent}</div>
                      <div className="code-chip" style={{ fontSize: '0.72rem', marginTop: 4, display: 'inline-block' }}>
                        {ord.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td>
                      {(ord.items ?? []).map((item) => (
                        <div key={item.id} style={{ fontSize: '0.84rem' }}>
                          {item.ticketType.name} × {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td>
                      <strong>{formatCurrency(ord.totalAmount)}</strong>
                    </td>
                    <td>
                      <StatusBadge status={ord.status} />
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {formatDateTime(ord.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {ord.status === 'PENDING' ? (
                          <Link to={`/checkout/${ord.id}`} className="btn btn-primary btn-sm">
                            <CreditCard size={14} />
                            <span>Pay Now</span>
                          </Link>
                        ) : ord.status === 'PAID' ? (
                          <Link to="/my-tickets" className="btn btn-secondary btn-sm">
                            <Ticket size={14} />
                            <span>Passes ({ord.tickets?.length ?? 0})</span>
                          </Link>
                        ) : null}

                        {canCancel && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setCancelTarget(ord)}
                          >
                            {ord.status === 'PAID' ? 'Refund' : 'Cancel'}
                          </button>
                        )}
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
        open={Boolean(cancelTarget)}
        title={cancelTarget?.status === 'PAID' ? 'Request Order Refund' : 'Cancel Pending Order'}
        message={
          cancelTarget?.status === 'PAID'
            ? 'Refunding this order will invalidate all issued tickets and release the seats back to inventory.'
            : 'Cancel this pending reservation and release seats back to inventory?'
        }
        confirmLabel={cancelTarget?.status === 'PAID' ? 'Refund Order' : 'Cancel Order'}
        busy={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
