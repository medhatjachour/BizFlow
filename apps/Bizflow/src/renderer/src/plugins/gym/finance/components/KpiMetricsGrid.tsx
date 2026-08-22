import React from 'react'
import { ArrowUpRight, ArrowDownRight, CreditCard, UserCheck, TrendingDown, DollarSign } from 'lucide-react'
import { GymStatsOverview } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  stats: GymStatsOverview
}

export const KpiMetricsGrid: React.FC<Props> = ({ stats }) => {
  const isNetPositive = stats.netIncome >= 0

  const cards = [
    {
      label: 'Membership Subscriptions',
      value: stats.subRevenue,
      icon: CreditCard,
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      label: 'Walk-in & Guest Passes',
      value: stats.walkRevenue,
      icon: UserCheck,
      badgeColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20'
    },
    {
      label: 'Operational Expenses',
      value: stats.totalExpenses,
      icon: TrendingDown,
      badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
    },
    {
      label: 'Net Operating Income',
      value: stats.netIncome,
      icon: DollarSign,
      badgeColor: isNetPositive
        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon
        return (
          <div
            key={idx}
            className="group relative overflow-hidden bg-white dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:translate-y-[-1px]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl border ${card.badgeColor}`}>
                <IconComponent size={16} />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(card.value)}
              </h3>
              <div className="flex items-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {card.value >= 0 ? (
                  <ArrowUpRight size={13} className="text-emerald-500" />
                ) : (
                  <ArrowDownRight size={13} className="text-rose-500" />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}