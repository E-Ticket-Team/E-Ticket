import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../../types/api';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (nextPage: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, meta.page - 2);
  const end = Math.min(meta.totalPages, meta.page + 2);
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-summary">
        Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} total)
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
          <span>Prev</span>
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${p === meta.page ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onPageChange(p)}
            aria-current={p === meta.page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
