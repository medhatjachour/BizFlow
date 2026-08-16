import React from 'react'
import { DollarSign, Receipt, TrendingDown, Layers } from 'lucide-react'
import { ExpenseSummary, DateRangeKey } from '../types'
import { formatCurrency, getCategoryMeta } from '../utils'

interface Props {
  summary: ExpenseSummary | null
  totalEntries: number
  range: DateRangeKey
}

export const ExpenseSummaryCards: React.FC<Props> = ({ summary, totalEntries, range }) => {
  const rangeLabel = range === 'all' ? 'All time' : `Last ${range.replace('days', 'd')}`
  const topCategories = (summary?.byCategory ?? []).slice(0, 2)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Spent ({rangeLabel})
          </p>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {formatCurrency(summary?.totalAmount ?? 0)}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recorded Transactions
          </p>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Receipt className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {totalEntries}
        </p>
      </div>

      {topCategories.map(cat => {
        const meta = getCategoryMeta(cat.category)
        return (
          <div
            key={cat.category}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Top: {meta.label}
              </p>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatCurrency(cat._sum?.amount ?? 0)}
            </p>
          </div>
        )
      })}

      {topCategories.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm flex items-center justify-center text-slate-400">
          <div className="flex items-center gap-2 text-xs">
            <Layers className="h-4 w-4 opacity-50" />
            <span>No category expense data</span>
          </div>
        </div>
      )}
    </div>
  )
}