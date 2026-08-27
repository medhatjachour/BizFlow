import React from 'react'
import {
  Search,
  X,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Package,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { CatalogViewMode, CatalogQuickFilter } from '../types'

interface Props {
  search: string
  onSearchChange: (q: string) => void
  categories: string[]
  categoryCounts: Record<string, number>
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  quickFilter: CatalogQuickFilter
  onQuickFilterChange: (f: CatalogQuickFilter) => void
  viewMode: CatalogViewMode
  onViewModeChange: (m: CatalogViewMode) => void
  totalShowing: number
  totalAll: number
}

export const CatalogToolbar: React.FC<Props> = ({
  search,
  onSearchChange,
  categories,
  categoryCounts,
  selectedCategory,
  onSelectCategory,
  quickFilter,
  onQuickFilterChange,
  viewMode,
  onViewModeChange,
  totalShowing,
  totalAll
}) => {
  const { t } = useLanguage()

  return (
    <div className="p-3.5 border-b border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 space-y-3">
      {/* ── Top Bar: Search + Quick Status Filters + View Mode ──────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Search with keyboard hint */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('vetSearchMedicines') || 'Search item name, brand, or lot…'}
            className="w-full pl-10 pr-16 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-2xs"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {search ? (
              <button
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 rounded">
                F2
              </kbd>
            )}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All', icon: Sparkles },
            { id: 'in_stock', label: 'In Stock', icon: Package },
            { id: 'low_stock', label: 'Low Stock', icon: AlertTriangle },
            { id: 'expiring', label: 'Expiring Soon', icon: Clock }
          ].map(f => {
            const isSelected = quickFilter === f.id
            const Icon = f.icon
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onQuickFilterChange(f.id as CatalogQuickFilter)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/70'
                }`}
              >
                <Icon size={12} />
                <span>{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* View Mode Toggle & Counter */}
        <div className="flex items-center gap-2.5 ml-auto">
          <span className="text-[11px] font-bold text-slate-400 hidden xl:inline-block">
            {totalShowing} / {totalAll} items
          </span>

          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Dense List View"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Category Strip (Mouse Wheel Enabled) ─────────────────────────── */}
      <div
        className="w-full min-w-0 flex items-center gap-1.5 pb-0.5 overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onWheel={e => {
          if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY
        }}
      >
        {categories.map(cat => {
          const isSelected = selectedCategory === cat
          const count = categoryCounts[cat] ?? 0
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-xl capitalize whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-700/40'
              }`}
            >
              <span>{cat === 'all' ? t('vetFilterAll') || 'All Categories' : cat}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                  isSelected
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                    : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}