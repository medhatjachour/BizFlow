import { TrendingUp, Layers, BarChart3, ShoppingBag, AlertTriangle, Clock } from 'lucide-react'
import type { ShiftSummary } from '../types'
import { formatMoney } from '../utils'

interface Props {
  summary: ShiftSummary | null
  loading: boolean
}

export function SummaryCards({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-3" />
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Sales',
      value: formatMoney(summary.totalSales),
      sub:   `${summary.totalShifts} shifts`,
      icon:  TrendingUp,
      color: '#16a34a',
      bg:    'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Total Orders',
      value: String(summary.totalOrders),
      sub:   'across all shifts',
      icon:  ShoppingBag,
      color: '#7c3aed',
      bg:    'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: 'Avg Shift Sales',
      value: formatMoney(summary.averageShiftSales),
      sub:   'per shift',
      icon:  BarChart3,
      color: '#0891b2',
      bg:    'bg-cyan-50 dark:bg-cyan-900/20',
    },
    {
      label: 'Avg Orders/Shift',
      value: summary.averageOrdersPerShift.toFixed(1),
      sub:   'orders per shift',
      icon:  Layers,
      color: '#ea580c',
      bg:    'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Avg Cash Diff',
      value: (summary.averageCashDifference > 0 ? '+' : '') + formatMoney(summary.averageCashDifference),
      sub:   'variance average',
      icon:  AlertTriangle,
      color: summary.averageCashDifference < 0 ? '#dc2626' : summary.averageCashDifference > 0 ? '#2563eb' : '#16a34a',
      bg:    summary.averageCashDifference < 0 ? 'bg-red-50 dark:bg-red-900/20' : summary.averageCashDifference > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Longest Shift',
      value: `${Math.floor(summary.longestShiftMinutes / 60)}h ${summary.longestShiftMinutes % 60}m`,
      sub:   'maximum duration',
      icon:  Clock,
      color: '#a16207',
      bg:    'bg-amber-50 dark:bg-amber-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.label} className={`relative overflow-hidden rounded-xl p-4 border border-slate-200 dark:border-slate-700 ${card.bg}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {card.label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.color + '20', color: card.color }}
              >
                <Icon size={14} />
              </div>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-whiteular-nums">
              {card.value}
            </div>
            <div className="text-[11px text-slate-500 dark:text-slate-400 mt-0.5">
              {card.sub}
            </div>
          </div>
        )
      })}
    </div>
  )
}
