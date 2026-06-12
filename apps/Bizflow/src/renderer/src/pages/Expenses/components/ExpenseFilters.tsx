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
  includeCOGS: boolean
  setIncludeCOGS: (v: boolean) => void
  includeSalaries: boolean
  setIncludeSalaries: (v: boolean) => void
  t: (key: string) => string
}

export default function ExpenseFilters({
  searchTerm, setSearchTerm,
  filterCategory, setFilterCategory,
  dateRange, setDateRange,
  includeCOGS, setIncludeCOGS,
  includeSalaries, setIncludeSalaries,
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

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setIncludeCOGS(!includeCOGS)}
          className={`group flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
            includeCOGS
              ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
              : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/40'
          }`}
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('costOfGoodsSold')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {includeCOGS ? 'Included in totals' : 'Excluded from totals'}
            </p>
          </div>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              includeCOGS ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                includeCOGS ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIncludeSalaries(!includeSalaries)}
          className={`group flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
            includeSalaries
              ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20'
              : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/40'
          }`}
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('employeeSalaries')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {includeSalaries ? 'Included in totals' : 'Excluded from totals'}
            </p>
          </div>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              includeSalaries ? 'bg-purple-500' : 'bg-slate-400 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                includeSalaries ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
