import { Search, Plus, X, LayoutGrid, List } from 'lucide-react'
import { ProgramViewMode } from '../types'
import { GOAL_OPTIONS } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProgramToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  activeGoal: string
  onGoalChange: (g: string) => void
  viewMode: ProgramViewMode
  onViewModeChange: (m: ProgramViewMode) => void
  onAddNew: () => void
  totalCount: number
}

export function ProgramToolbar({
  searchQuery,
  onSearchChange,
  activeGoal,
  onGoalChange,
  viewMode,
  onViewModeChange,
  onAddNew,
  totalCount
}: ProgramToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {/* Top Search & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search programs by name, coach, focus, or goal..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
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
              onClick={() => onViewModeChange('cards')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Cards Grid View"
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
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-2xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={15} />
            <span>{t('gymNewProgram') || 'Create Program'}</span>
          </button>
        </div>
      </div>

      {/* Goal Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onGoalChange('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeGoal === 'all'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-orange-300'
            }`}
          >
            All Routines
          </button>

          {GOAL_OPTIONS.map(g => {
            const Icon = g.icon
            const isSelected = activeGoal === g.value

            return (
              <button
                key={g.value}
                onClick={() => onGoalChange(g.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-orange-300'
                }`}
              >
                <Icon size={12} />
                <span>{g.fallbackLabel}</span>
              </button>
            )
          })}
        </div>

        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap pl-2">
          {totalCount} {totalCount === 1 ? 'routine' : 'routines'}
        </span>
      </div>
    </div>
  )
}