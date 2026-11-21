import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  QrCode,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { ApiError } from '../services/api';
import { ticketsService } from '../services/tickets.service';
import type { EventItem, TicketDetail } from '../types/api';
import { formatDateTime } from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { StatusBadge } from '../components/StatusBadge';
import { TicketPassCard } from '../components/TicketPassCard';
import { PageHeader } from '../components/common/PageHeader';
import { CameraScanner } from '../components/scanner/CameraScanner';

interface ScanHistoryEntry {
  id: string;
  ticketCode: string;
  outcome: 'VALIDATED' | 'CONFLICT' | 'ERROR';
  message: string;
  scannedAt: string;
}

export function ScannerPage() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';

  const [authorizedEvents, setAuthorizedEvents] = useState<
    Array<Pick<EventItem, 'id' | 'title' | 'venue' | 'status'>>
  >([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [ticketCode, setTicketCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [resultState, setResultState] = useState<{
    kind: 'success' | 'conflict' | 'error';
    title: string;
    message: string;
    ticket?: TicketDetail;
  } | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  useEffect(() => {
    if (initialCode) {
      setTicketCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    ticketsService
      .getScannerEvents()
      .then((evs) => {
        setAuthorizedEvents(evs);
        if (evs.length === 1) {
          setSelectedEventId(evs[0].id);
        }
      })
      .catch((err) => {
        setEventsError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load authorized gate events.',
        );
      });
  }, []);

  async function runValidation(rawCode: string) {
    const cleaned = rawCode.trim();
    if (!cleaned || submitting) return;

    setTicketCode(cleaned);
    setSubmitting(true);

    try {
      const res = await ticketsService.validate(
        cleaned,
        selectedEventId || undefined,
      );
      setResultState({
        kind: 'success',
        title: 'ENTRY APPROVED — TICKET CHECKED IN',
        message: `${res.message} · Check-in recorded at ${formatDateTime(res.ticket.usedAt)}`,
        ticket: res.ticket,
      });
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          ticketCode: res.ticket.ticketCode,
          outcome: 'VALIDATED',
          message: res.message,
          scannedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const isConflict = apiErr?.statusCode === 409;
      const message = apiErr?.message || 'Ticket validation failed.';
      setResultState({
        kind: isConflict ? 'conflict' : 'error',
        title: isConflict
          ? 'DUPLICATE ENTRY BLOCKED (ALREADY USED)'
          : 'TICKET REJECTED / INVALID',
        message,
      });
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          ticketCode: cleaned,
          outcome: isConflict ? 'CONFLICT' : 'ERROR',
          message,
          scannedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runValidation(ticketCode);
  }

  return (
    <div>
      <PageHeader
        title="Gate Check-In Scanner"
        subtitle="Verify QR credentials against the backend database in real time and block duplicate entry."
      />

      {eventsError && <AlertBanner variant="warning" message={eventsError} />}

      {authorizedEvents.length === 0 && !eventsError && (
        <AlertBanner
          variant="info"
          title="No Assigned Events Found"
          message="You do not currently have any events assigned to your gate account. Ask an organizer to assign your email under Event Settings."
        />
      )}

      <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
        <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <QrCode size={20} color="var(--brand-primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Gate Scan Terminal</h2>
          </div>

          <div className="input-group">
            <label htmlFor="gate-event-select" className="input-label">
              Active Gate Event Scope
            </label>
            <select
              id="gate-event-select"
              className="select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">All Authorized Events ({authorizedEvents.length})</option>
              {authorizedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {ev.venue}
                </option>
              ))}
            </select>
          </div>

          <CameraScanner onDetected={runValidation} disabled={submitting} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="input-group">
              <label htmlFor="scanner-code-input" className="input-label">
                Manual Ticket Code or Scanned QR Payload
              </label>
              <input
                id="scanner-code-input"
                type="text"
                className="input"
                placeholder="Paste ETK1... QR payload or enter TKT-..."
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={submitting || !ticketCode.trim()}
                style={{ flex: 1 }}
              >
                <CheckCircle2 size={17} />
                <span>{submitting ? 'Verifying with Server...' : 'Validate & Check In'}</span>
              </button>

              {ticketCode.trim() && (
                <Link
                  to={`/tickets/${encodeURIComponent(ticketCode.trim())}`}
                  className="btn btn-secondary btn-lg"
                >
                  Inspect
                </Link>
              )}
            </div>
          </form>
        </div>

        <div className="card card-padded">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Session Check-In Log</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Local UI log only — backend database enforces authoritative validity.
              </p>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setHistory([])}
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="chart-empty">No tickets scanned in this browser session yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span className="code-chip" style={{ fontSize: '0.78rem' }}>
                      {item.ticketCode}
                    </span>
                    <StatusBadge
                      status={
                        item.outcome === 'VALIDATED'
                          ? 'VALID'
                          : item.outcome === 'CONFLICT'
                            ? 'USED'
                            : 'CANCELLED'
                      }
                    />
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {item.message}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatDateTime(item.scannedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {resultState && (
        <div>
          <div
            className={`alert ${
              resultState.kind === 'success'
                ? 'alert-success'
                : resultState.kind === 'conflict'
                  ? 'alert-warning'
                  : 'alert-error'
            }`}
            role="status"
          >
            {resultState.kind === 'success' ? (
              <CheckCircle2 size={22} style={{ flexShrink: 0, marginTop: 2 }} />
            ) : (
              <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.06rem', marginBottom: 4 }}>
                {resultState.title}
              </div>
              <div style={{ fontSize: '0.94rem' }}>{resultState.message}</div>
            </div>
          </div>

          {resultState.ticket && (
            <TicketPassCard ticket={resultState.ticket} showActions={false} />
          )}
        </div>
      )}
    </div>
  );
}
