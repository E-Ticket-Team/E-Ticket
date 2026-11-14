import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Plus, RotateCcw, Search } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { EventItem } from '../types/api';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';

const STATUS_OPTIONS = ['ALL', 'PUBLISHED', 'DRAFT', 'COMPLETED', 'CANCELLED'] as const;

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      try {
        setLoading(true);
        const data = await api.listEvents({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        });
        if (active) {
          setEvents(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load events');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchEvents();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      if (ev.category?.trim()) set.add(ev.category.trim());
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (categoryFilter !== 'ALL' && (ev.category ?? '').trim() !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        (ev.location ?? '').toLowerCase().includes(q) ||
        (ev.category ?? '').toLowerCase().includes(q) ||
        (ev.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [events, categoryFilter, search]);

  function resetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Events Directory</h1>
          <p className="page-subtitle">
            Browse concerts, conferences, workshops, and live shows across all venues.
          </p>
        </div>
        <Link to="/organizer/events/new" className="btn btn-primary">
          <Plus size={17} />
          <span>New Event</span>
        </Link>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Search by event title, venue, city, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ minWidth: 170 }}>
          <select
            className="select"
            aria-label="Filter by event status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All Statuses' : status}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 190 }}>
          <select
            className="select"
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {(search || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
          <button type="button" className="btn btn-secondary" onClick={resetFilters}>
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {error && <AlertBanner variant="error" title="Could not load events" message={error} />}

      {loading ? (
        <div className="card card-padded" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading events...
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="No matching events"
          description="Try clearing your search query or adjusting the status and category filters."
          action={
            <button type="button" className="btn btn-secondary" onClick={resetFilters}>
              Clear Filters
            </button>
          }
        />
      ) : (
        <div className="grid-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
