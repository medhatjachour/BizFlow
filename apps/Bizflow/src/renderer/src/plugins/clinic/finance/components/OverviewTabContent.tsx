import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatMoney, getCategoryBadgeClass } from '../utils'
import { FinanceKpiCard } from './FinanceKpiCard'
import type { FinanceSummary, SpendBreakdownEntry, Period } from '../types'

interface Props {
  summary: FinanceSummary | null
  breakdown: SpendBreakdownEntry[]
  loading: boolean
  period: Period
}

export const OverviewTabContent: React.FC<Props> = ({
  summary,
  breakdown,
  loading,
  period
}) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!summary) return null

  const isNetPositive = summary.netIncome >= 0
  const collectionPct =
    summary.revenue + summary.outstanding > 0
      ? Math.round((summary.revenue / (summary.revenue + summary.outstanding)) * 100)
      : 0

  return (
    <div className="space-y-5">
      {/* Net Income Hero Banner */}
      <div
        className={`rounded-3xl p-6 shadow-md text-white transition-all ${
          isNetPositive
            ? 'bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 shadow-teal-500/20'
            : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 shadow-rose-500/20'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-85 mb-1">
              {t('netIncomeLabel') || 'Net Operational Income'} • {period.toUpperCase()}
            </p>
            <p className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
              {summary.netIncome < 0 ? '−' : '+'}${formatMoney(Math.abs(summary.netIncome))}
            </p>
            <p className="text-xs font-medium opacity-80 mt-1.5">
              {isNetPositive
                ? t('profitablePeriod') || 'Operating at positive net cashflow'
                : t('expensesExceedRevenue') || 'Operating expenses exceed collected revenue'}{' '}
              • ${formatMoney(summary.revenue)} {t('collectedLabel') || 'realized in cash'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-xs shrink-0">
            {isNetPositive ? <TrendingUp className="h-7 w-7" /> : <TrendingDown className="h-7 w-7" />}
          </div>
        </div>

        {/* Glanceable Micro Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/20">
          <div>
            <p className="text-[11px] opacity-70 uppercase tracking-wider mb-0.5">{t('revenueLabel') || 'Revenue'}</p>
            <p className="text-base sm:text-lg font-black tabular-nums">${formatMoney(summary.revenue)}</p>
          </div>
          <div>
            <p className="text-[11px] opacity-70 uppercase tracking-wider mb-0.5">{t('expensesLabel') || 'Expenses'}</p>
            <p className="text-base sm:text-lg font-black tabular-nums">${formatMoney(summary.totalExpenses)}</p>
          </div>
          <div>
            <p className="text-[11px] opacity-70 uppercase tracking-wider mb-0.5">{t('outstandingLabel') || 'Outstanding'}</p>
            <p className="text-base sm:text-lg font-black tabular-nums">${formatMoney(summary.outstanding)}</p>
          </div>
        </div>
      </div>

      {/* Secondary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <FinanceKpiCard
          label={t('kpiPayrollCost') || 'Staff Payroll'}
          value={`$${formatMoney(summary.totalSalaries ?? 0)}`}
          icon={Users}
          colorClass="text-violet-600 dark:text-violet-400"
          bgClass="bg-violet-50/60 dark:bg-violet-950/20"
          sub={t('kpiStaffSalaries') || 'Clinical & support team payroll'}
        />
        <FinanceKpiCard
          label={t('kpiTotalExpenses') || 'Operational Outflows'}
          value={`$${formatMoney(summary.totalExpenses)}`}
          icon={TrendingDown}
          colorClass="text-rose-600 dark:text-rose-400"
          bgClass="bg-rose-50/60 dark:bg-rose-950/20"
          sub={t('kpiInclPayroll') || 'Including payroll & suppliers'}
        />
        <FinanceKpiCard
          label={t('kpiCollectionRate') || 'Collection Efficiency'}
          value={`${collectionPct}%`}
          icon={TrendingUp}
          colorClass={collectionPct >= 80 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}
          bgClass={collectionPct >= 80 ? 'bg-teal-50/60 dark:bg-teal-950/20' : 'bg-amber-50/60 dark:bg-amber-950/20'}
          sub={t('kpiBilledVsCollected') || 'Cash realized against billed totals'}
        />
        <FinanceKpiCard
          label={t('kpiUncollected') || 'Uncollected Balance'}
          value={`$${formatMoney(summary.outstanding)}`}
          icon={AlertCircle}
          colorClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-50/60 dark:bg-amber-950/20"
          sub={t('kpiPendingPayment') || 'Patient receivables due'}
        />
      </div>

      {/* Spend Over Time Bar Chart */}
      {breakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('spendOverTime') || 'Spend Trend Over Current Period'}
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={breakdown} margin={{ top: 0, right: 8, left: -8, bottom: 0 }} barSize={period === 'year' ? 30 : 18}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
                  fontSize: '12px',
                  background: '#0f172a',
                  color: '#ffffff'
                }}
                formatter={(v: any) => [`$${formatMoney(v)}`, t('expensesLabel') || 'Expense']}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expenses by Category Progress Matrix */}
      {summary.byCategory.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            {t('expensesByCategory') || 'Expenses Distribution by Category'}
          </h3>

          <div className="space-y-3">
            {summary.byCategory.slice(0, 8).map(({ category, total }) => {
              const badgeCls = getCategoryBadgeClass(category)
              const pct = Math.max(4, Math.round((total / Math.max(1, summary.totalExpenses)) * 100))

              return (
                <div key={category} className="flex items-center gap-3">
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold w-32 text-center truncate border shadow-2xs ${badgeCls}`}
                  >
                    {category.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 w-24 text-end tabular-nums">
                    ${formatMoney(total)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}