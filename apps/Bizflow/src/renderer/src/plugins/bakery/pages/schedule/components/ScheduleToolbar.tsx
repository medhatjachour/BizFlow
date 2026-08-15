import React from 'react'
import { Search, Plus, RefreshCw, X, SlidersHorizontal } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { DateRangeFilter, ScheduleStatus } from '../types'

interface Props {
  search: string
  onSearchChange: (val: string) => void
  statusFilter: ScheduleStatus | 'all'
  onStatusFilterChange: (s: ScheduleStatus | 'all') => void
  dateRange: DateRangeFilter
  onDateRangeChange: (r: DateRangeFilter) => void
  overdueCount: number
  refreshing: boolean
  onRefresh: () => void
  onAddClick: () => void
}

export const ScheduleToolbar: React.FC<Props> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  overdueCount,
  refreshing,
  onRefresh,
  onAddClick,
}) => {
  const { t } = useLanguage()

  const DATE_RANGE_TABS: { key: DateRangeFilter; label: string }[] = [
    { key: 'all', label: t('bakeryDateAll') || 'All Dates' },
    { key: 'today', label: t('bakeryDateToday') || 'Today' },
    { key: 'week', label: t('bakeryDateWeek') || 'This Week' },
    { key: 'next7', label: t('bakeryDateNext7') || 'Next 7 Days' },
    { key: 'past', label: t('bakeryDatePast') || 'Past' },
    {
      key: 'overdue',
      label: overdueCount > 0 ? `⚠ ${t('bakeryOverdue') || 'Overdue'} (${overdueCount})` : t('bakeryOverdue') || 'Overdue',
    },
  ]

  const hasFilters = search || statusFilter !== 'all' || dateRange !== 'all'

  return (
    <div className="space-y-3">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('bakeryScheduleSearchPlaceholder') || 'Search by recipe or notes…'}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh schedule"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>{t('bakeryAddSchedule') || 'Schedule Run'}</span>
          </button>
        </div>
      </div>

      {/* Date Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          {DATE_RANGE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onDateRangeChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                dateRange === tab.key
                  ? tab.key === 'overdue'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                  : tab.key === 'overdue' && overdueCount > 0
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              onSearchChange('')
              onStatusFilterChange('all')
              onDateRangeChange('all')
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{t('bakeryClearFilters') || 'Clear filters'}</span>
          </button>
        )}
      </div>
    </div>
  )
}