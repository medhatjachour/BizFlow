import React from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { LOCATION_TYPES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  typeFilter: string
  onTypeFilterChange: (t: string) => void
  totalCount: number
  searchRef: React.RefObject<HTMLInputElement | null>
}

export const LocationsFilterBar: React.FC<Props> = ({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  totalCount,
  searchRef
}) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
        <span>{totalCount} {totalCount === 1 ? 'Location Node' : 'Location Nodes'}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            ref={searchRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder={t('warehouseSearchLocationNameCode') || 'Search name, code, type...'}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-2.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-700 rounded">
            /
          </kbd>
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 capitalize"
          >
            <option value="all">{t('warehouseAllTypes') || 'All Types'}</option>
            {LOCATION_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <SlidersHorizontal className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}