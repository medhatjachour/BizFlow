import React from 'react'
import { ExpenseSummary } from '../types'
import { formatCurrency, getCategoryMeta } from '../utils'

interface Props {
  summary: ExpenseSummary | null
}

export const CategoryBreakdown: React.FC<Props> = ({ summary }) => {
  if (!summary || summary.totalAmount <= 0 || !summary.byCategory?.length) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Category Distribution
        </h4>
        <span className="text-xs text-slate-400 font-medium">
          {summary.byCategory.length} Categories
        </span>
      </div>

      <div className="space-y-3">
        {summary.byCategory.map(c => {
          const pct = summary.totalAmount > 0 ? (c._sum.amount / summary.totalAmount) * 100 : 0
          const meta = getCategoryMeta(c.category)
          return (
            <div key={c.category} className="group flex items-center gap-3 text-sm">
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border shrink-0 min-w-[96px] text-center ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
              <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: meta.barColor }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 w-24 text-right">
                {formatCurrency(c._sum.amount)}
              </span>
              <span className="text-xs text-slate-400 shrink-0 w-12 text-right tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}