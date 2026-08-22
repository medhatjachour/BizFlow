import React from 'react'
import { GymStatsOverview } from '../types'
import { formatCurrency, calculateProfitMargin } from '../utils'
import { Percent, TrendingUp, AlertTriangle } from 'lucide-react'

interface Props {
  stats: GymStatsOverview
}

export const ProfitComparisonCard: React.FC<Props> = ({ stats }) => {
  const margin = calculateProfitMargin(stats.revenue, stats.netIncome)
  const isHealthy = stats.netIncome >= 0
  const maxVal = Math.max(stats.revenue, stats.totalExpenses, 1)
  const revPct = (stats.revenue / maxVal) * 100
  const expPct = (stats.totalExpenses / maxVal) * 100

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/95 dark:to-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Revenue vs. Expense Dynamics</h2>
          <p className="text-xs text-slate-400">Net operating balance and relative margin index</p>
        </div>

        {/* Profit Margin Pill */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
            isHealthy
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}
        >
          {isHealthy ? <TrendingUp size={13} /> : <AlertTriangle size={13} />}
          <span>Profit Margin: {margin.toFixed(1)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Visual Comparative Bars */}
        <div className="lg:col-span-8 space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600 dark:text-slate-300">Total Inflow (Revenue)</span>
              <span className="text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(stats.revenue)}</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${revPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-600 dark:text-slate-300">Total Outflow (Expenses)</span>
              <span className="text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(stats.totalExpenses)}</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${expPct}%` }} />
            </div>
          </div>
        </div>

        {/* Highlighted Net Callout */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700/60 pt-4 lg:pt-0 lg:pl-6 text-left lg:text-right">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Calculated Net Result</span>
          <div
            className={`text-2xl font-black tabular-nums tracking-tight mt-0.5 ${
              isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(stats.netIncome)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isHealthy ? 'Operating comfortably in profit' : 'Operating under deficit this term'}
          </p>
        </div>
      </div>
    </div>
  )
}