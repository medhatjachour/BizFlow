import React from 'react'
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  X,
  ArrowUpRight,
  RefreshCcw,
  Loader2
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatMoney, getInitials } from '../utils'
import { FinanceKpiCard } from './FinanceKpiCard'
import type { PatientWithFinance, RevenueBreakdownEntry, Period } from '../types'

interface Props {
  summary: { revenue: number; outstanding: number } | null
  debtPatients: PatientWithFinance[]
  debtMeta: { total: number; totalOutstanding: number; hasMore: boolean }
  debtSearchInput: string
  debtSearch: string
  revBreakdown: RevenueBreakdownEntry[]
  loading: boolean
  loadingMore: boolean
  period: Period
  onSearchChange: (v: string) => void
  onLoadMore: () => void
  onRefresh: () => void
}

export const RevenueTabContent: React.FC<Props> = ({
  summary,
  debtPatients,
  debtMeta,
  debtSearchInput,
  debtSearch,
  revBreakdown,
  loading,
  loadingMore,
  period,
  onSearchChange,
  onLoadMore,
  onRefresh
}) => {
  const { t } = useLanguage()

  return (
    <div className="space-y-5">
      {/* Collection Health KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <FinanceKpiCard
            label={t('kpiTotalBilled') || 'Total Invoiced'}
            value={`$${formatMoney(summary.revenue + summary.outstanding)}`}
            icon={Receipt}
            colorClass="text-slate-700 dark:text-slate-200"
            bgClass="bg-slate-50 dark:bg-slate-800/40"
            sub={period.toUpperCase()}
          />
          <FinanceKpiCard
            label={t('kpiCollected') || 'Realized Cash'}
            value={`$${formatMoney(summary.revenue)}`}
            icon={CheckCircle2}
            colorClass="text-emerald-600 dark:text-emerald-400"
            bgClass="bg-emerald-50/60 dark:bg-emerald-950/20"
            sub={t('kpiCashInHand') || 'Collected in period'}
          />
          <FinanceKpiCard
            label={t('outstandingLabel') || 'Awaiting Collection'}
            value={`$${formatMoney(summary.outstanding)}`}
            icon={AlertCircle}
            colorClass="text-rose-600 dark:text-rose-400"
            bgClass="bg-rose-50/60 dark:bg-rose-950/20"
            sub={t('kpiAwaitingPayment') || 'Due from patients'}
          />
          <FinanceKpiCard
            label={t('kpiCollectionRate') || 'Collection Efficiency'}
            value={
              summary.revenue + summary.outstanding > 0
                ? `${Math.round((summary.revenue / (summary.revenue + summary.outstanding)) * 100)}%`
                : '–'
            }
            icon={TrendingUp}
            colorClass={
              summary.revenue / Math.max(1, summary.revenue + summary.outstanding) >= 0.8
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-amber-600 dark:text-amber-400'
            }
            bgClass={
              summary.revenue / Math.max(1, summary.revenue + summary.outstanding) >= 0.8
                ? 'bg-teal-50/60 dark:bg-teal-950/20'
                : 'bg-amber-50/60 dark:bg-amber-950/20'
            }
            sub={t('kpiBilledVsCollected') || 'Payment compliance'}
          />
        </div>
      )}

      {/* Revenue Outflow Chart */}
      {revBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            {t('expenseSpendingOverPeriod') || 'Operating Outflows Over Current Period'}
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={revBreakdown} margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
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
                formatter={(v: any) => [`$${formatMoney(v)}`, t('expensesLabel') || 'Expenses']}
              />
              <Bar dataKey="expenses" fill="#f87171" opacity={0.8} radius={[6, 6, 0, 0]} barSize={18} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Patient Debt Ledger Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs">
        {/* Ledger Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              {t('outstandingBalances') || 'Patient Receivables & Outstanding Balances'}
            </span>
            {debtMeta.total > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-extrabold">
                {debtMeta.total}
              </span>
            )}
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-600 transition-colors font-bold"
          >
            <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> {t('refreshLabel') || 'Refresh'}
          </button>
        </div>

        {/* Debtor Search Input */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              value={debtSearchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchDebtorPlaceholder') || 'Search debtor name or phone...'}
              className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-900 ps-9 pe-9 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {debtSearchInput && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Debtor Records List */}
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-14 bg-slate-100 dark:bg-slate-700/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : debtMeta.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {t('allPatientsPaid') || 'All Patient Accounts Fully Settled'}
            </p>
            <p className="text-xs text-slate-400 mt-1">No pending debt or uncollected balances in this record set.</p>
          </div>
        ) : (
          <>
            {/* Totals Banner */}
            <div className="flex items-center justify-between px-6 py-3 bg-rose-50/70 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                {debtMeta.total} {t('patientsOweTotal') || 'patient accounts owe a combined total of'}
              </span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                ${formatMoney(debtMeta.totalOutstanding)}
              </span>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {debtPatients.map((p) => {
                const fin = p.finance!
                const rate = fin.totalCharged > 0 ? Math.round((fin.totalPaid / fin.totalCharged) * 100) : 0

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0 shadow-xs text-white font-black text-xs">
                      {getInitials(p.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                          {p.name}
                        </span>
                        {p.phone && (
                          <span className="text-xs text-slate-400 font-medium shrink-0" dir="ltr">
                            {p.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 max-w-[120px] bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 shrink-0">{rate}%</span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          {t('billedLabel') || 'Billed'}:{' '}
                          <strong className="text-slate-700 dark:text-slate-200">${formatMoney(fin.totalCharged)}</strong> •{' '}
                          {t('paidLabel') || 'Paid'}:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400">${formatMoney(fin.totalPaid)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        ${formatMoney(fin.outstanding)}
                      </span>
                      <a
                        href={`#/clinic/patients/${p.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.hash = `/clinic/patients/${p.id}`
                        }}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline transition-opacity shrink-0"
                      >
                        <span>{t('viewPatientLink') || 'Profile'}</span>
                        <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination / Load More */}
            {debtMeta.hasMore && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/20">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-50 shadow-xs"
                >
                  {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>
                    {loadingMore
                      ? t('loadingMore') || 'Loading...'
                      : `${t('loadMore') || 'Load More Records'} (${debtMeta.total - debtPatients.length} ${
                          t('remaining') || 'remaining'
                        })`}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}