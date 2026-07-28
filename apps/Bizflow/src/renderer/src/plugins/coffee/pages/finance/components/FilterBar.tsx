import { CalendarRange, RefreshCw, Download } from 'lucide-react'
import { PRESETS, ORDER_TYPES, PAYMENT_METHODS } from '../constants'
import type { Preset, OrderTypeFilter, PaymentFilter } from '../types'
import CustomSelect from '@renderer/components/ui/CustomSelect'

interface Props {
  preset: Preset
  onPreset: (p: Preset) => void
  from: string
  to: string
  setFrom: (v: string) => void
  setTo: (v: string) => void
  type: OrderTypeFilter
  setType: (t: OrderTypeFilter) => void
  paymentMethod: PaymentFilter
  setPaymentMethod: (p: PaymentFilter) => void
  onRefresh: () => void
  onExport: () => void
}

export function FilterBar({
  preset,
  onPreset,
  from,
  to,
  setFrom,
  setTo,
  type,
  setType,
  paymentMethod,
  setPaymentMethod,
  onRefresh,
  onExport
}: Props) {
  const selectCls =
    'px-2 py-2.5 text-md rounded-xl border border-slate-200 dark:border-slate-700  bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-amber-500 outline-none transition'

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      {/* Preset pills */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPreset(p.value)}
            className={`px-3 py-2.5 rounded-xl text-md font-medium transition-colors ${
              preset === p.value
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <CalendarRange className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={selectCls + ' pl-8'}
          />
        </div>
        <span className="text-slate-400 text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={selectCls}
        />
      </div>

      {/* Type filter */}
      <div className="min-w-[140px]">
        <CustomSelect
          value={type}
          onChange={(v) => setType(v as OrderTypeFilter)}
          options={[{ value: 'all', label: 'All Types' }, ...ORDER_TYPES]}
        />
      </div>

      {/* Payment filter */}

        <div className="min-w-[140px]">
        <CustomSelect
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentFilter)}
          options={[{ value: 'all', label: 'All Payments' }, ...PAYMENT_METHODS]}
        />
      </div>
     

      {/* Spacer */}
      <div className="flex-1" />

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 p-5 rounded-full  text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800  text-xs font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-md font-medium transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export CSV
      </button>
    </div>
  )
}
