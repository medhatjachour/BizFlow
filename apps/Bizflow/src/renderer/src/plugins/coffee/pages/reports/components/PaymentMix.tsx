import { CreditCard, Banknote, Smartphone } from 'lucide-react'
import { Overview } from '../types'
import { PAYMENT_METHODS } from '../constants'
import { formatCurrency, calcPercentage } from '../utils'

interface PaymentMixProps {
  overview: Overview | null
  loading: boolean
}

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  cash: Banknote,
  card: CreditCard,
  vodafone_cash: Smartphone,
}

export function PaymentMix({ overview, loading }: PaymentMixProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 animate-pulse">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
        <div className="space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const totalRevenue = overview?.totalRevenue ?? 0

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">Payment Mix</h3>

      <div className="space-y-2.5">
        {PAYMENT_METHODS.map(pm => {
          const amount = overview?.payment[pm.key] ?? 0
          const pct = calcPercentage(amount, totalRevenue)
          const Icon = PAYMENT_ICONS[pm.key] ?? CreditCard

          return (
            <div key={pm.key} className="flex items-center gap-3">
              <div
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${pm.color}20`, color: pm.color }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{pm.label}</span>
                  <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: pm.color }}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-right tabular-nums">
                {pct.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
