import { Search, PackageX, ChefHat } from 'lucide-react'
import { CapFilter, CapacityEntry } from '../types'
import { RecipeCapacityCard } from './RecipeCapacityCard'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface CapacitySectionProps {
  capacityList: CapacityEntry[]
  totalRecipes: number
  readyCount: number
  limitedCount: number
  blockedCount: number
  filter: CapFilter
  onFilterChange: (f: CapFilter) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
}

export function CapacitySection({
  capacityList,
  totalRecipes,
  readyCount,
  limitedCount,
  blockedCount,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  expandedIds,
  onToggleExpand
}: CapacitySectionProps) {
  const { t } = useLanguage()

  const tabs: [CapFilter, string, number][] = [
    ['all', t('bakeryFilterAll'), totalRecipes],
    ['ready', t('bakeryFilterReady'), readyCount],
    ['limited', t('bakeryFilterLow'), limitedCount],
    ['blocked', t('bakeryFilterBlocked'), blockedCount]
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {t('bakeryWhatCanWeMake')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('bakeryBasedOnStock')}
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 gap-1 text-xs font-semibold">
            {tabs.map(([key, label, cnt]) => (
              <button
                key={key}
                onClick={() => onFilterChange(key)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label} <span className="opacity-60 text-[11px]">({cnt})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 sm:p-5">
        {capacityList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-3">
            <PackageX className="h-12 w-12 stroke-[1.5]" />
            <p className="text-sm font-medium">{t('bakeryNoMatchFilter')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {capacityList.map(entry => (
              <RecipeCapacityCard
                key={entry.recipeId}
                entry={entry}
                expanded={expandedIds.has(entry.recipeId)}
                onToggle={() => onToggleExpand(entry.recipeId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}