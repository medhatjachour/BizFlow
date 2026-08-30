import React from 'react'
import { Search, Plus, LayoutGrid, List, RotateCcw, ArrowUpDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { StoreFilters, ViewMode, StoreSortField } from '../types'

interface StoresToolbarProps {
  filters: StoreFilters
  onFiltersChange: (next: StoreFilters) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onAddStore: () => void
  onRefresh: () => void
}

export const StoresToolbar: React.FC<StoresToolbarProps> = ({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  onAddStore,
  onRefresh
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl shadow-2xs">
      {/* Search & Filter Group */}
      <div className="flex flex-1 items-center flex-wrap gap-2">
        {/* Search Bar with RTL-aware positioning */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchStores') || 'Search branches by name, city, phone or manager...'}
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full ps-9 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
          className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">{t('allBranches') || 'All Statuses'}</option>
          <option value="active">{t('activeOnly') || 'Active Only'}</option>
          <option value="inactive">{t('inactiveOnly') || 'Inactive Only'}</option>
        </select>

        {/* Sort Field */}
        <div className="flex items-center gap-1">
          <select
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as StoreSortField })}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="name">{t('sortByName') || 'Name'}</option>
            <option value="location">{t('sortByLocation') || 'Location'}</option>
            <option value="manager">{t('sortByManager') || 'Manager'}</option>
            <option value="status">{t('sortByStatus') || 'Status'}</option>
          </select>

          <button
            type="button"
            onClick={() =>
              onFiltersChange({
                ...filters,
                sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc'
              })
            }
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Sort ${filters.sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reload */}
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t('refresh') || 'Reload'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* View Switcher & Action */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Grid Cards"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Dense Table"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onAddStore}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewStore') || 'Add Store Location'}</span>
          <kbd className="hidden md:inline px-1 py-0.2 rounded text-[9px] font-mono bg-white/20 text-white">
            Ctrl+N
          </kbd>
        </button>
      </div>
    </div>
  )
}