import React from 'react'
import { MapPin, ArrowRightLeft, AlertTriangle, TrendingUp } from 'lucide-react'

interface Props {
  totalLocations: number
  transfersCount: number
  criticalCount: number
  totalValue: number
  totalUnits: number
}

export const TodayActivityRibbon: React.FC<Props> = ({
  totalLocations,
  transfersCount,
  criticalCount,
  totalValue,
  totalUnits
}) => {
  const cards = [
    {
      label: 'Active Facilities',
      value: totalLocations,
      sub: 'configured zones & bins',
      icon: MapPin,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      label: "Today's Transfers",
      value: transfersCount,
      sub: 'dispatched manifests',
      icon: ArrowRightLeft,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/40'
    },
    {
      label: 'Critical Stock Alerts',
      value: criticalCount,
      sub: 'requires replenishment',
      icon: AlertTriangle,
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40'
    },
    {
      label: 'Total Asset Capital',
      value: `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${totalUnits.toLocaleString()} units on hand`,
      icon: TrendingUp,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </div>
              <div className="text-[10.5px] text-slate-400">{card.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}