import { Wallet, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { FinanceOverview } from '../types'
import { formatMoney, formatNumber } from '../utils'

interface Props {
  overview: FinanceOverview | null
  variance: number
  loading: boolean
}

export function DrawerSettlement({ overview, variance, loading }: Props) {
  const { t } = useLanguage()
  if (loading || !overview) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const s = overview.shiftStats
  const isBalanced = variance === 0
  const isOver = variance > 0
  const isShort = variance < 0

  const cashRows = [
    { label: t('cfOpeningCash'),    value: s.openingCash,    sign: '',  color: 'text-slate-600 dark:text-slate-400' },
    { label: t('cfCashSales'),      value: s.cashSales,      sign: '+', color: 'text-green-600' },
    { label: t('cfExpectedDrawer'), value: s.expectedDrawer, sign: '=', color: 'text-slate-900 dark:text-white font-semibold' },
    { label: t('cfClosingCash'),  value: s.closingCash,    sign: '',  color: 'text-slate-900 dark:text-white font-semibold' },
  ]

  const expenseRows = [
    { label: t('cfLinkedExpenses'), value: s.linkedExpenseTotal,    sign: '−', color: 'text-orange-600' },
    { label: t('cfAfterExpenses'),  value: s.expectedAfterExpenses, sign: '=', color: 'text-slate-900 dark:text-white font-semibold' },
  ]

  const extraStats = [
    { label: t('cfClosedShifts'),     value: formatNumber(s.closedShifts) },
    { label: t('cfAvgDiscount'),      value: formatMoney(overview.avgDiscountPerOrder) },
    { label: t('cfDiscountedOrders'), value: formatNumber(overview.discountedOrders) },
    { label: t('cfOpenOrderValue'),  value: formatMoney(overview.openOrdersValue) },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('cfDrawerSettlement')}
          </h3>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {s.closedShifts} {t('cfShifts')} {t('cfClosed')}
        </span>
      </div>

      {/* Variance banner */}
      <div
        className={`rounded-lg p-3 mb-5 flex items-center gap-3 ${
          isBalanced
            ? 'bg-green-50 dark:bg-green-900/20'
            : isOver
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
        }`}
      >
        {isBalanced ? (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        ) : isOver ? (
          <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
        )}
        <div className="flex-1">
          <div
            className={`text-sm font-semibold ${
              isBalanced
                ? 'text-green-700 dark:text-green-400'
                : isOver
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {isBalanced
              ? 'Balanced'
              : isOver
              ? `Over by ${formatMoney(variance)}`
              : `Short by ${formatMoney(Math.abs(variance))}`}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isBalanced
              ? 'Drawer matches expected amount'
              : isOver
              ? 'More cash than expected'
              : 'Less cash than expected'}
          </div>
        </div>
      </div>

      {/* Cash flow rows */}
      <div className="space-y-2 mb-4">
        {cashRows.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {r.label}
              <span className="text-slate-400 ml-1">{r.sign}</span>
            </span>
            <span className={`tabular-nums ${r.color}`}>
              {formatMoney(r.value)}
            </span>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-3" />

        {expenseRows.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {r.label}
              <span className="text-slate-400 ml-1">{r.sign}</span>
            </span>
            <span className={`tabular-nums ${r.color}`}>
              {formatMoney(r.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Extra stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        {extraStats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              {stat.label}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
