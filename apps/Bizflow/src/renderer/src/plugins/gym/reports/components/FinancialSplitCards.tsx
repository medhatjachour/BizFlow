import React from 'react'
import { TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard } from 'lucide-react'
import { GymReportStats } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  stats: GymReportStats
}

export const FinancialSplitCards: React.FC<Props> = ({ stats }) => {
  const isNetPositive = stats.netIncome >= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Subscriptions */}
      <div className="bg-white dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Subscription Income
          </span>
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <CreditCard size={15} />
          </div>
        </div>
        <p className="text-xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
          {formatCurrency(stats.subRevenue)}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">Recurring membership plans</p>
      </div>

      {/* Walk-in Passes */}
      <div className="bg-white dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Walk-in & Guest Revenue
          </span>
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Wallet size={15} />
          </div>
        </div>
        <p className="text-xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">
          {formatCurrency(stats.walkRevenue)}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">Day passes & single sessions</p>
      </div>

      {/* Net Outcome */}
      <div
        className={`border rounded-2xl p-4 shadow-sm transition-all ${
          isNetPositive
            ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/10 border-emerald-500/25'
            : 'bg-rose-500/[0.04] dark:bg-rose-500/10 border-rose-500/25'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {isNetPositive ? (
              <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown size={15} className="text-rose-600 dark:text-rose-400" />
            )}
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Net Report Income
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <DollarSign size={15} />
          </div>
        </div>
        <p
          className={`text-xl font-black tabular-nums ${
            isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {formatCurrency(stats.netIncome)}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Gross: {formatCurrency(stats.revenue)} | Expenses: {formatCurrency(stats.totalExpenses)}
        </p>
      </div>
    </div>
  )
}