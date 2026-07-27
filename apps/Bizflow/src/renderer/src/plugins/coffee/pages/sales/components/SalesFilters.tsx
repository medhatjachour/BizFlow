import { RefreshCw, Search, Download } from 'lucide-react'
import { PAYMENT_METHODS, ORDER_TYPES, SORT_OPTIONS } from '../constants'
import type { Category, SalesFilters as Filters } from '../types'
// Adjust the import path to wherever you saved CustomSelect
import CustomSelect, { SelectOption } from '@renderer/components/ui/CustomSelect'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  onRefresh: () => void
  onExport: () => void
  categories: Category[]
  loading?: boolean
  periods: { label: string; value: string }[]
}

export function SalesFilters({
  filters,
  onChange,
  onRefresh,
  onExport,
  categories,
  loading,
  periods
}: Props) {
  // 1. Prepare options for CustomSelect
  const orderTypeOptions: SelectOption[] = [
    { value: '', label: 'All Types' },
    ...ORDER_TYPES.map((o) => ({ value: o.value, label: o.label }))
  ]

  const paymentOptions: SelectOption[] = [
    { value: '', label: 'All Payments' },
    ...PAYMENT_METHODS.map((p) => ({ value: p.value, label: p.label }))
  ]

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name }))
  ]

  const sortOptions: SelectOption[] = SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))
  const { t } = useLanguage()
  return (
    // flex-wrap allows it to drop to 2 rows on very small screens, but stays 1 row on large screens
    <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex flex-1 items-center gap-3  justify-between ">
        {/* Period Segmented Control */}
        <div className="min-w-[140px]">
          {/* {periods.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onChange({ period: value as any })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                filters.period === value
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))} */}
          <CustomSelect
            value={filters.period || ''}
            onChange={(v) => onChange({ period: v as any })}
            options={periods}
          />
        </div>

        {/* Big Search Bar (flex-1 makes it grow to fill available space) */}
        <div className="relative flex-1 min-w-[200px] order-3 lg:order-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={t('cfSearchOrders') || 'Search orders…'}
            className="w-full pl-9 pr-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
        </div>
      </div>
      {/* Dropdowns Group */}
      <div className="flex items-center flex-wrap order-2 gap-3 lg:order-3">
        <div className="min-w-[120px]">
          <CustomSelect
            value={filters.type || ''}
            onChange={(v) => onChange({ type: v as any })}
            options={orderTypeOptions}
          />
        </div>

        <div className="min-w-[120px]">
          <CustomSelect
            value={filters.paymentMethod || ''}
            onChange={(v) => onChange({ paymentMethod: v as any })}
            options={paymentOptions}
          />
        </div>

        <div className="min-w-[120px]">
          <CustomSelect
            value={filters.categoryId || ''}
            onChange={(v) => onChange({ categoryId: v as string })}
            options={categoryOptions}
          />
        </div>

        <div className="min-w-[120px]">
          <CustomSelect
            value={filters.sort || ''}
            onChange={(v) => onChange({ sort: v as any })}
            options={sortOptions}
          />
        </div>
        {/* Actions Group */}
        <div className="flex items-center gap-2 ml-auto order-4">
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
