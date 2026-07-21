import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { LucideIcon } from 'lucide-react'
import { PAYMENT_METHODS } from '../constants'
import { formatMoney } from '../utils'

interface PaymentItem {
  label: string
  value: number
  pct: number
  key: string
}

interface Props {
  data: PaymentItem[]
  loading: boolean
}

export function PaymentBreakdown({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex-1">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Payment Breakdown
        </h3>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
          {formatMoney(total)} total
        </span>
      </div>

      {/* Visual bar */}
      {total > 0 && (
        <div className="flex h-3 rounded-full overflow-hidden mb-5 bg-slate-100 dark:bg-slate-800">
          {data.map(p => {
            const meta = PAYMENT_METHODS.find(m => m.value === p.key)
            const color = meta?.color ?? '#64748b'
            if (p.value <= 0) return null
            return (
              <div
                key={p.key}
                className="h-full transition-all duration-500"
                style={{ width: `${p.pct}%`, backgroundColor: color }}
                title={`${p.label}: ${formatMoney(p.value)} (${p.pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
      )}

      {/* Breakdown list */}
      <div className="space-y-3">
        {data.map(p => {
          const meta = PAYMENT_METHODS.find(m => m.value === p.key)
          const Icon: LucideIcon = meta?.icon ?? Banknote
          const color = meta?.color ?? '#64748b'

          return (
            <div key={p.key} className="flex items-center gap-3">
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {p.label}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                  {formatMoney(p.value)}
                </div>
              </div>

              {/* Percentage */}
              <div className="text-right">
                <div
                  className="text-sm font-semibold tabular-nums"
                  style={{ color }}
                >
                  {p.pct.toFixed(1)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-6">
          <div className="text-sm text-slate-400 dark:text-slate-500">
            No payments in this period
          </div>
        </div>
      )}
    </div>
  )
}
