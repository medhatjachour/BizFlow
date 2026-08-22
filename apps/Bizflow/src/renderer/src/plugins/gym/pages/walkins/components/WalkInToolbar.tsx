import { Search, Plus, RefreshCcw, LayoutGrid, List, X, Filter } from 'lucide-react'
import { SessionPeriod, SessionViewMode } from '../types'
import { PERIOD_OPTIONS, VISIT_TYPES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface WalkInToolbarProps {
  period: SessionPeriod
  onPeriodChange: (p: SessionPeriod) => void
  typeFilter: string
  onTypeFilterChange: (t: string) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  viewMode: SessionViewMode
  onViewModeChange: (m: SessionViewMode) => void
  loading: boolean
  onRefresh: () => void
  onAddNew: () => void
}

export function WalkInToolbar({
  period,
  onPeriodChange,
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchQueryChange,
  viewMode,
  onViewModeChange,
  loading,
  onRefresh,
  onAddNew
}: WalkInToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {/* Top Search & Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="Search sessions by attendee, coach, method, or notes..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => onViewModeChange('cards')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Cards Grid"
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCcw size={15} className={loading ? 'animate-spin text-orange-500' : ''} />
          </button>

          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={15} />
            <span>{t('gymLogVisit') || 'Log Entry / Visit'}</span>
          </button>
        </div>
      </div>

      {/* Period Tabs & Category Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Segmented Period Control */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 gap-1">
          {PERIOD_OPTIONS.map(opt => {
            const isSelected = period === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onPeriodChange(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Visit Type Dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value)}
            className="text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {VISIT_TYPES.map(vt => (
              <option key={vt.value} value={vt.value}>
                {vt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}