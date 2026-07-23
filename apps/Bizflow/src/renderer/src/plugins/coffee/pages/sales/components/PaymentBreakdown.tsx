import { PAYMENT_BREAKDOWN_CONFIG, ORDER_TYPE_CONFIG, COLOR_STYLES } from '../constants'
import type { SummaryData } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  summary: SummaryData | null
}

export function PaymentBreakdown({ summary }: Props) {
  if (!summary) return null

  const totalRevenue = summary.totalRevenue || 1

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Payment Methods */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Payment Methods
        </h3>
        <div className="space-y-3">
          {PAYMENT_BREAKDOWN_CONFIG.map(({ key, label, icon: Icon, color, field }) => {
            const value = (summary as any)[field] || 0
            const percent = (value / totalRevenue) * 100
            const styles = COLOR_STYLES[color]
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${styles.bg} ${styles.text}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(value)}
                    </div>
                    <div className="text-xs text-slate-400">{percent.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${styles.gradient} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Order Types */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Order Types
        </h3>
        <div className="space-y-3">
          {ORDER_TYPE_CONFIG.map(({ key, label, icon: Icon, color, field }) => {
            const value = (summary as any)[field] || 0
            const percent = (value / (summary.totalOrders || 1)) * 100
            const styles = COLOR_STYLES[color]
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${styles.bg} ${styles.text}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {value}
                    </div>
                    <div className="text-xs text-slate-400">{percent.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${styles.gradient} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
