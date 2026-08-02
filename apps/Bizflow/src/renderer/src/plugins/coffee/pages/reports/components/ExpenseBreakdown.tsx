import { Receipt } from 'lucide-react'
import { Overview } from '../types'
import { formatCurrency, calcPercentage } from '../utils'

interface ExpenseBreakdownProps {
  overview: Overview | null
  loading: boolean
  t: (key: string) => string
}

const EXPENSE_COLORS = [
  'bg-red-500',
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
]

export function ExpenseBreakdown({ overview, loading, t }: ExpenseBreakdownProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const expenses = overview?.expenseByCategory ?? []
  const totalExpenses = overview?.totalExpenses ?? 0

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-rose-500" />
          {t('cfExpenseMix')}
        </h3>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {formatCurrency(totalExpenses)} total • {overview?.expenseCount ?? 0} entries
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
          <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('cfNoExpensesRange')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stacked Bar */}
          <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700/50">
            {expenses.slice(0, 6).map((exp, idx) => {
              const pct = calcPercentage(Number(exp.total) || 0, totalExpenses)
              return (
                <div
                  key={idx}
                  className={`${EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                  title={`${exp.category}: ${pct.toFixed(1)}%`}
                />
              )
            })}
          </div>

          {/* Legend & Details */}
          <div className="space-y-2">
            {expenses.slice(0, 6).map((exp, idx) => {
              const total = Number(exp.total) || 0
              const count = Number(exp.count) || 0
              const pct = calcPercentage(total, totalExpenses)

              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${EXPENSE_COLORS[idx % EXPENSE_COLORS.length]}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{exp.category}</span>
                        <span className="font-semibold text-slate-900 dark:text-white text-sm ml-4">{formatCurrency(total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{count} entries</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
