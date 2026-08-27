import React from 'react'
import { Receipt, TrendingUp, DollarSign, BarChart2, AlertCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { HistoryViewMode } from '../types'

interface Props {
  viewMode: HistoryViewMode
  kpis: {
    count: number
    revenue: number
    cogs: number
    grossProfit: number
    outstanding: number
  }
}

export const HistoryStatsKPI: React.FC<Props> = ({ viewMode, kpis }) => {
  const { t } = useLanguage()

  const cards = [
    {
      label: viewMode === 'grouped' ? t('vetTransactions') || 'Transactions' : t('vetTotalSales') || 'Total Lines',
      val: kpis.count.toLocaleString(),
      icon: Receipt,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50/70 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40'
    },
    {
      label: t('vetRevenue') || 'Page Revenue',
      val: `$${kpis.revenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40'
    },
    {
      label: t('vetCOGS') || 'Cost of Goods',
      val: `$${kpis.cogs.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50/70 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/40'
    },
    {
      label: t('vetGrossProfit') || 'Gross Profit',
      val: `$${kpis.grossProfit.toFixed(2)}`,
      icon: BarChart2,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50/70 border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/40'
    },
    {
      label: t('vetOutstanding') || 'Receivables',
      val: `$${kpis.outstanding.toFixed(2)}`,
      icon: AlertCircle,
      color: kpis.outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500',
      bg:
        kpis.outstanding > 0
          ? 'bg-rose-50/70 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40'
          : 'bg-slate-50/70 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800'
    }
  ]

  return (
    <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
      {cards.map(c => (
        <div
          key={c.label}
          className={`${c.bg} border rounded-2xl p-3 flex items-center gap-3 transition-all`}
        >
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm shrink-0">
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-base font-black tracking-tight ${c.color} leading-tight truncate`}>
              {c.val}
            </p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 truncate uppercase tracking-wider">
              {c.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}