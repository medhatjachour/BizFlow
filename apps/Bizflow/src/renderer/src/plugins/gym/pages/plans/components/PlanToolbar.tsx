import { Search, Plus, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface PlanToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddNew: () => void
  totalCount: number
}

export function PlanToolbar({
  searchQuery,
  onSearchChange,
  onAddNew,
  totalCount
}: PlanToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[280px]">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search plans by name, features, or description..."
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

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
          {totalCount} {totalCount === 1 ? 'plan' : 'plans'} configured
        </span>

        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-2xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Plus size={15} />
          <span>{t('gymNewPlan') || 'Create New Plan'}</span>
        </button>
      </div>
    </div>
  )
}