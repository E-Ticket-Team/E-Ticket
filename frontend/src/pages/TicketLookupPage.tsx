import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Ticket } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { TicketDetail } from '../types/api';
import { SAMPLE_TICKET_CODE } from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { TicketPassCard } from '../components/TicketPassCard';

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
        const data = await api.getTicketByCode(ticketCode);
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
      <div className="section-header">
        <div>
          <h1 className="page-title">Digital Ticket Lookup</h1>
          <p className="page-subtitle">
            Enter a ticket code to view its live status, event details, and scannable QR pass.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input"
            placeholder={`Enter ticket code (e.g. ${SAMPLE_TICKET_CODE})`}
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Find Ticket'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(`/tickets/${encodeURIComponent(SAMPLE_TICKET_CODE)}`)}
        >
          Try Sample ({SAMPLE_TICKET_CODE})
        </button>
      </form>

      {error && <AlertBanner variant="error" title="Ticket Not Found" message={error} />}

      {loading ? (
        <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Retrieving ticket pass...
        </div>
      ) : ticket ? (
        <TicketPassCard ticket={ticket} />
      ) : !error ? (
        <EmptyState
          icon={<Ticket size={24} />}
          title="Look up any issued ticket"
          description={`Enter a ticket code above or open the seeded sample pass (${SAMPLE_TICKET_CODE}) to preview the digital QR ticket.`}
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/tickets/${encodeURIComponent(SAMPLE_TICKET_CODE)}`)}
            >
              Load Sample Pass
            </button>
          }
        />
      ) : null}
    </div>
  );
}
