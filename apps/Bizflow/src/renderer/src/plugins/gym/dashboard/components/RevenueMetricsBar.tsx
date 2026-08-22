import React from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { GymDashboardOverview } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  stats: GymDashboardOverview
}

export const RevenueMetricsBar: React.FC<Props> = ({ stats }) => {
  const { t } = useLanguage()

  const metrics = [
    {
      label: t('gymSubRevenue') ?? 'Subscription Inflow',
      value: formatCurrency(stats.subRevenue),
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      label: t('gymWalkRevenue') ?? 'Walk-in / Guest Passes',
      value: formatCurrency(stats.walkRevenue),
      color: 'text-teal-600 dark:text-teal-400'
    },
    {
      label: t('gymExpenses') ?? 'Operational Outflow',
      value: formatCurrency(stats.totalExpenses),
      color: 'text-rose-600 dark:text-rose-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {metrics.map((m, idx) => (
        <div
          key={idx}
          className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-200/80 dark:border-slate-700/70 shadow-inner"
        >
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 mb-0.5 uppercase tracking-wider">
            {m.label}
          </p>
          <p className={`text-sm font-extrabold ${m.color} tabular-nums`}>{m.value}</p>
        </div>
      ))}
    </div>
  )
}