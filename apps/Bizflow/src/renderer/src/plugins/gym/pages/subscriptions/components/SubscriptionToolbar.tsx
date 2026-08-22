import { Search, Plus, RefreshCcw, LayoutGrid, List, AlertTriangle, X } from 'lucide-react'
import { SubscriptionFilter, SubscriptionViewMode } from '../types'
import { SUBSCRIPTION_FILTERS } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface SubscriptionToolbarProps {
  activeFilter: SubscriptionFilter
  onFilterChange: (f: SubscriptionFilter) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  viewMode: SubscriptionViewMode
  onViewModeChange: (m: SubscriptionViewMode) => void
  expiringCount: number
  loading: boolean
  onRefresh: () => void
  onAddNew: () => void
}

export function SubscriptionToolbar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchQueryChange,
  viewMode,
  onViewModeChange,
  expiringCount,
  loading,
  onRefresh,
  onAddNew
}: SubscriptionToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {/* Top Search & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="Search subscriptions by member name, plan, or phone..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onViewModeChange('cards')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Cards Grid"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table List"
            >
              <List size={15} />
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCcw size={15} className={loading ? 'animate-spin text-orange-500' : ''} />
          </button>

          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={15} />
            <span>{t('gymNewSubscription') || 'New Subscription'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {SUBSCRIPTION_FILTERS.map(f => {
          const isSelected = activeFilter === f.key
          const isExpiringWithBadge = f.key === 'expiring' && expiringCount > 0

          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span>{t(f.labelKey) || f.fallbackLabel}</span>
              {isExpiringWithBadge && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {expiringCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Expiring Alert Banner */}
      {expiringCount > 0 && activeFilter !== 'expiring' && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500 shrink-0" />
            <span>
              <strong>{expiringCount}</strong> {t('gymExpiringSoonAlert') || 'active subscriptions expire within the next 7 days.'}
            </span>
          </div>
          <button
            onClick={() => onFilterChange('expiring')}
            className="text-xs font-bold underline hover:text-amber-900 dark:hover:text-amber-200"
          >
            {t('gymViewThem') || 'Review now'}
          </button>
        </div>
      )}
    </div>
  )
}