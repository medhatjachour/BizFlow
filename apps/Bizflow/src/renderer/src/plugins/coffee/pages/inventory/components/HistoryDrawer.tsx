import {
  X, History, ArrowDownCircle, ArrowUpCircle, ArrowRight,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
  Calendar, Filter, Inbox,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Product, StockMovement } from '../types'
import { MOVEMENT_TYPES, movementMeta, HISTORY_PERIODS, PAGE_SIZE } from '../constants'
import { hexToRgba, formatNumber } from '../utils'

interface Props {
  product: Product | null
  movements: StockMovement[]
  allMovementsCount: number
  loading: boolean
  onClose: () => void
  // Filters
  period: string
  setPeriod: (p: string) => void
  typeFilter: string
  setTypeFilter: (t: string) => void
  // Pagination
  page: number
  setPage: (p: number) => void
  totalPages: number
  // Stats
  stats: { total: number; incoming: number; outgoing: number; net: number }
}

export function HistoryDrawer({
  product, movements, allMovementsCount, loading, onClose,
  period, setPeriod, typeFilter, setTypeFilter,
  page, setPage, totalPages, stats,
}: Props) {
  if (!product) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Movement History
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{product.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Current stock: <span className="font-semibold text-slate-600 dark:text-slate-300">{product.stock}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2">
          <StatPill
            icon={TrendingUp}
            label="In"
            value={formatNumber(stats.incoming)}
            color="#16a34a"
          />
          <StatPill
            icon={TrendingDown}
            label="Out"
            value={formatNumber(stats.outgoing)}
            color="#dc2626"
          />
          <StatPill
            icon={Minus}
            label="Net"
            value={formatNumber(stats.net)}
            color={stats.net >= 0 ? '#16a34a' : '#dc2626'}
          />
        </div>

        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          {/* Date period pills */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {HISTORY_PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    period === p.value
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Types
              </button>
              {MOVEMENT_TYPES.map(t => {
                const Icon = t.icon
                const selected = typeFilter === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => setTypeFilter(t.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all ${
                      selected ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    style={selected ? { backgroundColor: t.color } : undefined}
                  >
                    <Icon className="w-3 h-3" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Timeline ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No movements found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try changing the date range or type filter.
              </p>
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />

                <div className="space-y-3">
                  {movements.map(m => {
                    const meta = movementMeta(m.type)
                    const Icon = meta.icon
                    const positive = m.quantity > 0
                    return (
                      <div key={m.id} className="relative flex gap-3">
                        {/* Icon node */}
                        <div
                          className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white dark:ring-slate-900"
                          style={{
                            backgroundColor: hexToRgba(meta.color, 0.15),
                            color: meta.color,
                          }}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>

                        {/* Content card */}
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {meta.label}
                                {m.reason && (
                                  <span className="font-normal text-slate-500 dark:text-slate-400">
                                    {' '}— {m.reason}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                <span className="tabular-nums">{m.previousStock}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                                  {m.newStock}
                                </span>
                                <span className="mx-1">·</span>
                                <span>{formatRelativeDate(m.createdAt)}</span>
                              </div>
                            </div>

                            {/* Quantity badge */}
                            <div
                              className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold tabular-nums flex-shrink-0 ${
                                positive
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              }`}
                            >
                              {positive ? (
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                              )}
                              {positive ? '+' : ''}{m.quantity}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Pagination footer ──────────────────────────────────── */}
        {!loading && allMovementsCount > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">{allMovementsCount}</span> movements
              {allMovementsCount > PAGE_SIZE && (
                <span className="text-slate-400"> · page {page} of {totalPages}</span>
              )}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers (show max 5) */}
                <div className="flex items-center gap-0.5">
                  {getPageNumbers(page, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-1.5 text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          page === p
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ backgroundColor: hexToRgba(color, 0.1) }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-bold tabular-nums" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  })
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}
