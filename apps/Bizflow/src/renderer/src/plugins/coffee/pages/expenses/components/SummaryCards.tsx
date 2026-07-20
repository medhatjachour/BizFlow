import { Wallet, Link2, Unlink, TrendingUp } from 'lucide-react'
import type { Summary } from '../types'
import { formatMoney } from '../utils'

interface Props {
  summary: Summary | null
  loading: boolean
}

export function SummaryCards({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label:  'Total Expenses',
      value:  formatMoney(summary.totalExpenses),
      sub:    `${summary.expenseCount} transactions`,
      icon:   Wallet,
      color:  '#dc2626',
      bg:     'bg-red-50 dark:bg-red-900/20',
      ring:   'ring-red-200 dark:ring-red-800',
    },
    {
      label:  'Linked to Shifts',
      value:  formatMoney(summary.linkedToShifts),
      sub:    'shift expenses',
      icon:   Link2,
      color:  '#16a34a',
      bg:     'bg-green-50 dark:bg-green-900/20',
      ring:   'ring-green-200 dark:ring-green-800',
    },
    {
      label:  'Unlinked',
      value:  formatMoney(summary.unlinkedExpenses),
      sub:    'manual entries',
      icon:   Unlink,
      color:  '#ea580c',
      bg:     'bg-orange-50 dark:bg-orange-900/20',
      ring:   'ring-orange-200 dark:ring-orange-800',
    },
    {
      label:  'Average',
      value:  formatMoney(summary.averageExpense),
      sub:    'per transaction',
      icon:   TrendingUp,
      color:  '#7c3aed',
      bg:     'bg-violet-50 dark:bg-violet-900/20',
      ring:   'ring-violet-200 dark:ring-violet-800',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.bg.includes('red') ? 'rgba(220,38,38,0.12)' : undefined }}
              >
                <Icon size={16} style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {card.value}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {card.sub}
            </div>
          </div>
        )
      })}
    </div>
  )
}
