import React from 'react'
import { AlertCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { STATUS_META } from '../constants'
import { ScheduleCounts, ScheduleStatus, DateRangeFilter } from '../types'

interface Props {
  counts: ScheduleCounts
  statusFilter: ScheduleStatus | 'all'
  onStatusFilterChange: (status: ScheduleStatus | 'all') => void
  dateRange: DateRangeFilter
  onDateRangeChange: (range: DateRangeFilter) => void
}

export const ScheduleStatsCards: React.FC<Props> = ({
  counts,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
}) => {
  const { t } = useLanguage()
  const statuses: ScheduleStatus[] = ['planned', 'in-progress', 'completed', 'cancelled']

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {statuses.map(s => {
        const meta = STATUS_META[s]
        const Icon = meta.icon
        const isActive = statusFilter === s

        return (
          <button
            key={s}
            onClick={() => onStatusFilterChange(isActive ? 'all' : s)}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all shadow-sm ${
              isActive
                ? 'bg-indigo-600 border-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-900/50'
                : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isActive ? 'bg-white/20 text-white' : meta.chip
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold uppercase tracking-wider truncate mb-0.5 ${
                  isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t(`bakeryStatus_${s}`) || meta.label}
              </p>
              <p
                className={`text-xl font-bold tracking-tight ${
                  isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {counts[s]}
              </p>
            </div>
          </button>
        )
      })}

      {/* Overdue Card */}
      {counts.overdue > 0 && (
        <button
          onClick={() => onDateRangeChange(dateRange === 'overdue' ? 'all' : 'overdue')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all shadow-sm ${
            dateRange === 'overdue'
              ? 'bg-rose-600 border-rose-600 text-white ring-2 ring-rose-300 dark:ring-rose-900/50'
              : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-400'
          }`}
        >
          <div
            className={`p-2 rounded-xl shrink-0 ${
              dateRange === 'overdue'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
            }`}
          >
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold uppercase tracking-wider truncate mb-0.5 ${
                dateRange === 'overdue' ? 'text-white/80' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {t('bakeryOverdueRuns') || 'Overdue'}
            </p>
            <p
              className={`text-xl font-bold tracking-tight ${
                dateRange === 'overdue' ? 'text-white' : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {counts.overdue}
            </p>
          </div>
        </button>
      )}
    </div>
  )
}