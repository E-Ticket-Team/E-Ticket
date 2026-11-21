import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Ticket } from 'lucide-react';
import { ApiError } from '../services/api';
import { ticketsService } from '../services/tickets.service';
import type { TicketDetail } from '../types/api';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { TicketPassCard } from '../components/TicketPassCard';
import { PageHeader } from '../components/common/PageHeader';

export function TicketLookupPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(code ?? '');
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputCode(code ?? '');
    if (!code) {
      setTicket(null);
      setError(null);
      return;
    }

    let active = true;
    async function fetchTicket(ticketCode: string) {
      try {
        setLoading(true);
        setError(null);
        const data = await ticketsService.getByCode(ticketCode);
        if (active) setTicket(data);
      } catch (err) {
        if (active) {
          setTicket(null);
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to retrieve ticket details.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchTicket(code);
    return () => {
      active = false;
    };
  }, [code]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputCode.trim();
    if (!trimmed) return;
    navigate(`/tickets/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div>
      <PageHeader
        title="Authorized Ticket Inspection"
        subtitle="Look up an issued ticket code (restricted to ticket owner, event organizer, assigned scanner, or admin)."
      />

      <form onSubmit={handleSubmit} className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Enter ticket code (e.g. TKT-2026-VIP-001)"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Find Ticket'}
        </button>
      </form>

      {error && <AlertBanner variant="error" title="Ticket Unavailable" message={error} />}

      {loading ? (
        <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Retrieving ticket pass...
        </div>
      ) : ticket ? (
        <TicketPassCard ticket={ticket} showValidateButton={false} />
      ) : !error ? (
        <EmptyState
          icon={<Ticket size={24} />}
          title="Enter a ticket code to inspect"
          description="Only authorized owners, organizers, and gate staff can inspect ticket details."
        />
      ) : null}
    </div>
  );
}
