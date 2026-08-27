    import { Search, RefreshCw, LayoutGrid, List, X } from 'lucide-react'
import { FollowUpFilterKey, FollowUpViewMode } from '../types'
import { FollowUpHelpTooltip } from './FollowUpHelpTooltip'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  filter: FollowUpFilterKey
  onFilterChange: (f: FollowUpFilterKey) => void
  doctorFilter: string
  onDoctorFilterChange: (d: string) => void
  attendingDoctors: string[]
  viewMode: FollowUpViewMode
  onViewModeChange: (m: FollowUpViewMode) => void
  onRefresh: () => void
  isRefreshing: boolean
}

export function FollowUpToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  doctorFilter,
  onDoctorFilterChange,
  attendingDoctors,
  viewMode,
  onViewModeChange,
  onRefresh,
  isRefreshing
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const tabs: { key: FollowUpFilterKey; labelEn: string; labelAr: string }[] = [
    { key: 'today', labelEn: 'Due Today', labelAr: 'اليوم' },
    { key: 'overdue', labelEn: 'Overdue', labelAr: 'المتأخرة' },
    { key: 'upcoming', labelEn: 'Upcoming', labelAr: 'القادمة' },
    { key: 'all', labelEn: 'All Reminders', labelAr: 'الكل' }
  ]

  return (
    <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
      {/* Search & Filter Controls */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isAr ? 'بحث بالمريض، المالك، الهاتف، الطبيب...' : 'Search patient, owner, phone, doctor...'}
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

        {/* Status Filters */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onFilterChange(t.key)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === t.key
                  ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isAr ? t.labelAr : t.labelEn}
            </button>
          ))}
        </div>

        {/* Doctor Dropdown Filter */}
        {attendingDoctors.length > 0 && (
          <select
            value={doctorFilter}
            onChange={(e) => onDoctorFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="all">{isAr ? 'جميع الأطباء' : 'All Doctors'}</option>
            {attendingDoctors.map((d) => (
              <option key={d} value={d}>
                Dr. {d}
              </option>
            ))}
          </select>
        )}

        <FollowUpHelpTooltip />
      </div>

      {/* View Toggle & Actions */}
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
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 transition-all disabled:opacity-50"
          title={isAr ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-violet-500' : ''} />
        </button>
      </div>
    </div>
  )
}