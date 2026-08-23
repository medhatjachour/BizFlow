import React from 'react'
import { Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  statusFilter: string
  onStatusFilterChange: (s: string) => void
  query: string
  onQueryChange: (q: string) => void
  totalCount: number
  searchRef: React.RefObject<HTMLInputElement | null>
}

export const TransfersFilterBar: React.FC<Props> = ({
  statusFilter,
  onStatusFilterChange,
  query,
  onQueryChange,
  searchRef
}) => {
  const { t } = useLanguage()

  const tabs = [
    { id: 'all', label: 'All Transfers' },
    { id: 'draft', label: 'Draft' },
    { id: 'in_transit', label: 'In Transit' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Status Chips */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const isSelected = (statusFilter || 'all') === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id === 'all' ? '' : tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-64">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          ref={searchRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder={t('warehouseSearchRoutesOrProducts') || 'Search routes, SKUs, manifest...'}
          className="w-full pl-9 pr-8 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <kbd className="hidden sm:inline-block absolute right-2.5 top-2.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-700 rounded">
          /
        </kbd>
      </div>
    </div>
  )
}