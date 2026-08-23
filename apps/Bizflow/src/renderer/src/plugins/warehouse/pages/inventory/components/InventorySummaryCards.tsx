import React from 'react'
import { Package, Layers, AlertTriangle, XCircle, ShieldAlert, HeartPulse } from 'lucide-react'
import { StockSummary } from '../types'

interface Props {
  summary: StockSummary
}

export const InventorySummaryCards: React.FC<Props> = ({ summary }) => {
  const cards = [
    {
      label: 'Tracked SKUs',
      value: summary.totalSKUs.toLocaleString(),
      icon: Package,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      label: 'Total Units',
      value: summary.totalUnits.toLocaleString(),
      icon: Layers,
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40'
    },
    {
      label: 'Low Stock Risk',
      value: summary.lowStockCount,
      icon: AlertTriangle,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40'
    },
    {
      label: 'Out of Stock',
      value: summary.outOfStockCount,
      icon: XCircle,
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40'
    },
    {
      label: 'Quarantine / Damaged',
      value: summary.quarantineCount,
      icon: ShieldAlert,
      color: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40'
    },
    {
      label: 'Stock Health Rate',
      value: `${summary.healthRate}%`,
      icon: HeartPulse,
      color: summary.healthRate >= 80 ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400',
      bg: summary.healthRate >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-amber-50 dark:bg-amber-950/40'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {card.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}