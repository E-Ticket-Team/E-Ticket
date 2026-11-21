import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { ordersService } from '../../services/orders.service';
import { paymentsService } from '../../services/payments.service';
import type { OrderSummary } from '../../types/api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { StatusBadge } from '../../components/StatusBadge';
import { TicketPassCard } from '../../components/TicketPassCard';
import { PageHeader } from '../../components/common/PageHeader';
import { Skeleton } from '../../components/common/Skeleton';

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00';
  const totalSecs = Math.floor(msRemaining / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { showToast } = useToast();

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => `pay-${orderId ?? 'ord'}-${crypto.randomUUID()}`,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await ordersService.getById(orderId);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load order.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (order?.status !== 'PENDING' || !order.expiresAt) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [order?.status, order?.expiresAt]);

  async function handleMockPayment(simulateOutcome: 'SUCCEEDED' | 'FAILED') {
    if (!order) return;
    setPayError(null);
    setProcessing(true);

    try {
      const result = await paymentsService.processOrderPayment(order.id, {
        provider: 'MOCK',
        idempotencyKey,
        simulateOutcome,
      });
      setOrder(result.order);

      if (result.payment.status === 'SUCCEEDED') {
        showToast('Payment confirmed and QR passes issued!', { variant: 'success' });
      } else {
        setPayError(
          result.payment.failureReason ||
            'Simulated payment declined. You may retry before your reservation expires.',
        );
        // Generate a fresh key for a subsequent retry after an intentional failure
        setIdempotencyKey(`pay-${order.id}-${crypto.randomUUID()}`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Payment processing failed.';
      setPayError(msg);
      await loadOrder();
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelOrder() {
    if (!order) return;
    try {
      setCancelling(true);
      const updated = await ordersService.cancel(order.id, 'Cancelled at checkout');
      setOrder(updated);
      setConfirmCancel(false);
      showToast('Order cancelled and seats released back to inventory.', {
        variant: 'info',
      });
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : 'Unable to cancel order.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton height={30} width="45%" />
        <Skeleton height={160} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <Link to="/events" className="btn btn-secondary" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <AlertBanner variant="error" title="Order Unavailable" message={error || 'Order not found.'} />
      </div>
    );
  }

  const msRemaining = order.expiresAt
    ? new Date(order.expiresAt).getTime() - nowMs
    : 0;
  const reservationExpired =
    order.status === 'EXPIRED' || (order.status === 'PENDING' && Boolean(order.expiresAt) && msRemaining <= 0);

  return (
    <div>
      <PageHeader
        title="Checkout & Payment Verification"
        subtitle={`Order Reference: ${order.id}`}
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <StatusBadge status={reservationExpired && order.status === 'PENDING' ? 'EXPIRED' : order.status} />
            <Link to="/my-account" className="btn btn-secondary btn-sm">
              My Orders
            </Link>
          </div>
        }
      />

      {order.status === 'PENDING' && order.expiresAt && !reservationExpired && (
        <div className="alert alert-info">
          <Clock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Seats Reserved — Complete payment within {formatCountdown(msRemaining)}</strong>
            <div style={{ fontSize: '0.86rem' }}>
              Inventory is locked until {formatDateTime(order.expiresAt)}. Unpaid reservations release automatically.
            </div>
          </div>
        </div>
      )}

      {reservationExpired && (
        <AlertBanner
          variant="warning"
          title="Reservation Expired"
          message="Your reservation window elapsed and seats were released. Please select tickets again from the event page."
        />
      )}

      {payError && <AlertBanner variant="error" title="Payment Notice" message={payError} />}

      {order.status === 'PAID' && (
        <div className="alert alert-success">
          <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Payment Verified &amp; Tickets Issued</strong>
            <div style={{ fontSize: '0.88rem' }}>
              Reference: <span className="code-chip">{order.paymentReference}</span> · Paid on{' '}
              {formatDateTime(order.paidAt)}. Your QR passes are ready below and in your Ticket Wallet.
            </div>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="card card-padded">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 14 }}>
            Order Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="tier-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.ticketType.event.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {item.ticketType.name} × {item.quantity} ({formatCurrency(item.unitPrice)} each)
                    </div>
                  </div>
                  <strong style={{ color: 'var(--brand-primary)' }}>
                    {formatCurrency(item.subtotal)}
                  </strong>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.15rem',
            }}
          >
            <strong>Total Amount</strong>
            <strong style={{ color: 'var(--brand-primary)' }}>
              {formatCurrency(order.totalAmount)} {order.currency}
            </strong>
          </div>
        </div>

        <aside className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} color="var(--brand-primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Payment Method</h2>
          </div>

          {order.status === 'PENDING' && !reservationExpired ? (
            <>
              <div className="tier-card" style={{ borderColor: 'var(--brand-soft-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.95rem' }}>Development Mock Payment Provider</strong>
                  <span className="badge badge-warning">DEV ONLY</span>
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Simulated payment gateway for local &amp; automated verification. The backend verifies status and issues QR passes idempotently.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    disabled={processing}
                    onClick={() => handleMockPayment('SUCCEEDED')}
                  >
                    <ShieldCheck size={17} />
                    <span>
                      {processing
                        ? 'Verifying on Backend...'
                        : `Complete Mock Payment (${formatCurrency(order.totalAmount)})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={processing}
                    onClick={() => handleMockPayment('FAILED')}
                  >
                    <AlertTriangle size={14} />
                    <span>Simulate Declined Payment</span>
                  </button>
                </div>
              </div>

              <div className="tier-card" style={{ opacity: 0.78 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.92rem' }}>Bakong KHQR (Planned Integration)</strong>
                  <span className="badge">NOT CONFIGURED</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  KHQR provider interface is prepared on the backend and requires NBC Bakong merchant credentials before activation.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                disabled={processing || cancelling}
                onClick={() => setConfirmCancel(true)}
              >
                <XCircle size={15} />
                <span>Cancel Reservation &amp; Release Seats</span>
              </button>
            </>
          ) : order.status === 'PAID' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/my-tickets" className="btn btn-primary btn-lg">
                <QrCode size={17} />
                <span>Open My Ticket Wallet</span>
              </Link>
              <Link to="/events" className="btn btn-secondary">
                Browse More Events
              </Link>
            </div>
          ) : (
            <Link to="/events" className="btn btn-primary">
              Browse Available Events
            </Link>
          )}
        </aside>
      </div>

      {order.status === 'PAID' && order.tickets && order.tickets.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <h2 className="page-title" style={{ fontSize: '1.4rem', marginBottom: 16 }}>
            Issued Digital QR Passes ({order.tickets.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {order.tickets.map((ticket) => (
              <TicketPassCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      )}

      <ConfirmModal
        open={confirmCancel}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this pending order and release your reserved seats?"
        confirmLabel="Cancel Order"
        busy={cancelling}
        onConfirm={handleCancelOrder}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
