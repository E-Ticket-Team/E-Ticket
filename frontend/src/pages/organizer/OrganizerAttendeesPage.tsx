import { useCallback, useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { ApiError } from '../../services/api';
import { eventsService } from '../../services/events.service';
import { organizerService } from '../../services/organizer.service';
import type { EventItem, TicketDetail, TicketStatus } from '../../types/api';
import { formatDateTime, formatPersonName } from '../../utils/format';
import { AlertBanner } from '../../components/AlertBanner';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { PageHeader } from '../../components/common/PageHeader';
import { Skeleton } from '../../components/common/Skeleton';
import { OrganizerSidebar } from '../../components/dashboard/OrganizerSidebar';

export function OrganizerAttendeesPage({
  checkInsOnly = false,
}: {
  checkInsOnly?: boolean;
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [tickets, setTickets] = useState<TicketDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>(
    checkInsOnly ? 'USED' : 'ALL',
  );

  useEffect(() => {
    setStatusFilter(checkInsOnly ? 'USED' : 'ALL');
  }, [checkInsOnly]);

  useEffect(() => {
    eventsService
      .list({ mine: true, page: 1, limit: 100 })
      .then((res) => {
        setEvents(res.items);
        if (res.items.length > 0) {
          setSelectedEventId(res.items[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Unable to load events.');
        setLoading(false);
      });
  }, []);

  const loadAttendees = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      setLoading(true);
      const data = checkInsOnly
        ? await organizerService.getEventCheckIns(selectedEventId)
        : await organizerService.getEventAttendees(selectedEventId, {
            search,
            ticketTypeId: tierFilter,
            status: statusFilter,
          });
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load attendee records.');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, checkInsOnly, search, tierFilter, statusFilter]);

  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const tiers = currentEvent?.ticketTypes ?? [];

  return (
    <div className="dashboard-shell">
      <OrganizerSidebar />

      <div>
        <PageHeader
          title={checkInsOnly ? 'Gate Check-In Log' : 'Attendee Management'}
          subtitle={
            checkInsOnly
              ? 'Verified ticket entries with check-in timestamps and gate staff audit.'
              : 'Inspect issued tickets, search attendees, and track check-in status per event.'
          }
        />

        {error && <AlertBanner variant="error" message={error} />}

        <div className="filter-bar">
          <div style={{ minWidth: 220, flex: 1 }}>
            <select
              className="select"
              aria-label="Select event"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setTierFilter('ALL');
              }}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          {!checkInsOnly && (
            <>
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="input"
                  placeholder="Search attendee name, email, or ticket code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div style={{ minWidth: 165 }}>
                <select
                  className="select"
                  aria-label="Filter by ticket tier"
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                >
                  <option value="ALL">All Tiers</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 145 }}>
                <select
                  className="select"
                  aria-label="Filter by ticket status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as TicketStatus | 'ALL')
                  }
                >
                  <option value="ALL">All Statuses</option>
                  <option value="VALID">VALID</option>
                  <option value="USED">USED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </>
          )}
        </div>

        {loading ? (
          <Skeleton height={220} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title="No events yet"
            description="Create an event first to manage attendees and check-ins."
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title={checkInsOnly ? 'No check-ins recorded yet' : 'No attendees match filters'}
            description={
              checkInsOnly
                ? 'Checked-in tickets will appear here once scanned at the venue gate.'
                : 'No tickets match your current search or filter criteria.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket Code</th>
                  <th>Attendee</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Purchased</th>
                  <th>Checked In</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="code-chip" style={{ fontSize: '0.78rem' }}>
                        {t.ticketCode}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {formatPersonName(t.order?.user)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {t.order?.user?.email}
                      </div>
                    </td>
                    <td>{t.ticketType.name}</td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {formatDateTime(t.createdAt)}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {t.usedAt ? (
                        <div>
                          <div>{formatDateTime(t.usedAt)}</div>
                          {t.checkedInBy && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              By {t.checkedInBy.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
