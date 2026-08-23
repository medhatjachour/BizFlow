import React from 'react'
import { MapPin, Boxes, TrendingUp, ArrowRightLeft, AlertTriangle } from 'lucide-react'
import { DashboardKPIData } from '../types'
import { formatCompactCurrency } from '../utils'

interface Props {
  kpis: DashboardKPIData
}

export const DashboardKPIs: React.FC<Props> = ({ kpis }) => {
  const cards = [
    {
      label: 'Active Locations',
      value: kpis.totalLocations,
      sub: `${kpis.lowStockLocations} with low stock`,
      icon: MapPin,
      color: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40'
    },
    {
      label: 'Total Stock Value',
      value: formatCompactCurrency(kpis.stockValue),
      sub: `${kpis.totalSKUs.toLocaleString()} Catalog SKUs`,
      icon: Boxes,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      label: 'Volume Utilization',
      value: `${kpis.utilizationPct.toFixed(0)}%`,
      sub: `${kpis.totalUnits.toLocaleString()} / ${kpis.totalCapacity.toLocaleString()} Units`,
      icon: TrendingUp,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      label: "Today's Transfers",
      value: kpis.todayTransfersCount,
      sub: `${kpis.pendingTransfersCount} pending dispatch`,
      icon: ArrowRightLeft,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/40'
    },
    {
      label: 'Critical Depletions',
      value: kpis.criticalItemsCount,
      sub: kpis.criticalItemsCount > 0 ? 'Restock required' : 'Optimal threshold',
      icon: AlertTriangle,
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 space-y-0.5">
              <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </div>
              <div className="text-[10.5px] text-slate-400 truncate">{card.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}