import { Filter } from 'lucide-react'
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
    <div className="glass-card p-4">
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <input
            type="text"
            placeholder={t('searchByCustomerOrSaleId')}
            className="input-field w-full"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="input-field w-48"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Filter size={16} />
          <span>
            {filteredCount} transaction{filteredCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}