import React from 'react'
import { GymExpenseSummary } from '../types'
import { CATEGORY_COLORS, FALLBACK_CATEGORY_COLOR } from '../constant'
import { formatCurrency } from '../utils'

interface Props {
  summary: GymExpenseSummary | null
}

export const ExpenseCategoryCard: React.FC<Props> = ({ summary }) => {
  const total = summary?.totalExpenses ?? 0
  const categories = summary?.byCategory ?? []

  return (
    <div className="flex flex-col justify-between bg-white dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Expense Allocation</h2>
          <p className="text-xs text-slate-400">Distribution across active budget buckets</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium">Total Outflow</span>
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
          {categories.map((c) => {
            const pct = total > 0 ? (c.total / total) * 100 : 0
            const style = CATEGORY_COLORS[c.category.toLowerCase()] ?? FALLBACK_CATEGORY_COLOR
            return (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300 capitalize flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.hex }} />
                    {c.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">{pct.toFixed(1)}%</span>
                    <span className="text-slate-700 dark:text-slate-200 tabular-nums font-semibold">
                      {formatCurrency(c.total)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: style.hex }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-xs text-slate-400 font-medium">
          No expenses recorded for this period
        </div>
      )}
    </div>
  )
}