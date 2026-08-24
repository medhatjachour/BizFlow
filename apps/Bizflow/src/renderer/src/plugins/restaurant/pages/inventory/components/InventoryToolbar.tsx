import React from 'react'
import { Plus, RefreshCw, Search, AlertTriangle, Layers, DollarSign } from 'lucide-react'
import { formatCurrency } from '../utils'

interface Props {
  categories: string[]
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  showLowStockOnly: boolean
  onToggleLowStockOnly: () => void
  stats: { total: number; lowStock: number; totalValuation: number }
  onOpenAddModal: () => void
  onRefresh: () => void
  loading: boolean
}

export const InventoryToolbar: React.FC<Props> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  showLowStockOnly,
  onToggleLowStockOnly,
  stats,
  onOpenAddModal,
  onRefresh,
  loading
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
          <button
            onClick={() => onSelectCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Items ({stats.total})
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

        {/* Search, Low-Stock Filter, New Ingredient */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ingredient or supplier..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-36 sm:w-48 font-medium"
            />
          </div>

          <button
            onClick={onToggleLowStockOnly}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              showLowStockOnly
                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({stats.lowStock})</span>
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
            <span>New Ingredient</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Tracked Ingredients
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {stats.total} Items
            </span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pantry Inventory Value
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.totalValuation)}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Reorder Alerts Needed
            </span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">
              {stats.lowStock} Items
            </span>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}