/**
 * InventoryFilters Component
 * Advanced filtering controls - Redesigned to match POS and Products
 */

import { X, ChevronDown } from 'lucide-react'
import type { InventoryFilters } from '../types'

interface Props {
  categories: string[]
  stores?: Array<{ id: string; name: string }>
  filters: InventoryFilters
  onFiltersChange: (filters: InventoryFilters) => void
}

export default function InventoryFilters({ categories, stores, filters, onFiltersChange }: Props) {
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
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Advanced Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            <X size={14} />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Dropdown - Single Select */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Category
          </label>
          <div className="relative">
            <select
              value={filters.categories[0] || ''}
              onChange={(e) => updateFilter('categories', e.target.value ? [e.target.value] : [])}
              className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm hover:border-primary focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* Store Dropdown */}
        {stores && stores.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Store
            </label>
            <div className="relative">
              <select
                value={filters.storeId || ''}
                onChange={(e) => updateFilter('storeId', e.target.value || undefined)}
                className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm hover:border-primary focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer"
              >
                <option value="">All Stores</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        )}

        {/* Stock Status Dropdown - Single Select */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Stock Status
          </label>
          <div className="relative">
            <select
              value={filters.stockStatus[0] || ''}
              onChange={(e) => updateFilter('stockStatus', e.target.value ? [e.target.value as 'out' | 'low' | 'normal' | 'high'] : [])}
              className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm hover:border-primary focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer"
            >
              <option value="">All Stock Levels</option>
              <option value="high">High Stock</option>
              <option value="normal">Normal Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Price Range: ${filters.priceRange.min} - ${filters.priceRange.max === Infinity ? '∞' : filters.priceRange.max}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange.min || ''}
              onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, min: Number(e.target.value) || 0 })}
              className="w-20 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary transition-all"
              min="0"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange.max === Infinity ? '' : filters.priceRange.max}
              onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, max: Number(e.target.value) || Infinity })}
              className="w-20 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary transition-all"
              min="0"
            />
          </div>
        </div>

        {/* Stock Quantity Range Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Stock Quantity: {filters.stockRange.min} - {filters.stockRange.max === Infinity ? '∞' : filters.stockRange.max}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.stockRange.min || ''}
              onChange={(e) => updateFilter('stockRange', { ...filters.stockRange, min: Number(e.target.value) || 0 })}
              className="w-20 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary transition-all"
              min="0"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.stockRange.max === Infinity ? '' : filters.stockRange.max}
              onChange={(e) => updateFilter('stockRange', { ...filters.stockRange, max: Number(e.target.value) || Infinity })}
              className="w-20 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary transition-all"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
