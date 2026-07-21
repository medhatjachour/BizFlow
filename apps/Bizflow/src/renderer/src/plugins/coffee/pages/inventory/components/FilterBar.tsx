import { Search, RefreshCw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { FilterMode } from '../types'

interface Props {
  search: string
  setSearch: (s: string) => void
  filter: FilterMode
  setFilter: (f: FilterMode) => void
  counts: { all: number; low: number; out: number }
  onRefresh: () => void
}

export function FilterBar({ search, setSearch, filter, setFilter, counts, onRefresh }: Props) {
  const pills: { value: FilterMode; label: string; count: number }[] = [
    { value: 'all', label: 'All',     count: counts.all },
    { value: 'low', label: 'Low',     count: counts.low },
    { value: 'out', label: 'Out',     count: counts.out },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products or categories..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {pills.map(p => (
          <button
            key={p.value}
            onClick={() => setFilter(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filter === p.value
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
            }`}
          >
            {p.label} <span className="opacity-70">({p.count})</span>
          </button>
        ))}
      </div>

      {/* Refresh */}
      <button onClick={onRefresh} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  )
}
