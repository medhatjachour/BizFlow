import React from 'react'
import { Plus, RefreshCw, Search, Ban, SlidersHorizontal, Layers, Percent } from 'lucide-react'
import { KITCHEN_STATIONS } from '../constants'

interface Props {
  categories: string[]
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  selectedStation: string
  onSelectStation: (st: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  showOutOfStockOnly: boolean
  onToggleOutOfStockOnly: () => void
  stats: {
    total: number
    available: number
    outOfStock: number
    avgMargin: number
  }
  onOpenAddModal: () => void
  onRefresh: () => void
  loading: boolean
}

export const MenuToolbar: React.FC<Props> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedStation,
  onSelectStation,
  searchQuery,
  onSearchChange,
  showOutOfStockOnly,
  onToggleOutOfStockOnly,
  stats,
  onOpenAddModal,
  onRefresh,
  loading
}) => {
  return (
    <div className="space-y-3">
      {/* Top Bar: Search, Stations, 86 Filter, New Item */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        {/* Category Horizontal Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
          <button
            onClick={() => onSelectCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Categories ({stats.total})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search, Station Filter & Add */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dish or recipe..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-36 sm:w-48 font-medium"
            />
          </div>

          {/* Station Filter */}
          <select
            value={selectedStation}
            onChange={(e) => onSelectStation(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs px-2.5 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Stations</option>
            {KITCHEN_STATIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* 86 Out Toggle Button */}
          <button
            onClick={onToggleOutOfStockOnly}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              showOutOfStockOnly
                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>86'd ({stats.outOfStock})</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-orange-500/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Dish</span>
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Dishes
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {stats.available}/{stats.total}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              86'd Out of Stock
            </span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {stats.outOfStock}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
            <Ban className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Avg Gross Margin
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {stats.avgMargin}%
            </span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Menu Categories
            </span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
              {categories.length}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  )
}