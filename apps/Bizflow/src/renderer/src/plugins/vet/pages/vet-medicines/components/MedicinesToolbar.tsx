import React from 'react'
import { Search, Plus, Settings2, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS } from '../constants'
import { StoreHelp } from './StoreHelp'
import type { CategoryItem, SortOption } from '../types'

interface MedicinesToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  categories: CategoryItem[]
  sortOption: SortOption
  onSortChange: (sort: SortOption) => void
  onOpenMedicineModal: () => void
  onOpenCategoryModal: () => void
  onOpenUnitModal: () => void
}

export const MedicinesToolbar: React.FC<MedicinesToolbarProps> = ({
  search,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  categories,
  sortOption,
  onSortChange,
  onOpenMedicineModal,
  onOpenCategoryModal,
  onOpenUnitModal
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-3 bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
      {/* ── Top Row: Search Input + Action Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('vetSearchMedicines') || 'Search medicines…'}
            className={`${INPUT_BASE_CLS} pl-9 py-1.5 h-9`}
          />
        </div>

        {/* Right: Sort & Action Buttons */}
        <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="h-9 px-3 pr-8 text-xs font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/60 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer appearance-none"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="stock-desc">Stock (High-Low)</option>
              <option value="stock-asc">Stock (Low-High)</option>
              <option value="expiry-asc">Expiry (Nearest)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={onOpenUnitModal}
            title={t('vetManageUnits') || 'Manage Units'}
            className="h-9 px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Units</span>
          </button>

          <button
            type="button"
            onClick={onOpenCategoryModal}
            title={t('vetManageCategories') || 'Manage Categories'}
            className="h-9 px-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Categories</span>
          </button>

          <StoreHelp />

          <button
            type="button"
            onClick={onOpenMedicineModal}
            className="h-9 px-3.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('vetAddMedicineBtn') || 'Add Medicine'}</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Row: Categories Filter Chips ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 border-t border-slate-100 dark:border-slate-700/60 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          {t('vetFilterAll') || 'All'}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectCategory(c.name)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap capitalize transition-colors flex items-center gap-1.5 ${
              selectedCategory === c.name
                ? 'bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-semibold ring-1 ring-violet-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: c.color || '#8b5cf6' }}
            />
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}