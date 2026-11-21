import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Download,
  MapPin,
  Printer,
  QrCode,
  User,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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

  return (
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

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 12 }}>
          {event.title}
        </h2>

        <div className="event-meta" style={{ marginBottom: 20 }}>
          <div className="event-meta-row">
            <Calendar size={16} />
            <span>{formatDateRange(event.startDate, event.endDate)}</span>
          </div>
          <div className="event-meta-row">
            <MapPin size={16} />
            <span>
              {event.venue}
              {event.location ? ` · ${event.location}` : ''}
            </span>
          </div>
          {attendee && (
            <div className="event-meta-row">
              <User size={16} />
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
            borderTop: '1px solid var(--border-color)',
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
              {ticket.order?.paymentReference || 'Confirmed'}
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
          <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
            <Link to={`/events/${event.id}`} className="btn btn-secondary btn-sm">
              View Event
            </Link>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadQr}>
              <Download size={14} />
              <span>Download QR</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              <Printer size={14} />
              <span>Print Pass</span>
            </button>
            {showValidateButton && ticket.status === 'VALID' && (
              <Link
                to={`/scanner?code=${encodeURIComponent(qrValue)}`}
                className="btn btn-primary btn-sm"
              >
                <CheckCircle2 size={15} />
                <span>Check In at Scanner</span>
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
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
          }}
        >
          <QrCode size={15} />
          <span>DIGITAL ENTRY PASS</span>
        </div>

        <div className="qr-frame" ref={qrContainerRef}>
          <QRCodeSVG
            value={qrValue}
            size={156}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
          />
        </div>

        <div className="code-chip">{ticket.ticketCode}</div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 220 }}>
          {ticket.status === 'VALID'
            ? 'Present this QR code at the venue entrance for single-entry verification.'
            : ticket.status === 'USED'
              ? 'This pass has already been redeemed for entry.'
              : 'This pass has been cancelled and is no longer valid.'}
        </p>
      </div>
    </div>
  );
}
