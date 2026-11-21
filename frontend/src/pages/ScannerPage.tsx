import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  CalendarPlus,
  CheckCircle2,
  LayoutDashboard,
  QrCode,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { animatePanelEnter } from '../animations/transitions';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { ticketsService } from '../services/tickets.service';
import type { EventItem, TicketDetail } from '../types/api';
import { formatDateTime } from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { TicketPassCard } from '../components/TicketPassCard';
import { DashboardShellLayout } from '../components/dashboard/DashboardShellLayout';
import { OrganizerWorkspaceLayout } from '../components/dashboard/OrganizerWorkspaceLayout';
import { CameraScanner } from '../components/scanner/CameraScanner';

interface ScanHistoryEntry {
  id: string;
  ticketCode: string;
  outcome: 'VALIDATED' | 'CONFLICT' | 'ERROR';
  message: string;
  scannedAt: string;
}

export function ScannerPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';
  const initialEventId = searchParams.get('eventId') ?? '';
  const resultRef = useRef<HTMLDivElement | null>(null);

  const [authorizedEvents, setAuthorizedEvents] = useState<
    Array<Pick<EventItem, 'id' | 'title' | 'venue' | 'status'>>
  >([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [eventsLoaded, setEventsLoaded] = useState(false);
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
    if (initialCode) setTicketCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (initialEventId) setSelectedEventId(initialEventId);
  }, [initialEventId]);

  useEffect(() => {
    ticketsService
      .getScannerEvents()
      .then((evs) => {
        setAuthorizedEvents(evs);
        if (initialEventId && evs.some((ev) => ev.id === initialEventId)) {
          setSelectedEventId(initialEventId);
        } else if (evs.length === 1) {
          setSelectedEventId(evs[0].id);
        }
      })
      .catch((err) => {
        setEventsError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load authorized gate events.',
        );
      })
      .finally(() => {
        setEventsLoaded(true);
      });
  }, [initialEventId]);

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
        title: 'ENTRY APPROVED — TICKET VALID',
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
      window.setTimeout(() => animatePanelEnter(resultRef.current), 10);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const isConflict = apiErr?.statusCode === 409;
      const message = apiErr?.message || 'Ticket validation failed.';
      setResultState({
        kind: isConflict ? 'conflict' : 'error',
        title: isConflict
          ? 'ALREADY USED — DUPLICATE ENTRY BLOCKED'
          : 'REJECTED — INVALID OR CANCELLED TICKET',
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
      window.setTimeout(() => animatePanelEnter(resultRef.current), 10);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runValidation(ticketCode);
  }

  const isOrganizer = user?.role === 'ORGANIZER';
  const isAdmin = user?.role === 'ADMIN';

  const body = (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-[#E3EBE5] rounded-2xl px-5 py-4 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#052E25]">
            {isAdmin
              ? 'Platform-Wide Gate Validation Terminal'
              : isOrganizer
                ? `Organization Gate Terminal — Scoped to Your Created Events (${authorizedEvents.length})`
                : `Assigned Gate Check-In Scope (${authorizedEvents.length} Event${authorizedEvents.length === 1 ? '' : 's'})`}
          </h2>
          <p className="text-xs text-[#64766D] mt-0.5">
            Camera QR scanning and manual ticket validation backed by atomic single-entry PostgreSQL locks.
          </p>
        </div>
        {(isOrganizer || isAdmin) && (
          <Link to="/organizer/events/new" className="btn btn-secondary btn-sm">
            <CalendarPlus size={14} />
            <span>Create Event</span>
          </Link>
        )}
      </div>

      {eventsError && <AlertBanner variant="warning" message={eventsError} />}

      {eventsLoaded && authorizedEvents.length === 0 && !eventsError ? (
        <EmptyState
          icon={<QrCode size={26} />}
          title={
            isOrganizer
              ? 'Create an Event to Start Gate Scanning'
              : 'No Events Assigned for Gate Check-In'
          }
          description={
            isOrganizer
              ? 'Organizations can scan and validate tickets exclusively for events they created.'
              : 'Ask your Organization Admin to assign your staff account to one of their created events.'
          }
          action={
            isOrganizer || isAdmin ? (
              <Link to="/organizer/events/new" className="btn btn-primary">
                <CalendarPlus size={16} />
                <span>Create Your First Event</span>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {resultState && (
            <div ref={resultRef}>
              <div
                className={`alert ${
                  resultState.kind === 'success'
                    ? 'alert-success'
                    : resultState.kind === 'conflict'
                      ? 'alert-warning'
                      : 'alert-error'
                }`}
                style={{ padding: '20px 22px', borderWidth: 2 }}
                role="status"
              >
                {resultState.kind === 'success' ? (
                  <CheckCircle2 size={26} style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <ShieldAlert size={26} style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>
                    {resultState.title}
                  </div>
                  <div style={{ fontSize: '0.94rem' }}>{resultState.message}</div>
                </div>
              </div>

              {resultState.ticket && (
                <div className="mt-4">
                  <TicketPassCard ticket={resultState.ticket} showActions={false} />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 bg-white border border-[#E3EBE5] rounded-2xl p-6 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#E7F5EE] text-[#087F5B] flex items-center justify-center">
                  <QrCode size={17} />
                </span>
                <h2 className="text-base font-bold text-[#052E25]">
                  Scan or Enter Ticket Code
                </h2>
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
                  <option value="">
                    {isOrganizer
                      ? `All My Created Events (${authorizedEvents.length})`
                      : `All Authorized Events (${authorizedEvents.length})`}
                  </option>
                  {authorizedEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} — {ev.venue}
                    </option>
                  ))}
                </select>
              </div>

              <CameraScanner onDetected={runValidation} disabled={submitting} />

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="input-group">
                  <label htmlFor="scanner-code-input" className="input-label">
                    Manual Ticket Code or Scanned QR Payload
                  </label>
                  <input
                    id="scanner-code-input"
                    type="text"
                    className="input"
                    style={{ height: 48, fontSize: '1rem' }}
                    placeholder="Paste ETK1... QR payload or enter TKT-..."
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2.5 flex-wrap">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg flex-1"
                    disabled={submitting || !ticketCode.trim()}
                  >
                    <CheckCircle2 size={18} />
                    <span>{submitting ? 'Verifying...' : 'Validate & Check In'}</span>
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

            <div className="lg:col-span-5 bg-white border border-[#E3EBE5] rounded-2xl p-6 shadow-[0_2px_10px_rgba(5,46,37,0.04)]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#052E25]">
                    Session Scan History
                  </h2>
                  <p className="text-xs text-[#64766D] mt-0.5">
                    Live verification log for this gate session.
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
                <div className="chart-empty">No tickets scanned in this session yet.</div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#FAFCFA] border border-[#E3EBE5] rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="code-chip text-xs">{item.ticketCode}</span>
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
                      <div className="text-xs text-[#53665E]">{item.message}</div>
                      <div className="text-[11px] text-[#82948B] mt-1 tabular-nums">
                        {formatDateTime(item.scannedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  function wrapInWorkspace(content: ReactNode) {
    if (isOrganizer) {
      return (
        <OrganizerWorkspaceLayout pageTitle="Gate Check-In Scanner">
          {content}
        </OrganizerWorkspaceLayout>
      );
    }

    if (isAdmin) {
      return (
        <DashboardShellLayout
          pageTitle="Gate Check-In Scanner"
          workspaceLabel="Admin Console"
          roleTitle="Super Admin"
          navItems={[
            {
              id: 'admin',
              label: 'Admin Dashboard',
              to: '/admin',
              icon: <ShieldCheck size={17} />,
            },
            {
              id: 'organizer',
              label: 'Organizer Studio',
              to: '/organizer',
              icon: <Building2 size={17} />,
            },
            {
              id: 'scanner',
              label: 'Gate Scanner',
              to: '/organizer/scanner',
              active: true,
              icon: <ScanLine size={17} />,
            },
          ]}
        >
          {content}
        </DashboardShellLayout>
      );
    }

    return (
      <DashboardShellLayout
        pageTitle="Gate Check-In Terminal"
        workspaceLabel="Gate Operations"
        roleTitle="Assigned Gate Staff"
        navItems={[
          {
            id: 'scanner',
            label: 'Gate Scanner',
            to: '/scanner',
            active: true,
            icon: <LayoutDashboard size={17} />,
          },
        ]}
      >
        {content}
      </DashboardShellLayout>
    );
  }

  return wrapInWorkspace(body);
}
