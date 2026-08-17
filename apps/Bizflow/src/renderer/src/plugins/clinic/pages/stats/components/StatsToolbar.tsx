import React from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { TrendRange } from '../types'

interface Props {
  trendDays: TrendRange
  refreshing: boolean
  onSelectRange: (range: TrendRange) => void
  onRefresh: () => void
}

export const StatsToolbar: React.FC<Props> = ({
  trendDays,
  refreshing,
  onSelectRange,
  onRefresh
}) => {
  const { t } = useLanguage()
  const ranges: TrendRange[] = [7, 30, 90]

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            {t('clinicAnalytics') || 'Clinical & Financial Intelligence'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Real-time throughput metrics, revenue velocity, and patient distributions
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ms-auto">
        {/* Trend Range Switcher */}
        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-1">
          {ranges.map((d) => (
            <button
              key={d}
              onClick={() => onSelectRange(d)}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                trendDays === d
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 transition-colors shadow-xs"
          title="Refresh Analytics"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-teal-500' : ''}`} />
        </button>
      </div>
    </div>
  )
}