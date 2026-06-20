/**
 * Pagination — reusable paginator bar
 *
 * Props:
 *   page       – current page (1-based)
 *   totalPages – total number of pages
 *   onPage     – callback to change page
 *   pageSize   – current page size
 *   pageSizes  – selectable page sizes (default [10, 20, 50, 100])
 *   onPageSize – callback to change page size
 *   total      – total number of records (shown as "X records")
 */
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPage: (p: number) => void
  pageSize?: number
  pageSizes?: number[]
  onPageSize?: (ps: number) => void
  className?: string
}

export default function Pagination({
  page,
  totalPages,
  total,
  onPage,
  pageSize = 20,
  pageSizes = [10, 20, 50, 100],
  onPageSize,
  className = ''
}: PaginationProps) {
  if (totalPages <= 0) return null

  // Build page window: always show first, last, current ±1, with ellipsis
  const pages: (number | '...')[] = []
  const addPage = (p: number) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p)
  }
  addPage(1)
  if (page > 3) pages.push('...')
  addPage(page - 1)
  addPage(page)
  addPage(page + 1)
  if (page < totalPages - 2) pages.push('...')
  addPage(totalPages)

  const btnBase =
    'inline-flex items-center justify-center h-8 min-w-[32px] rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400'
  const btnActive =
    'bg-amber-500 text-white font-semibold'
  const btnDefault =
    'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none'

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      {/* Total record count + page size selector */}
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{total.toLocaleString()} record{total !== 1 ? 's' : ''}</span>
        {onPageSize && (
          <div className="flex items-center gap-1.5">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={e => onPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {pageSizes.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First */}
          <button
            className={`${btnBase} ${btnDefault} px-1.5`}
            onClick={() => onPage(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Prev */}
          <button
            className={`${btnBase} ${btnDefault} px-1.5`}
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {pages.map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="inline-flex items-center justify-center h-8 min-w-[32px] text-slate-400 text-sm"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                className={`${btnBase} px-2.5 ${p === page ? btnActive : btnDefault}`}
                onClick={() => onPage(p)}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            className={`${btnBase} ${btnDefault} px-1.5`}
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last */}
          <button
            className={`${btnBase} ${btnDefault} px-1.5`}
            onClick={() => onPage(totalPages)}
            disabled={page === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
