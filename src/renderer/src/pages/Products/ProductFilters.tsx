/**
 * ProductFilters Component
 * Handles product search and filtering
 */

import { memo } from 'react'
import { Search, Filter, X } from 'lucide-react'
import type { ProductFilters as Filters } from './types'
import { useLanguage } from '../../contexts/LanguageContext'

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
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
      {/* Search Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchProductsByNameOrSKU')}
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={onToggleAdvanced}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          {t('filters')}
        </button>
        {(filters.category || filters.store || filters.stockStatus) && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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
