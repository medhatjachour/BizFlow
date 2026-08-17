import React from 'react'
import { Search, RefreshCw, Tag, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Category, StockFilter, ExpiryFilter, SortField, SortDirection } from '../types'

interface Props {
  search: string
  categories: Category[]
  categoryFilter: string
  stockFilter: StockFilter
  expiryFilter: ExpiryFilter
  sortBy: SortField
  sortDir: SortDirection
  hasActiveFilters: boolean
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onStockChange: (v: StockFilter) => void
  onExpiryChange: (v: ExpiryFilter) => void
  onSortByChange: (v: SortField) => void
  onSortDirToggle: () => void
  onClearFilters: () => void
  onRefresh: () => void
  onOpenCategories: () => void
  onOpenCreateModal: () => void
}

export const MaterialToolbar: React.FC<Props> = ({
  search,
  categories,
  categoryFilter,
  stockFilter,
  expiryFilter,
  sortBy,
  sortDir,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onStockChange,
  onExpiryChange,
  onSortByChange,
  onSortDirToggle,
  onClearFilters,
  onRefresh,
  onOpenCategories,
  onOpenCreateModal
}) => {
  const { t } = useLanguage()

  const selectCls =
    'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors hover:border-slate-300'

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          className="w-full ps-10 pe-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('materialSearch') || 'Search materials, code, or supplier...'}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap ms-auto">
        <select
          className={selectCls}
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">{t('allCategories') || 'All Categories'}</option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={stockFilter}
          onChange={(e) => onStockChange(e.target.value as StockFilter)}
        >
          <option value="all">{t('materialStockAll') || 'All Stock'}</option>
          <option value="in_stock">{t('materialStockIn') || 'In Stock'}</option>
          <option value="out_of_stock">{t('materialStockOut') || 'Out of Stock'}</option>
          <option value="low_stock">{t('materialStatsLowStock') || 'Low Stock'}</option>
        </select>

        <select
          className={selectCls}
          value={expiryFilter}
          onChange={(e) => onExpiryChange(e.target.value as ExpiryFilter)}
        >
          <option value="all">{t('materialExpiryAll') || 'All Expiry'}</option>
          <option value="expired">{t('materialExpiryExpired') || 'Expired'}</option>
          <option value="expiring_soon">{t('materialExpirySoon') || 'Expiring Soon'}</option>
          <option value="valid">{t('materialExpiryValid') || 'Valid'}</option>
          <option value="no_expiry">{t('materialExpiryNone') || 'No Expiry'}</option>
        </select>

        <select
          className={selectCls}
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortField)}
        >
          <option value="name">{t('materialSortName') || 'Sort: Name'}</option>
          <option value="quantity">{t('materialSortQuantity') || 'Sort: Quantity'}</option>
          <option value="expiryDate">{t('materialSortExpiry') || 'Sort: Expiry'}</option>
          <option value="updatedAt">{t('materialSortUpdated') || 'Sort: Updated'}</option>
        </select>

        <button
          type="button"
          onClick={onSortDirToggle}
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
        >
          {sortDir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
        </button>

        <button
          onClick={onRefresh}
          className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          title={t('refresh') || 'Refresh'}
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            {t('clearFilters') || 'Clear'}
          </button>
        )}

        <button
          onClick={onOpenCategories}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 text-xs font-bold transition-all shadow-xs"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>{t('categories') || 'Categories'}</span>
        </button>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-sm shadow-teal-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>{t('newMaterial') || 'Add Material'}</span>
        </button>
      </div>
    </div>
  )
}