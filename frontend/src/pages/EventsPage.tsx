import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useGSAP } from '../animations/gsap';
import { runStaggerScrollReveal } from '../animations/scroll-reveals';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { eventsService } from '../services/events.service';
import type { EventItem, PaginationMeta } from '../types/api';
import { AlertBanner } from '../components/AlertBanner';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { EventCardSkeletonGrid } from '../components/common/Skeleton';

export function EventsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 9,
    totalPages: 1,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(true);

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? 'ALL';
  const status = searchParams.get('status') ?? 'PUBLISHED';
  const startAfter = searchParams.get('startAfter') ?? '';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  useEffect(() => {
    eventsService
      .getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await eventsService.list({
          page,
          limit: 9,
          search,
          category,
          status,
          startAfter: startAfter ? new Date(startAfter).toISOString() : undefined,
          sortBy: 'startDate',
          sortOrder,
        });
        if (active) {
          setEvents(res.items);
          setMeta(res.meta);
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
  }, [page, search, category, status, startAfter, sortOrder]);

  useGSAP(
    () => {
      if (!loading && events.length > 0) {
        runStaggerScrollReveal('.event-card', gridRef.current);
      }
    },
    { dependencies: [loading, events], scope: gridRef },
  );

  function updateFilter(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v || v === 'ALL') next.delete(k);
      else next.set(k, v);
    });
    if (!('page' in patch)) {
      next.set('page', '1');
    }
    setSearchParams(next);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    updateFilter({ search: searchInput.trim() || null });
  }

  function resetFilters() {
    setSearchInput('');
    setSearchParams({});
  }

  const canCreateEvent = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  return (
    <div>
      <PageHeader
        title="Events Directory"
        subtitle="Explore upcoming concerts, conferences, workshops, and signature experiences."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFiltersVisible((v) => !v)}
            >
              <SlidersHorizontal size={16} />
              <span>{filtersVisible ? 'Hide Filters' : 'Filters'}</span>
            </button>
            {canCreateEvent && (
              <Link to="/organizer/events/new" className="btn btn-primary">
                <Plus size={17} />
                <span>Create Event</span>
              </Link>
            )}
          </>
        }
      />

      {filtersVisible && (
        <form onSubmit={handleSearchSubmit} className="filter-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input"
              placeholder="Search by event title, venue, city, or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search events"
            />
          </div>

          <div style={{ minWidth: 170 }}>
            <select
              className="select"
              aria-label="Filter by category"
              value={category}
              onChange={(e) => updateFilter({ category: e.target.value })}
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 155 }}>
            <select
              className="select"
              aria-label="Filter by status"
              value={status}
              onChange={(e) => updateFilter({ status: e.target.value })}
            >
              <option value="PUBLISHED">Upcoming / Live</option>
              <option value="COMPLETED">Past / Completed</option>
            </select>
          </div>

          <div style={{ minWidth: 155 }}>
            <input
              type="date"
              className="input"
              aria-label="Starting on or after"
              value={startAfter}
              onChange={(e) => updateFilter({ startAfter: e.target.value || null })}
            />
          </div>

          <div style={{ minWidth: 160 }}>
            <select
              className="select"
              aria-label="Sort by date"
              value={sortOrder}
              onChange={(e) => updateFilter({ sortOrder: e.target.value })}
            >
              <option value="asc">Soonest First</option>
              <option value="desc">Latest First</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Search
          </button>

          {(search ||
            category !== 'ALL' ||
            status !== 'PUBLISHED' ||
            startAfter ||
            sortOrder !== 'asc') && (
            <button type="button" className="btn btn-secondary" onClick={resetFilters}>
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          )}
        </form>
      )}

      {error && <AlertBanner variant="error" title="Could not load events" message={error} />}

      {loading ? (
        <EventCardSkeletonGrid count={6} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="No matching events"
          description="Try clearing your search query or adjusting the category and date filters."
          action={
            <button type="button" className="btn btn-secondary" onClick={resetFilters}>
              Clear Filters
            </button>
          }
        />
      ) : (
        <div ref={gridRef}>
          <div className="grid-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          <Pagination
            meta={meta}
            onPageChange={(nextPage) => updateFilter({ page: String(nextPage) })}
          />
        </div>
      )}
    </div>
  );
}
