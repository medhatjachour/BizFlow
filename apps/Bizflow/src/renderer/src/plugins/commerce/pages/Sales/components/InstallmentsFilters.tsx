import { Filter } from 'lucide-react'
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
  return (
    <div className="glass-card p-4">
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <input
            type="text"
            placeholder="Search by customer name, sale ID, or amount..."
            className="input-field w-full"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="input-field w-48"
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as InstallmentStatusFilter)
          }
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          className="input-field w-48"
          value={dateFilter}
          onChange={(e) =>
            onDateFilterChange(e.target.value as InstallmentDateFilter)
          }
        >
          <option value="all">All Time</option>
          <option value="today">Due Today</option>
          <option value="week">Due This Week</option>
          <option value="month">Due This Month</option>
          <option value="overdue">Overdue</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Filter size={16} />
          <span>
            {totalItems} installment{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}