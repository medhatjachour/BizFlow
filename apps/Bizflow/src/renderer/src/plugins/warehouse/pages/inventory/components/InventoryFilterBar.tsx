import React from 'react'
import { Search, LayoutGrid, Table, ArrowUpDown } from 'lucide-react'
import { StockFilterMode, ViewLayout, SortOption } from '../types'
import { FILTER_MODES } from '../constants'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  filterMode: StockFilterMode
  onFilterModeChange: (m: StockFilterMode) => void
  layout: ViewLayout
  onLayoutChange: (l: ViewLayout) => void
  sortBy: SortOption
  onSortByChange: (s: SortOption) => void
  totalFiltered: number
  searchRef: React.RefObject<HTMLInputElement | null>
}

export const InventoryFilterBar: React.FC<Props> = ({
  query,
  onQueryChange,
  filterMode,
  onFilterModeChange,
  layout,
  onLayoutChange,
  sortBy,
  onSortByChange,
  searchRef
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Preset Status Chips */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {FILTER_MODES.map(mode => {
          const isSelected = filterMode === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => onFilterModeChange(mode.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {mode.label}
            </button>
          )
        })}
      </div>

      {/* Search, Sort & Layout Switcher */}
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            ref={searchRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search SKU, Lot, Barcode..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-2.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-700 rounded">
            /
          </kbd>
        </div>

        {/* Sort Select */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => onSortByChange(e.target.value as SortOption)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="risk">Sort: Risk First</option>
            <option value="name">Sort: Product Name</option>
            <option value="qty_desc">Sort: Highest Qty</option>
            <option value="qty_asc">Sort: Lowest Qty</option>
            <option value="expiry">Sort: Expiry Date</option>
          </select>
          <ArrowUpDown className="w-3 h-3 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Table / Grid Toggle */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
          <button
            onClick={() => onLayoutChange('table')}
            className={`p-1.5 rounded-lg transition-all ${
              layout === 'table' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600' : 'text-slate-400'
            }`}
            title="Table View"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onLayoutChange('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              layout === 'grid' ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600' : 'text-slate-400'
            }`}
            title="Card View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}