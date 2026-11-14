import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, MapPin, QrCode, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { TicketDetail } from '../types/api';
import { formatCurrency, formatDateRange, formatDateTime, formatPersonName } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface TicketPassCardProps {
  ticket: TicketDetail;
  showValidateButton?: boolean;
}

export function TicketPassCard({ ticket, showValidateButton = true }: TicketPassCardProps) {
  const event = ticket.ticketType.event;
  const attendee = ticket.order?.user;

  return (
    <div className="ticket-pass">
      <div className="ticket-pass-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <span className="badge badge-info">{ticket.ticketType.name}</span>
          <StatusBadge status={ticket.status} />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>
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
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Tier Price
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>
              {formatCurrency(ticket.ticketType.price)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Order Payment
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: 2 }}>
              {ticket.order?.paymentReference || 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Issued At
            </div>
            <div style={{ fontSize: '0.88rem', marginTop: 2 }}>
              {formatDateTime(ticket.createdAt)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Checked In At
            </div>
            <div style={{ fontSize: '0.88rem', marginTop: 2 }}>
              {ticket.usedAt ? formatDateTime(ticket.usedAt) : 'Not checked in yet'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
          <Link to={`/events/${event.id}`} className="btn btn-secondary btn-sm">
            View Event Details
          </Link>
          {showValidateButton && ticket.status === 'VALID' && (
            <Link
              to={`/scanner?code=${encodeURIComponent(ticket.ticketCode)}`}
              className="btn btn-primary btn-sm"
            >
              <CheckCircle2 size={15} />
              <span>Check In at Scanner</span>
            </Link>
          )}
        </div>
      </div>

      <div className="ticket-pass-stub">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          <QrCode size={15} />
          <span>DIGITAL ENTRY PASS</span>
        </div>

        <div className="qr-frame">
          <QRCodeSVG
            value={ticket.ticketCode}
            size={152}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
          />
        </div>

        <div className="code-chip">{ticket.ticketCode}</div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 220 }}>
          Present this QR code or ticket code at the venue gate for single-entry verification.
        </p>
      </div>
    </div>
  );
}
