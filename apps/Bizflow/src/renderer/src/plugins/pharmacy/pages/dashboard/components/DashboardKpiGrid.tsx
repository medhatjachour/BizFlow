import React from 'react'
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Package,
  Activity,
  Wallet,
} from 'lucide-react'
import { DashboardOverview, DashboardPeriod } from '../types'
import { money, int } from '../../components/_shared'

interface DashboardKpiGridProps {
  overview: DashboardOverview
  period: DashboardPeriod
  showProfit: boolean
}

export const DashboardKpiGrid: React.FC<DashboardKpiGridProps> = ({
  overview,
  period,
  showProfit,
}) => {
  const s = overview.sales ?? {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    margin: 0,
    saleCount: 0,
    unitsSold: 0,
  }

  const kpis = [
    {
      label: "Today's Revenue",
      value: `$${money(overview.today?.revenue ?? 0)}`,
      sub: `${int(overview.today?.saleCount?? 0)} sales today`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: `Revenue (${period})`,
      value: `$${money(s.revenue)}`,
      sub: showProfit ? `Profit: $${money(s.grossProfit)}` : `${int(s.saleCount)} orders`,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: `Sales Count (${period})`,
      value: int(s.saleCount),
      sub: `${int(s.unitsSold)} units dispensed`,
      icon: ShoppingBag,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Inventory Asset Value',
      value: `$${money(overview.stockValue)}`,
      sub: `${int(overview.activeProducts)} catalog SKUs`,
      icon: Package,
      color: 'text-teal-600 dark:text-teal-400',
    },
    ...(showProfit
      ? [
          {
            label: 'Operating Margin',
            value: `${(s.margin || 0).toFixed(1)}%`,
            sub: `COGS: $${money(s.cogs)}`,
            icon: Activity,
            color:
              (s.margin || 0) >= 25
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
          },
        ]
      : []),
    {
      label: 'Total Receivables',
      value: `$${money(overview.outstanding)}`,
      sub: 'Unpaid customer balances',
      icon: Wallet,
      color: overview.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {kpis.map(k => (
        <div
          key={k.label}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <k.icon size={14} className={k.color} />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                {k.label}
              </span>
            </div>
            <p className={`text-base font-extrabold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}