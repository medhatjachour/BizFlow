import React from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { ViewMode, LocationItem } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  query: string
  onQueryChange: (q: string) => void
  locationFilter: string
  onLocationChange: (loc: string) => void
  locations: LocationItem[]
  searchRef: React.RefObject<HTMLInputElement | null>
}

export const OperationsFilterBar: React.FC<Props> = ({
  view,
  onViewChange,
  query,
  onQueryChange,
  locationFilter,
  onLocationChange,
  locations,
  searchRef
}) => {
  const { t } = useLanguage()

  const tabs: Array<{ id: ViewMode; label: string }> = [
    { id: 'control', label: t('warehouseControlTower') || 'Control Tower' },
    { id: 'receiving', label: t('warehouseReceivingJourney') || 'Receiving Pipeline' },
    { id: 'outbound', label: t('warehouseOutboundJourney') || 'Outbound Pipeline' },
    { id: 'activity', label: t('warehouseActivityFeed') || 'Audit & Movements' }
  ]

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* View Switcher Pills */}
      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
        {tabs.map(tab => {
          const active = view === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                active
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filter Inputs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            ref={searchRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder={t('warehouseSearchOrderPartnerSourceSku') || 'Search SKU, Order #, Partner...'}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-2.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-700 rounded">
            /
          </kbd>
        </div>

        <div className="relative">
          <select
            value={locationFilter}
            onChange={e => onLocationChange(e.target.value)}
            className="w-full sm:w-48 appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">{t('warehouseAllLocations') || 'All Locations'}</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
          <SlidersHorizontal className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}