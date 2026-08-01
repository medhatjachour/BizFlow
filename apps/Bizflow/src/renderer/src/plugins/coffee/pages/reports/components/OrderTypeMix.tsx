import { ShoppingBag } from 'lucide-react'
import { Overview } from '../types'
import { ORDER_TYPES } from '../constants'
import { calcPercentage } from '../utils'

interface OrderTypeMixProps {
  overview: Overview | null
  loading: boolean
  t: (key: string) => string
}

export function OrderTypeMix({ overview, loading, t }: OrderTypeMixProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const totalOrders = overview?.totalOrders ?? 0

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('cfOrderTypeMix')}</h3>
      </div>

      <div className="space-y-3">
        {ORDER_TYPES.map(ot => {
          const count = overview?.orderTypes[ot.key] ?? 0
          const pct = calcPercentage(count, totalOrders)

          return (
            <div key={ot.key} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ot.icon}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t(ot.labelKey)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{count}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">({pct.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: ot.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
