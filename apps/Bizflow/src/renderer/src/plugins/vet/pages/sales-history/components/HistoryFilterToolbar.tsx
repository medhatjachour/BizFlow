import React from 'react'
import {
  Search,
  X,
  Calendar,
  Layers,
  List,
  SlidersHorizontal,
  BarChart2
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DateField from '@renderer/components/DateField'
import type { HistoryViewMode, DatePreset } from '../types'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  viewMode: HistoryViewMode
  onViewModeChange: (m: HistoryViewMode) => void
  preset: DatePreset
  onApplyPreset: (p: 'today' | 'week' | 'month') => void
  showFilters: boolean
  onToggleFilters: () => void
  showStats: boolean
  onToggleStats: () => void
  dateFrom: string
  dateTo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  category: string
  categories: string[]
  onCategoryChange: (c: string) => void
}

export const HistoryFilterToolbar: React.FC<Props> = ({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  preset,
  onApplyPreset,
  showFilters,
  onToggleFilters,
  showStats,
  onToggleStats,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  hasActiveFilters,
  onClearFilters,
  category,
  categories,
  onCategoryChange
}) => {
  const { t } = useLanguage()

  return (
    <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-20">
      {/* Primary Toolbar Line */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        {/* Search & Quick Presets */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={t('vetSearchSales') || 'Search customer, lot or medicine…'}
              className="w-full pl-8 pr-7 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/80 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1">
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => onApplyPreset(p)}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl capitalize transition-all ${
                  preset === p
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                }`}
              >
                {p === 'today'
                  ? t('vetToday') || 'Today'
                  : p === 'week'
                  ? t('vetThisWeek') || '7 Days'
                  : t('vetThisMonth') || '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* View Toggle & Toggles */}
        <div className="flex items-center gap-2">
          {/* Grouped vs Individual Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => onViewModeChange('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers size={13} />
              <span className="hidden md:inline">{t('vetViewGrouped') || 'Grouped'}</span>
            </button>
            <button
              onClick={() => onViewModeChange('individual')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'individual'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={13} />
              <span className="hidden md:inline">{t('vetViewIndividual') || 'Itemized'}</span>
            </button>
          </div>

          {/* Filter Bar Toggle */}
          <button
            onClick={onToggleFilters}
            className={`p-2 rounded-xl border transition-all ${
              showFilters
                ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Toggle Date and Category Filters"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Stats Bar Toggle */}
          <button
            onClick={onToggleStats}
            className={`p-2 rounded-xl border transition-all ${
              showStats
                ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Toggle Summary Statistics"
          >
            <BarChart2 size={14} />
          </button>
        </div>
      </div>

      {/* Collapsible Secondary Filter Bar */}
      {showFilters && (
        <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-4 flex-wrap animate-in fade-in duration-100">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <DateField
                value={dateFrom}
                onChange={onDateFromChange}
                wrapperClassName="w-36"
                className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-slate-400 text-xs">–</span>
              <DateField
                value={dateTo}
                onChange={onDateToChange}
                wrapperClassName="w-36"
                className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Category Pills */}
            {categories.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto">
                {categories.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCategoryChange(c)}
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg capitalize transition-all ${
                      category === c
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 hover:border-violet-300'
                    }`}
                  >
                    {c === 'all' ? t('vetFilterAll') || 'All Categories' : c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline ml-auto"
            >
              <X size={13} /> Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}