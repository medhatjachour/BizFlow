import { Search, RefreshCw, Plus, ChevronDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PERIODS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants'
import type { Filters, Period } from '../types'

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
    <div className="flex flex-wrap items-center gap-2">
      {/* Period pills */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => patchFilters({ period: p.value as Period })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filters.period === p.value
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Category dropdown */}
      <Select
        value={filters.category}
        onChange={v => patchFilters({ category: v })}
        options={[{ value: 'all', label: 'All Categories' }, ...EXPENSE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))]}
      />

      {/* Payment dropdown */}
      <Select
        value={filters.paymentMethod}
        onChange={v => patchFilters({ paymentMethod: v })}
        options={[{ value: 'all', label: 'All Payments' }, ...PAYMENT_METHODS.map(p => ({ value: p.value, label: p.label }))]}
      />

      {/* Shift dropdown */}
      <Select
        value={filters.shiftId}
        onChange={v => patchFilters({ shiftId: v })}
        options={[
          { value: 'all', label: 'All Shifts' },
          ...(activeShift?.id ? [{ value: activeShift.id, label: `Active Shift (${activeShift.cashier?.fullName ?? activeShift.cashier?.username ?? 'Open'})` }] : []),
        ]}
      />

      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={filters.search}
          onChange={e => patchFilters({ search: e.target.value })}
          placeholder={t('cfSearchExpenses')||'Search expenses…'}
          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-colors"
        title="Refresh"
      >
        <RefreshCw size={16} />
      </button>

      {/* Add */}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
      >
        <Plus size={16} /> {t('cfAddExpense')||'Add Expense'}
      </button>
    </div>
  )
}

// ── Reusable select ─────────────────────────────────────────────────────────
function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  )
}
