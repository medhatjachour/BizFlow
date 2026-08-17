import React from 'react'
import { Target, DollarSign, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import type { ClinicOverview, TrendMetric } from '../types'

interface Props {
  overview: ClinicOverview
  collectionRate: number
  avgSessionValue: number
  revenueTrend: TrendMetric
}

export const FinancialPerformanceBar: React.FC<Props> = ({
  overview,
  collectionRate,
  avgSessionValue,
  revenueTrend
}) => {
  const { t } = useLanguage()

  const barColor =
    collectionRate >= 80 ? 'bg-emerald-500' : collectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Collection Compliance Gauge */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-teal-600" />
            {t('collectionRate') || 'Collection Rate'}
          </span>
          <span className="text-xs font-extrabold text-teal-600">{collectionRate}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${collectionRate}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-medium">Billed revenue paid on session date</p>
      </div>

      {/* 2. Average Ticket Value */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          <DollarSign className="h-4 w-4 text-indigo-500" />
          <span>Avg Session Value</span>
        </div>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
          {formatCurrency(avgSessionValue)}
        </p>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">Per patient consultation this month</p>
      </div>

      {/* 3. Cashflow Realization */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Cash Realized vs Outstanding (Mo.)
          </span>
          {revenueTrend.dir !== 'flat' && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold ${
                revenueTrend.dir === 'up' ? 'text-emerald-600' : 'text-rose-500'
              }`}
            >
              {revenueTrend.dir === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {revenueTrend.pct}% vs last month
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-slate-400">Collected Revenue</p>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(overview.revenueThisMonth)}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 rtl:-scale-x-100" />
          <div>
            <p className="text-xs font-semibold text-slate-400">Outstanding Balance</p>
            <p className="text-lg font-extrabold text-rose-500">
              {formatCurrency(overview.outstandingThisMonth)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}