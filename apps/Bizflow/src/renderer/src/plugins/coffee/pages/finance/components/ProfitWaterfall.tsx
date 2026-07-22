import { TrendingDown, TrendingUp, Minus, Package } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { LucideIcon } from 'lucide-react'
import { formatMoney, formatPercent } from '../utils'

interface WaterfallData {
  grossSales: number
  discounts: number
  netSales: number
  cogs: number
  grossProfit: number
  expenses: number
  netProfit: number
  marginPct: number
}

interface Props {
  data: WaterfallData | null
  loading: boolean
}

type StepType = 'positive' | 'negative' | 'subtotal' | 'final'

interface Step {
  label: string
  value: number
  type: StepType
}

export function ProfitWaterfall({ data, loading }: Props) {
  const { t } = useLanguage()
  if (loading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const steps: Step[] = [
    { label: t('cfGrossSales'),  value: data.grossSales,  type: 'positive' },
    { label: t('cfDiscount'),    value: data.discounts,   type: 'negative' },
    { label: t('cfNetSales'),    value: data.netSales,    type: 'subtotal' },
    { label: t('cfCOGS'),         value: data.cogs,        type: 'negative' },
    { label: t('cfGrossProfitLabel'), value: data.grossProfit, type: 'subtotal' },
    { label: t('cfExpenses'),     value: data.expenses,    type: 'negative' },
    { label: t('cfNetProfitLabel'),   value: data.netProfit,   type: 'final' },
  ]

  const maxValue = Math.max(...steps.map(s => Math.abs(s.value)))

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('cfProfitBreakdown')}
        </h3>
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
          {formatPercent(data.marginPct)} {t('cfGrossMargin')}
        </span>
      </div>

      {/* Waterfall steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const widthPct = maxValue > 0 ? (Math.abs(step.value) / maxValue) * 100 : 0

          const isPositive = step.type === 'positive'
          const isNegative = step.type === 'negative'
          const isSubtotal = step.type === 'subtotal'
          const isFinal    = step.type === 'final'

          // Bar colors
          let barColor = 'bg-slate-300 dark:bg-slate-600'
          if (isFinal)    barColor = step.value >= 0 ? 'bg-green-500' : 'bg-red-500'
          else if (isPositive) barColor = 'bg-green-400'
          else if (isNegative) barColor = 'bg-red-400'
          else if (isSubtotal) barColor = 'bg-amber-400'

          // Text colors
          let textColor = 'text-slate-700 dark:text-slate-300'
          if (isFinal)    textColor = step.value >= 0 ? 'text-green-600' : 'text-red-600'
          else if (isPositive) textColor = 'text-green-600'
          else if (isNegative) textColor = 'text-red-500'
          else if (isSubtotal) textColor = 'text-amber-600'

          const prefix = isNegative ? '−' : ''

          return (
            <div key={i}>
              {/* Label + value */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium ${isFinal ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                    {step.label}
                  </span>
                  {isFinal && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      (final)
                    </span>
                  )}
                </div>
                <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
                  {prefix}{formatMoney(Math.abs(step.value))}
                </span>
              </div>

              {/* Bar */}
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>

              {/* Divider after subtotals */}
              {isSubtotal && i < steps.length - 1 && (
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 mt-3" />
              )}
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
        {/* Net profit */}
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Net Profit
          </div>
          <div
            className={`text-lg font-bold tabular-nums ${
              data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {data.netProfit >= 0 ? '+' : '−'}
            {formatMoney(Math.abs(data.netProfit))}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {data.netProfit >= 0 ? 'Profit' : 'Loss'}
          </div>
        </div>

        {/* Revenue to profit */}
        <div className="text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Revenue → Profit
          </div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {formatMoney(data.grossSales)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">→ {formatMoney(data.netProfit)}</div>
        </div>
      </div>
    </div>
  )
}
