import { Search, RefreshCw, Plus, ChevronDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PERIODS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants'
import type { Filters, Period } from '../types'

import CustomSelect from '@renderer/components/ui/CustomSelect'

interface Props {
  filters: Filters
  patchFilters: (p: Partial<Filters>) => void
  onRefresh: () => void
  onAdd: () => void
  activeShift: any
}

export function FilterBar({ filters, patchFilters, onRefresh, onAdd, activeShift }: Props) {
  const {t} = useLanguage()
  
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Period pills */}
      <div className="flex items-center gap-1  rounded-lg p-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => patchFilters({ period: p.value as Period })}
            className={`px-3 py-1.5 ml-1  rounded-xl text-md font-medium transition-colors ${
              filters.period === p.value
                ? 'bg-amber-500 text-white shadow-sm '
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 bg-slate-100 dark:bg-slate-700/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>


      {/* Payment dropdown */}
      <div className="min-w-[140px]">
        <CustomSelect
          value={filters.paymentMethod}
          onChange={(v) => patchFilters({ paymentMethod: String(v) })}
          options={[{ value: 'all', label: 'All Payments' }, ...PAYMENT_METHODS.map(p => ({ value: p.value, label: p.label }))]}
          />
      </div>

      {/* Shift dropdown */}
      <div className="min-w-[140px]">
        <CustomSelect
          value={filters.shiftId}
          onChange={(v) => patchFilters({ shiftId: String(v) })}
          options={[
            { value: 'all', label: 'All Shifts' },
            ...(activeShift?.id ? [{ value: activeShift.id, label: `Active Shift (${activeShift.cashier?.fullName ?? activeShift.cashier?.username ?? 'Open'})` }] : []),
          ]}
        />
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => patchFilters({ search: e.target.value })}
          placeholder={t('cfSearchExpenses')||'Search expenses…'}
          className="w-full pl-9 pr-3 py-2 text-md border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="p-4 mx-2 rounded-full text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20  transition-colors"
        title="Refresh"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Add */}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-md font-medium rounded-xl transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        {t('cfAddExpense')||'Add Expense'}
      </button>
    </div>
  )
}
