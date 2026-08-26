import { Search, Plus, RefreshCw, LayoutGrid, List, X } from 'lucide-react'
import { OwnerViewMode } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  viewMode: OwnerViewMode
  onViewModeChange: (m: OwnerViewMode) => void
  onAddOwner: () => void
  onRefresh: () => void
  isRefreshing: boolean
  totalOwners: number
}

export function VetOwnersToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onAddOwner,
  onRefresh,
  isRefreshing,
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
      {/* Search Input */}
      <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، رقم الهاتف أو البريد...' : 'Search by owner name, phone, email...'}
            className="w-full pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all disabled:opacity-50"
          title={isAr ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-violet-500' : ''} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title={isAr ? 'عرض البطاقات' : 'Grid View'}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title={isAr ? 'عرض الجدول' : 'Table View'}
          >
            <List size={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={onAddOwner}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 hover:shadow-lg transition-all active:scale-95"
        >
          <Plus size={15} />
          <span>{isAr ? 'تسجيل مالك جديد' : 'New Owner'}</span>
        </button>
      </div>
    </div>
  )
}