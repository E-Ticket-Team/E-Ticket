import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { EventItem, OrderStatus, OrderSummary } from '@/types/api';
import {
  formatBuyerEmail,
  formatBuyerName,
  formatBuyerPhone,
  formatCurrency,
  formatDateTime,
} from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';

export interface BuyersListServerPagination {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (limit: number) => void;
  search: string;
  onSearchChange: (q: string) => void;
  statusFilter: OrderStatus | 'ALL';
  onStatusFilterChange: (status: OrderStatus | 'ALL') => void;
}

interface BuyersListCardProps {
  title?: string;
  subtitle?: string;
  orders: OrderSummary[];
  events?: EventItem[];
  loading?: boolean;
  defaultPageSize?: number;
  serverPagination?: BuyersListServerPagination;
  emptyMessage?: string;
}

const ORDER_STATUSES: Array<{ value: OrderStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REFUNDED', label: 'Refunded' },
];

function summarizeOrderTicket(order: OrderSummary): {
  primary: string;
  secondary: string;
} {
  const items = order.items ?? [];
  if (items.length === 0) {
    const qty = order._count?.tickets ?? 0;
    return {
      primary: qty > 0 ? `${qty} ${qty === 1 ? 'Ticket' : 'Tickets'}` : 'Ticket Order',
      secondary: 'Universal E-Ticket',
    };
  }

  const first = items[0];
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const tierName = first.ticketType?.name || 'Ticket';
  const eventTitle = first.ticketType?.event?.title || 'Event Pass';

  if (items.length === 1) {
    return {
      primary: `${tierName} × ${totalQty}`,
      secondary: eventTitle,
    };
  }

  return {
    primary: `${tierName} +${items.length - 1} (${totalQty} total)`,
    secondary: eventTitle,
  };
}

function getOrderReference(order: OrderSummary): string {
  if (order.paymentReference) return order.paymentReference;
  return `ORD-${order.id.slice(0, 8).toUpperCase()}`;
}

export function BuyersListCard({
  title = 'Buyers List',
  subtitle,
  orders,
  events = [],
  loading = false,
  defaultPageSize = 8,
  serverPagination,
  emptyMessage = 'No matching buyer orders found.',
}: BuyersListCardProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [localStatus, setLocalStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);

  const isServer = Boolean(serverPagination);
  const search = serverPagination ? serverPagination.search : localSearch;
  const statusFilter = serverPagination ? serverPagination.statusFilter : localStatus;
  const page = serverPagination ? serverPagination.page : localPage;
  const pageSize = serverPagination ? serverPagination.pageSize : localPageSize;

  const clientFilteredOrders = useMemo(() => {
    if (isServer) return orders;
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      if (eventFilter !== 'ALL') {
        const matchesEvent = (order.items ?? []).some(
          (item) => item.ticketType?.event?.id === eventFilter,
        );
        if (!matchesEvent) return false;
      }

      if (!q) return true;

      const haystack = [
        getOrderReference(order),
        formatBuyerName(order),
        formatBuyerEmail(order),
        formatBuyerPhone(order),
        ...(order.items ?? []).flatMap((i) => [
          i.ticketType?.name ?? '',
          i.ticketType?.event?.title ?? '',
        ]),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [isServer, orders, search, statusFilter, eventFilter]);

  const totalCount = serverPagination
    ? serverPagination.total
    : clientFilteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  const displayedOrders = useMemo(() => {
    if (isServer) return orders;
    const start = (safePage - 1) * pageSize;
    return clientFilteredOrders.slice(start, start + pageSize);
  }, [isServer, orders, clientFilteredOrders, safePage, pageSize]);

  function handleSearchChange(next: string) {
    if (serverPagination) {
      serverPagination.onSearchChange(next);
    } else {
      setLocalSearch(next);
      setLocalPage(1);
    }
  }

  function handleStatusChange(next: OrderStatus | 'ALL') {
    if (serverPagination) {
      serverPagination.onStatusFilterChange(next);
    } else {
      setLocalStatus(next);
      setLocalPage(1);
    }
  }

  function handlePageChange(next: number) {
    const bounded = Math.max(1, Math.min(next, totalPages));
    if (serverPagination) {
      serverPagination.onPageChange(bounded);
    } else {
      setLocalPage(bounded);
    }
  }

  function handlePageSizeChange(nextSize: number) {
    if (serverPagination?.onPageSizeChange) {
      serverPagination.onPageSizeChange(nextSize);
    } else if (!serverPagination) {
      setLocalPageSize(nextSize);
      setLocalPage(1);
    }
  }

  const pageNumbers: number[] = [];
  const startPage = Math.max(1, safePage - 2);
  const endPage = Math.min(totalPages, safePage + 2);
  for (let p = startPage; p <= endPage; p += 1) {
    pageNumbers.push(p);
  }

  return (
    <section
      aria-label={title}
      className="bg-white border border-[#E3EBE5] rounded-2xl shadow-[0_2px_10px_rgba(5,46,37,0.04)] overflow-hidden"
    >
      {/* Top Toolbar */}
      <div className="px-5 py-4 border-b border-[#E3EBE5] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#052E25]">{title}</h2>
          {subtitle && (
            <p className="text-xs text-[#64766D] mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[230px] flex-1 sm:flex-initial">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#82948B] pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search order ref, name, email, tier..."
              aria-label={`Search ${title}`}
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-medium text-[#102A21] placeholder:text-[#82948B] focus:outline-none focus:border-[#087F5B] focus:bg-white transition"
            />
          </div>

          <select
            aria-label="Filter orders by status"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus | 'ALL')}
            className="h-9 px-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-semibold text-[#102A21] focus:outline-none focus:border-[#087F5B] cursor-pointer"
          >
            {ORDER_STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {!isServer && events.length > 1 && (
            <select
              aria-label="Filter orders by event"
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setLocalPage(1);
              }}
              className="h-9 px-3 rounded-xl border border-[#C8D6CD] bg-[#FAFCFA] text-xs font-semibold text-[#102A21] focus:outline-none focus:border-[#087F5B] max-w-[210px] cursor-pointer"
            >
              <option value="ALL">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64766D]">
            Loading buyer records...
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#64766D]">
            {emptyMessage}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F6F8F5] border-b border-[#E3EBE5]">
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Order Ref
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Email
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Phone Number
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Ticket Type &amp; Event
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Date &amp; Time
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Amount
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedOrders.map((order) => {
                const ticketSummary = summarizeOrderTicket(order);
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[#E3EBE5] last:border-b-0 hover:bg-[#FAFCFA] transition-colors"
                  >
                    <td className="py-3.5 px-4 text-xs font-mono font-semibold text-[#052E25] whitespace-nowrap">
                      {getOrderReference(order)}
                    </td>
                    <td className="py-3.5 px-4 text-[13px] font-semibold text-[#102A21] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{formatBuyerName(order)}</span>
                        {!order.userId && (
                          <span className="px-1.5 py-0.5 rounded bg-[#E7F5EE] text-[#087F5B] text-[10px] font-bold uppercase">
                            Guest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-[#53665E] whitespace-nowrap">
                      {formatBuyerEmail(order)}
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-[#53665E] tabular-nums whitespace-nowrap">
                      {formatBuyerPhone(order)}
                    </td>
                    <td className="py-3.5 px-4 text-[13px] max-w-[240px]">
                      <div className="font-semibold text-[#102A21] truncate">
                        {ticketSummary.primary}
                      </div>
                      <div className="text-[11px] text-[#82948B] truncate">
                        {ticketSummary.secondary}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#53665E] tabular-nums whitespace-nowrap">
                      {formatDateTime(order.paidAt || order.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-[13px] font-bold text-[#052E25] tabular-nums whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 border-t border-[#E3EBE5] bg-[#FAFCFA] flex flex-wrap items-center justify-between gap-3 text-xs text-[#64766D]">
        <div className="flex items-center gap-2">
          <span>Show</span>
          {(!isServer || serverPagination?.onPageSizeChange) ? (
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-7 px-2 rounded-lg border border-[#C8D6CD] bg-white text-xs font-bold text-[#052E25] cursor-pointer"
            >
              {[8, 12, 24, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          ) : (
            <strong className="text-[#052E25]">{pageSize}</strong>
          )}
          <span>
            of <strong className="text-[#052E25] tabular-nums">{totalCount}</strong> results
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => handlePageChange(safePage - 1)}
            aria-label="Previous buyers page"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[#E3EBE5] bg-white text-[#53665E] hover:bg-[#E7F5EE] hover:text-[#087F5B] disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <ChevronLeft size={14} />
          </button>

          {pageNumbers.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handlePageChange(num)}
              aria-current={num === safePage ? 'page' : undefined}
              className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold tabular-nums transition ${
                num === safePage
                  ? 'bg-[#087F5B] text-white shadow-sm'
                  : 'bg-white border border-[#E3EBE5] text-[#53665E] hover:bg-[#F6F8F5]'
              }`}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => handlePageChange(safePage + 1)}
            aria-label="Next buyers page"
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[#E3EBE5] bg-white text-[#53665E] hover:bg-[#E7F5EE] hover:text-[#087F5B] disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
