import { CalendarDays, Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { DateFilter } from '../types'

interface SalesFiltersProps {
  searchQuery: string
  dateFilter: DateFilter
  filteredCount: number
  onSearchChange: (value: string) => void
  onDateFilterChange: (value: DateFilter) => void
}

export function SalesFilters({
  searchQuery,
  dateFilter,
  filteredCount,
  onSearchChange,
  onDateFilterChange
}: SalesFiltersProps): JSX.Element {
  const { t } = useLanguage()

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="flex-1 min-w-0 relative">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={t('salesUiSearchPlaceholder')}
            className="w-full h-9 ps-9 pe-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="h-9 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 overflow-x-auto">
          <CalendarDays size={13} className="mx-1 text-slate-400 shrink-0" />
          {([
            ['all', t('salesUiAllTime')],
            ['today', t('salesUiTodayFilter')],
            ['week', t('salesUiThisWeek')],
            ['month', t('salesUiThisMonth')]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onDateFilterChange(value)}
              className={`h-7 px-2.5 rounded-md text-[10px] font-bold whitespace-nowrap ${dateFilter === value ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 inline-flex items-center text-[10px] font-bold text-slate-500 whitespace-nowrap">
          {filteredCount} {t(filteredCount === 1 ? 'salesUiTransaction' : 'salesUiTransactions')}
        </div>
      </div>
    </div>
  )
}