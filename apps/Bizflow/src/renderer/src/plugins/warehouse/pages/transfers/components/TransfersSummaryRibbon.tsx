import React from 'react'
import { FileEdit, Truck, CheckCircle2, XCircle } from 'lucide-react'
import { TransferMetrics } from '../types'

interface Props {
  metrics: TransferMetrics
}

export const TransfersSummaryRibbon: React.FC<Props> = ({ metrics }) => {
  const cards = [
    {
      label: 'Draft Staging',
      value: metrics.draft,
      icon: FileEdit,
      color: 'text-slate-500 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800'
    },
    {
      label: 'Active In-Transit',
      value: metrics.inTransit,
      icon: Truck,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/40'
    },
    {
      label: 'Completed & Reconciled',
      value: metrics.completed,
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      label: 'Cancelled',
      value: metrics.cancelled,
      icon: XCircle,
      color: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</div>
              <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                {card.value}
              </div>
            </div>
            <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        )
      })}
    </div>
  )
}