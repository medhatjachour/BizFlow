import React from 'react'
import { Search, Plus, Package } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ProductCard } from './ProductCard'
import { POS_FILTER_OPTIONS } from '../constants'
import { RecipeGroup, PosFilterType } from '../types'
import { daysUntil } from '../utils'

interface Props {
  groups: RecipeGroup[]
  totalGroupsCount: number
  allGroups: RecipeGroup[]
  searchQuery: string
  onSearchChange: (q: string) => void
  posFilter: PosFilterType
  onPosFilterChange: (f: PosFilterType) => void
  onSelectGroup: (g: RecipeGroup) => void
  onOpenCustomSale: () => void
  onSavePrice: (recipeId: string, price: number) => Promise<void>
}

export const SalesProductGrid: React.FC<Props> = ({
  groups,
  allGroups,
  searchQuery,
  onSearchChange,
  posFilter,
  onPosFilterChange,
  onSelectGroup,
  onOpenCustomSale,
  onSavePrice,
}) => {
  const { t } = useLanguage()

  const filterCounts = {
    all: allGroups.length,
    expiring: allGroups.filter(g => g.earliestExpiry && daysUntil(g.earliestExpiry) <= 3).length,
    noprice: allGroups.filter(g => !g.recipe.sellingPrice || g.recipe.sellingPrice <= 0).length,
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={`Search ${allGroups.length} available product${allGroups.length !== 1 ? 's' : ''}…`}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {POS_FILTER_OPTIONS.map(opt => {
            const count =
              opt.key === ''
                ? filterCounts.all
                : opt.key === 'expiring'
                ? filterCounts.expiring
                : filterCounts.noprice
            const isActive = posFilter === opt.key

            return (
              <button
                key={opt.key}
                onClick={() => onPosFilterChange(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                }`}
              >
                <span>{t(opt.labelKey) || opt.defaultLabel}</span>
                {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            )
          })}
        </div>

        {/* Custom Sale Button */}
        <button
          onClick={onOpenCustomSale}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-400 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-all shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{t('bakeryCustomSale') || 'Custom Sale'}</span>
        </button>
      </div>

      {/* Grid */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/30">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 mb-3">
            <Package className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">
            {allGroups.length === 0
              ? t('bakerySaleNoStock') || 'No Produced Stock Available'
              : t('bakerySaleNoMatches') || 'No products match your criteria'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {allGroups.length === 0
              ? 'Complete a scheduled batch in the Production tab to stock ready-to-sell products.'
              : 'Try clearing your search query or switching active filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {groups.map(group => (
            <ProductCard
              key={group.recipe.id}
              group={group}
              onSelect={onSelectGroup}
              onSavePrice={onSavePrice}
            />
          ))}
        </div>
      )}
    </div>
  )
}