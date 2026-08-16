import React from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { WASTE_TYPES, WASTE_REASON_OPTIONS } from '../constants'
import { WasteType } from '../types'

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void
  filterType: WasteType | 'all'
  onFilterTypeChange: (type: WasteType | 'all') => void
  filterReason: string
  onFilterReasonChange: (reason: string) => void
  onAddClick: () => void
}

export const WasteToolbar: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterReason,
  onFilterReasonChange,
  onAddClick,
}) => {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('bakerySearchWastePlaceholder') || 'Search logs, items, notes…'}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {/* Reason Filter */}
        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <select
            value={filterReason}
            onChange={e => onFilterReasonChange(e.target.value)}
            aria-label="Filter by Reason"
            className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all shadow-sm appearance-none cursor-pointer"
          >
            <option value="">{t('bakeryAllReasons') || 'All Reasons'}</option>
            {WASTE_REASON_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>
                {t(r.key) || r.defaultLabel}
              </option>
            ))}
          </select>
        </div>

        {/* Add Log Button */}
        <button
          onClick={onAddClick}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{t('bakeryLogWaste') || 'Log Waste'}</span>
        </button>
      </div>

      {/* Pill Buttons for Waste Types */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onFilterTypeChange('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            filterType === 'all'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-300'
          }`}
        >
          {t('bakeryWasteAll') || 'All Waste Types'}
        </button>

        {WASTE_TYPES.map(wt => {
          const Icon = wt.icon
          const isActive = filterType === wt.value
          return (
            <button
              key={wt.value}
              onClick={() => onFilterTypeChange(wt.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t(wt.labelKey) || wt.defaultLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}