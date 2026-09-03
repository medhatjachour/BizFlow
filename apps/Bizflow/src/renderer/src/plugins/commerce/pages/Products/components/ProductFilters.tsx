/**
 * ProductFilters Component
 * Handles product search and filtering
 */

import { memo } from 'react'
import { Search, Filter, X } from 'lucide-react'
import type { ProductFilters as Filters } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProductFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Partial<Filters>) => void
  onClearFilters: () => void
  categories: string[]
  stores: Array<{ id: string; name: string }>
  showAdvanced: boolean
  onToggleAdvanced: () => void
}

function ProductFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  categories,
  stores,
  showAdvanced,
  onToggleAdvanced
}: Readonly<ProductFiltersProps>) {
  const { t } = useLanguage()
  
  return (
    <div className="flex flex-col items-stretch justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
      {/* Search Bar */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchProductsByNameOrSKU')}
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="w-full ps-9 pe-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-100"
          />
        </div>
        <button
          onClick={onToggleAdvanced}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${showAdvanced ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
        >
          <Filter className="w-4 h-4" />
          {t('filters')}
        </button>
        {(filters.category || filters.store || filters.stockStatus) && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20"
          >
            <X className="w-4 h-4" />
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 dark:border-slate-700 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('category')}
            </label>
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">{t('allCategories')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('stockStatus')}
            </label>
            <select
              value={filters.stockStatus}
              onChange={(e) => onFiltersChange({ stockStatus: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">{t('allStock')}</option>
              <option value="in-stock">{t('inStock')}</option>
              <option value="low-stock">{t('lowStock')} (≤10)</option>
              <option value="out-of-stock">{t('outOfStock')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('store')}
            </label>
            <select
              value={filters.store}
              onChange={(e) => onFiltersChange({ store: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">{t('allStores')}</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ProductFilters)
