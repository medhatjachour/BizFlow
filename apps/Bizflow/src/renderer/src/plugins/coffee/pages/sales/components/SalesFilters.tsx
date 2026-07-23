import { RefreshCw, Search, Download, SlidersHorizontal } from 'lucide-react'
import { PAYMENT_METHODS, ORDER_TYPES, SORT_OPTIONS } from '../constants'
import type { Category, SalesFilters as Filters } from '../types'

interface Props {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  onRefresh: () => void
  onExport: () => void
  categories: Category[]
  loading?: boolean
  periods: { label: string; value: string }[]
}

export function SalesFilters({ filters, onChange, onRefresh, onExport, categories, loading, periods }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-3">
      {/* Top row: Period + Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
          {periods.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onChange({ period: value as any })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filters.period === value
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={filters.search ?? ''}
          onChange={e => onChange({ search: e.target.value })}
          placeholder="Search by order #, customer name..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        />
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <FilterSelect
          icon={SlidersHorizontal}
          value={filters.type}
          onChange={v => onChange({ type: v as any })}
          options={ORDER_TYPES}
        />
        <FilterSelect
          value={filters.paymentMethod}
          onChange={v => onChange({ paymentMethod: v as any })}
          options={PAYMENT_METHODS}
        />
        <select
          value={filters.categoryId}
          onChange={e => onChange({ categoryId: e.target.value })}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filters.sort ?? 'date_desc'}
          onChange={e => onChange({ sort: e.target.value as any })}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function FilterSelect({ value, onChange, options }: any) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
