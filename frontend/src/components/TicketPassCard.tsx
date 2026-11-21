import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Maximize2,
  MapPin,
  Printer,
  QrCode,
  User,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { animatePanelEnter } from '../animations/transitions';
import type { TicketDetail } from '../types/api';
import {
  formatCurrency,
  formatDateRange,
  formatDateTime,
  formatPersonName,
} from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface TicketPassCardProps {
  ticket: TicketDetail;
  showValidateButton?: boolean;
  showActions?: boolean;
}

export function TicketPassCard({
  ticket,
  showValidateButton = false,
  showActions = true,
}: TicketPassCardProps) {
  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const event = ticket.ticketType.event;
  const attendee = ticket.order?.user;
  const qrValue = ticket.qrPayload || ticket.ticketCode;

  function handleDownloadQr() {
    const svgEl = qrContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticket.ticketCode}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(ticket.ticketCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API fallback ignored cleanly
    }
  }

  function openPassModal() {
    setModalOpen(true);
    window.setTimeout(() => animatePanelEnter(modalPanelRef.current), 10);
  }

  return (
    <>
      <div className="ticket-pass">
        <div className="ticket-pass-main">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <span className="badge badge-info">{ticket.ticketType.name}</span>
            <StatusBadge status={ticket.status} />
          </div>

          <h2 style={{ fontSize: 'clamp(1.25rem, 2vw, 1.55rem)', fontWeight: 800, marginBottom: 12 }}>
            {event.title}
          </h2>

          <div className="event-meta" style={{ marginBottom: 20 }}>
            <div className="event-meta-row">
              <Calendar size={16} color="var(--color-primary)" />
              <span>{formatDateRange(event.startDate, event.endDate)} (ICT)</span>
            </div>
            <div className="event-meta-row">
              <MapPin size={16} color="var(--color-primary)" />
              <span>
                {event.venue}
                {event.location ? ` · ${event.location}` : ''}
              </span>
            </div>
            {attendee && (
              <div className="event-meta-row">
                <User size={16} color="var(--color-primary)" />
                <span>
                  {formatPersonName(attendee)} ({attendee.email})
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
              paddingTop: 16,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div>
              <div className="meta-caption">Tier Price</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>
                {formatCurrency(ticket.ticketType.price)}
              </div>
            </div>

            <div>
              <div className="meta-caption">Payment Reference</div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginTop: 2 }}>
                {ticket.order?.paymentReference || 'Verified'}
              </div>
            </div>

            <div>
              <div className="meta-caption">Issued At</div>
              <div style={{ fontSize: '0.88rem', marginTop: 2 }}>
                {formatDateTime(ticket.createdAt)}
              </div>
            </div>

            <div>
              <div className="meta-caption">Checked In At</div>
              <div style={{ fontSize: '0.88rem', marginTop: 2 }}>
                {ticket.usedAt ? formatDateTime(ticket.usedAt) : 'Not checked in yet'}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={openPassModal}>
                <Maximize2 size={14} />
                <span>View Pass</span>
              </button>
              <Link to={`/events/${event.id}`} className="btn btn-secondary btn-sm">
                View Event
              </Link>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadQr}>
                <Download size={14} />
                <span>Download QR</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                <Printer size={14} />
                <span>Print</span>
              </button>
              {showValidateButton && ticket.status === 'VALID' && (
                <Link
                  to={`/scanner?code=${encodeURIComponent(qrValue)}`}
                  className="btn btn-forest btn-sm"
                >
                  <CheckCircle2 size={15} />
                  <span>Check In</span>
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="ticket-pass-stub">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.76rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--color-forest)',
            }}
          >
            <QrCode size={15} color="var(--color-primary)" />
            <span>DIGITAL ENTRY PASS</span>
          </div>

          <div className="qr-frame" ref={qrContainerRef}>
            <QRCodeSVG
              value={qrValue}
              size={156}
              bgColor="#ffffff"
              fgColor="#052E25"
              level="M"
            />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="code-chip">{ticket.ticketCode}</span>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              style={{ width: 30, height: 30 }}
              aria-label="Copy ticket code"
              onClick={handleCopyCode}
            >
              {copied ? <Check size={14} color="var(--color-primary)" /> : <Copy size={14} />}
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: 220 }}>
            {ticket.status === 'VALID'
              ? 'Present this QR code at the venue gate for single-entry verification.'
              : ticket.status === 'USED'
                ? 'This pass has already been redeemed for entry.'
                : 'This pass has been cancelled and is no longer valid.'}
          </p>
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen digital ticket pass"
          onClick={() => setModalOpen(false)}
        >
          <div
            ref={modalPanelRef}
            className="modal-panel"
            style={{ textAlign: 'center', maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <StatusBadge status={ticket.status} />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Close ticket modal"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <h3 className="card-title" style={{ marginBottom: 4 }}>
              {event.title}
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', marginBottom: 18 }}>
              {ticket.ticketType.name} · {event.venue}
            </p>

            <div className="qr-frame" style={{ marginBottom: 16 }}>
              <QRCodeSVG
                value={qrValue}
                size={220}
                bgColor="#ffffff"
                fgColor="#052E25"
                level="M"
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <span className="code-chip">{ticket.ticketCode}</span>
            </div>

            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setModalOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
