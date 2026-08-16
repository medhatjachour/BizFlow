import React from 'react'
import { Search, Plus, ShoppingCart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PANTRY_FILTER_OPTIONS } from '../constants'
import { PantryFilterStatus } from '../types'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  statusFilter: PantryFilterStatus
  onStatusFilterChange: (f: PantryFilterStatus) => void
  hasRestockItems: boolean
  onBulkRestockClick: () => void
  onAddClick: () => void
}

export const PantryToolbar: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  hasRestockItems,
  onBulkRestockClick,
  onAddClick,
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
      {/* Search and Status Pills */}
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('bakerySearchPantryPlaceholder') || 'Search by ingredient, supplier, notes…'}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {PANTRY_FILTER_OPTIONS.map(opt => {
            const isActive = statusFilter === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => onStatusFilterChange(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                }`}
              >
                {t(opt.labelKey) || opt.defaultLabel}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasRestockItems && (
          <button
            onClick={onBulkRestockClick}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{t('bakeryRestockAll') || 'Restock Flagged'}</span>
          </button>
        )}

        <button
          onClick={onAddClick}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>{t('bakeryAddIngredientStock') || 'Add Ingredient'}</span>
        </button>
      </div>
    </div>
  )
}