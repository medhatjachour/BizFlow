import React from 'react'
import { Search, Plus, RotateCcw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SupplierFilterState } from '../types'

interface SupplierFiltersProps {
  filters: SupplierFilterState
  onChange: (next: SupplierFilterState) => void
  onAddSupplier: () => void
  onRefresh: () => void
}

export const SupplierFilters: React.FC<SupplierFiltersProps> = ({
  filters,
  onChange,
  onAddSupplier,
  onRefresh
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl shadow-2xs">
      <div className="flex flex-1 items-center gap-2">
        {/* Search input with RTL support */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchSuppliersPlaceholder') || 'Search by name, contact, email or phone...'}
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full ps-9 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Status Dropdown */}
        <div className="shrink-0">
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value as any })}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{t('allStatus') || 'All Statuses'}</option>
            <option value="active">{t('activeOnly') || 'Active Only'}</option>
            <option value="inactive">{t('inactiveOnly') || 'Inactive Only'}</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh Data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onAddSupplier}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all shrink-0"
      >
        <Plus className="w-4 h-4" />
        <span>{t('addSupplier') || 'Add Supplier'}</span>
        <kbd className="hidden md:inline px-1 py-0.2 rounded text-[9px] font-mono bg-white/20 text-white">
          Ctrl+N
        </kbd>
      </button>
    </div>
  )
}