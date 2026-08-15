import React from 'react'
import { Search, Plus, Filter, Calendar } from 'lucide-react'
import { DATE_RANGE_OPTIONS, EXPENSE_CATEGORIES } from '../constants'
import { DateRangeKey } from '../types'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  categoryFilter: string
  onCategoryFilterChange: (cat: string) => void
  range: DateRangeKey
  onRangeChange: (r: DateRangeKey) => void
  onAddClick: () => void
}

export const ExpenseToolbar: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  range,
  onRangeChange,
  onAddClick,
}) => {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by description or vendor…"
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* Category Filter */}
      <div className="relative min-w-[150px]">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <select
          value={categoryFilter}
          onChange={e => onCategoryFilterChange(e.target.value)}
          aria-label="Filter by Category"
          className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent transition-all shadow-sm appearance-none cursor-pointer"
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Selector */}
      <div className="relative min-w-[140px]">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <select
          value={range}
          onChange={e => onRangeChange(e.target.value as DateRangeKey)}
          aria-label="Filter by Date Range"
          className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent transition-all shadow-sm appearance-none cursor-pointer"
        >
          {DATE_RANGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add Button */}
      <button
        onClick={onAddClick}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
      >
        <Plus className="h-4 w-4" />
        <span>Add Expense</span>
      </button>
    </div>
  )
}