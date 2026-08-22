import { Search, Plus, X, LayoutGrid, List } from 'lucide-react'
import { CoachFilter, CoachViewMode } from '../types'
import { COACH_FILTERS } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface CoachToolbarProps {
  searchInput: string
  onSearchInputChange: (val: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onClearSearch: () => void
  onAddNew: () => void
  activeFilter: CoachFilter
  onFilterChange: (f: CoachFilter) => void
  viewMode: CoachViewMode
  onViewModeChange: (m: CoachViewMode) => void
  totalCount: number
}

export function CoachToolbar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onClearSearch,
  onAddNew,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  totalCount
}: CoachToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <form onSubmit={onSearchSubmit} className="flex-1 flex items-center gap-2 min-w-[280px]">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => onSearchInputChange(e.target.value)}
              placeholder={t('gymSearchCoaches') || 'Search coaches by name, specialty, or phone...'}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            {t('gymSearch') || 'Search'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Cards Grid"
            >
              <LayoutGrid size={15} />
            </button>
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
          </div>

          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={15} />
            <span>{t('gymAddCoach') || 'Add Coach'}</span>
          </button>
        </div>
      </div>

      {/* Filter Chips & Total Counter */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          {COACH_FILTERS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onFilterChange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeFilter === opt.id
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-slate-400 whitespace-nowrap pl-2">
          {totalCount} {totalCount === 1 ? 'coach' : 'coaches'} registered
        </span>
      </div>
    </div>
  )
}