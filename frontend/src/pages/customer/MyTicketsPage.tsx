import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Ticket } from 'lucide-react';
import { useGSAP } from '../../animations/gsap';
import { runStaggerScrollReveal } from '../../animations/scroll-reveals';
import { ApiError } from '../../services/api';
import { ticketsService } from '../../services/tickets.service';
import type { TicketDetail } from '../../types/api';
import { AlertBanner } from '../../components/AlertBanner';
import { EmptyState } from '../../components/EmptyState';
import { TicketPassCard } from '../../components/TicketPassCard';
import { PageHeader } from '../../components/common/PageHeader';
import { Skeleton } from '../../components/common/Skeleton';

export function MyTicketsPage() {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [tickets, setTickets] = useState<TicketDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await ticketsService.getMyTickets();
        if (active) {
          setTickets(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load your tickets.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const visibleTickets = useMemo(() => {
    if (statusFilter === 'ALL') return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  useGSAP(
    () => {
      if (!loading && visibleTickets.length > 0) {
        runStaggerScrollReveal('.ticket-pass', listRef.current);
      }
    },
    { dependencies: [loading, visibleTickets], scope: listRef },
  );

  return (
    <div>
      <PageHeader
        title="My Ticket Wallet"
        subtitle="Your digital boarding passes—ready for full-screen gate presentation, SVG download, or printing."
        actions={
          <div className="no-print" style={{ display: 'flex', gap: 10 }}>
            <select
              className="select"
              aria-label="Filter tickets by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Passes ({tickets.length})</option>
              <option value="VALID">VALID</option>
              <option value="USED">USED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <Link to="/events" className="btn btn-primary">
              <CalendarDays size={16} />
              <span>Explore Events</span>
            </Link>
          </div>
        }
      />

      {error && <AlertBanner variant="error" title="Could not load tickets" message={error} />}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton height={220} />
          <Skeleton height={220} />
        </div>
      ) : visibleTickets.length === 0 ? (
        <EmptyState
          icon={<Ticket size={26} />}
          title={tickets.length === 0 ? 'No tickets issued yet' : 'No matching tickets'}
          description={
            tickets.length === 0
              ? 'Purchase tickets from any published event to receive your digital QR passes here.'
              : 'Adjust the status filter to view your other tickets.'
          }
          action={
            <Link to="/events" className="btn btn-primary">
              Discover Events
            </Link>
          }
        />
      ) : (
        <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {visibleTickets.map((ticket) => (
            <TicketPassCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
