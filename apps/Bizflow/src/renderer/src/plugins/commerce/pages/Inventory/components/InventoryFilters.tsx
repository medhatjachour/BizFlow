/**
 * InventoryFilters Component
 * Advanced filtering controls - Redesigned to match POS and Products
 */

import { ChevronDown, RotateCcw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { InventoryFilters } from '../types'

interface Props {
  categories: string[]
  stores?: Array<{ id: string; name: string }>
  filters: InventoryFilters
  onFiltersChange: (filters: InventoryFilters) => void
}

export default function InventoryFilters({ categories, stores, filters, onFiltersChange }: Props) {
  const { t } = useLanguage()
  const updateFilter = (key: keyof InventoryFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      categories: [],
      stockStatus: [],
      storeId: undefined,
      priceRange: { min: 0, max: Infinity },
      stockRange: { min: 0, max: Infinity }
    })
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.stockStatus.length > 0 ||
    filters.storeId ||
    filters.priceRange.min > 0 ||
    filters.priceRange.max < Infinity ||
    filters.stockRange.min > 0 ||
    filters.stockRange.max < Infinity

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700 animate-in slide-in-from-top-1 fade-in duration-150">
      <div className="flex justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-end">
          <div className="xl:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              {t('Category')}
            </label>
            <div className="relative">
              <select
                value={filters.categories[0] || ''}
                onChange={(e) => updateFilter('categories', e.target.value ? [e.target.value] : [])}
                className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 appearance-none cursor-pointer"
              >
                <option value="">{t('inventoryUiAllCategories')}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size={14}
              />
            </div>
          </div>

          {stores && stores.length > 0 && (
            <div className="xl:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                {t('inventoryUiStore')}
              </label>
              <div className="relative">
                <select
                  value={filters.storeId || ''}
                  onChange={(e) => updateFilter('storeId', e.target.value || undefined)}
                  className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 appearance-none cursor-pointer"
                >
                  <option value="">{t('inventoryUiAllStores')}</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                />
              </div>
            </div>
          )}

          <div className="md:col-span-2 xl:col-span-4">
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              {t('inventoryUiStockStatus')}
            </label>
            <div className="h-9 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-1 overflow-x-auto">
              {(
                [
                  { value: '', label: t('inventoryUiAll') },
                  { value: 'out', label: t('inventoryUiOut') },
                  { value: 'low', label: t('inventoryUiLow') },
                  { value: 'normal', label: t('inventoryUiHealthy') },
                  { value: 'high', label: t('inventoryUiHigh') }
                ] as const
              ).map((option) => {
                const selected = (filters.stockStatus[0] || '') === option.value
                return (
                  <button
                    key={option.value || 'all'}
                    type="button"
                    onClick={() => updateFilter('stockStatus', option.value ? [option.value] : [])}
                    className={`h-7 flex-1 min-w-max px-2 rounded-md text-[10px] font-bold transition-colors ${
                      selected
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              {t('UnitPrice')}
            </label>
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10">
              <input
                type="number"
                placeholder={t('inventoryUiMinimum')}
                value={filters.priceRange.min || ''}
                onChange={(e) =>
                  updateFilter('priceRange', {
                    ...filters.priceRange,
                    min: Number(e.target.value) || 0
                  })
                }
                className="w-1/2 h-9 px-2.5 bg-transparent text-xs outline-none"
                min="0"
              />
              <span className="text-slate-300">–</span>
              <input
                type="number"
                placeholder={t('inventoryUiMaximum')}
                value={filters.priceRange.max === Infinity ? '' : filters.priceRange.max}
                onChange={(e) =>
                  updateFilter('priceRange', {
                    ...filters.priceRange,
                    max: Number(e.target.value) || Infinity
                  })
                }
                className="w-1/2 h-9 px-2.5 bg-transparent text-xs outline-none"
                min="0"
              />
            </div>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-7 px-2.5 min-w-max rounded-md inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <RotateCcw size={12} />
            {t('inventoryUiResetFilters')}

          </button>
        )}
      </div>
    </div>
  )
}
