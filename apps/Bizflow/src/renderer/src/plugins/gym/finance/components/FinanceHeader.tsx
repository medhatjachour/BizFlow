import React from 'react'
import { RefreshCcw, Download } from 'lucide-react'
import { Period, GymStatsOverview, GymExpenseSummary } from '../types'
import { PERIOD_OPTIONS } from '../constant'
import { exportFinanceCsv } from '../utils'

interface Props {
  period: Period
  onPeriodChange: (p: Period) => void
  onRefresh: () => void
  loading: boolean
  stats: GymStatsOverview | null
  summary: GymExpenseSummary | null
}

export const FinanceHeader: React.FC<Props> = ({
  period,
  onPeriodChange,
  onRefresh,
  loading,
  stats,
  summary
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Financial Intelligence
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time income streams, expense distribution, and operational margins.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Segmented Filter Pills */}
        <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
          {PERIOD_OPTIONS.map((item) => {
            const active = period === item.value
            return (
              <button
                key={item.value}
                onClick={() => onPeriodChange(item.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Quick CSV Export */}
        <button
          onClick={() => exportFinanceCsv(stats, summary, period)}
          title="Export CSV"
          disabled={!stats || loading}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-40 transition-all"
        >
          <Download size={15} />
        </button>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Data"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all"
        >
          <RefreshCcw size={15} className={loading ? 'animate-spin text-orange-500' : ''} />
        </button>
      </div>
    </div>
  )
}