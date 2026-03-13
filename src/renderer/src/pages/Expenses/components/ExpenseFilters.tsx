import { Search } from 'lucide-react'
import type { ExpenseCategory, DateRange } from '../types'
import { EXPENSE_CATEGORIES } from '../hooks/useExpenses'

interface Props {
  searchTerm: string
  setSearchTerm: (v: string) => void
  filterCategory: ExpenseCategory | 'all'
  setFilterCategory: (v: ExpenseCategory | 'all') => void
  dateRange: DateRange
  setDateRange: (v: DateRange) => void
  t: (key: string) => string
}

export default function ExpenseFilters({
  searchTerm, setSearchTerm,
  filterCategory, setFilterCategory,
  dateRange, setDateRange,
  t,
}: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchExpenses')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as ExpenseCategory | 'all')}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">{t('expenseAllCategories')}</option>
          {EXPENSE_CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{t(cat.nameKey)}</option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateRange)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="7days">{t('expenseLast7Days')}</option>
          <option value="30days">{t('expenseLast30Days')}</option>
          <option value="90days">{t('expenseLast90Days')}</option>
          <option value="all">{t('expenseAllTime')}</option>
        </select>
      </div>
    </div>
  )
}
