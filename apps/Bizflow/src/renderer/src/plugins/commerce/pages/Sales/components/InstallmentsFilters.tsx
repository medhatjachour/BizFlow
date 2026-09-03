import { CalendarDays, Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type {
  InstallmentStatusFilter,
  InstallmentDateFilter
} from '../types'

interface InstallmentsFiltersProps {
  searchQuery: string
  statusFilter: InstallmentStatusFilter
  dateFilter: InstallmentDateFilter
  totalItems: number
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: InstallmentStatusFilter) => void
  onDateFilterChange: (value: InstallmentDateFilter) => void
}

export function InstallmentsFilters({
  searchQuery,
  statusFilter,
  dateFilter,
  totalItems,
  onSearchChange,
  onStatusFilterChange,
  onDateFilterChange
}: InstallmentsFiltersProps): JSX.Element {
  const { t } = useLanguage()

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
      <div className="flex flex-col xl:flex-row xl:items-center gap-2">
        <div className="flex-1 min-w-0 relative">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={t('salesUiSearchInstallments')}
            className="w-full h-9 ps-9 pe-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-violet-500"
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as InstallmentStatusFilter)
          }
        >
          <option value="all">{t('salesUiAllStatuses')}</option>
          <option value="pending">{t('salesUiPending')}</option>
          <option value="paid">{t('salesUiPaid')}</option>
          <option value="overdue">{t('salesUiOverdue')}</option>
        </select>
        <select
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-violet-500"
          value={dateFilter}
          onChange={(e) =>
            onDateFilterChange(e.target.value as InstallmentDateFilter)
          }
        >
          <option value="all">{t('salesUiAllTime')}</option>
          <option value="today">{t('salesUiDueToday')}</option>
          <option value="week">{t('salesUiDueThisWeek')}</option>
          <option value="month">{t('salesUiDueThisMonth')}</option>
          <option value="overdue">{t('salesUiOverdue')}</option>
        </select>
        <div className="h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-[10px] font-bold text-slate-500 whitespace-nowrap">
          <CalendarDays size={13} />
          <span>
            {totalItems} {t(totalItems === 1 ? 'salesUiInstallment' : 'salesUiInstallmentPlural')}
          </span>
        </div>
      </div>
    </div>
  )
}