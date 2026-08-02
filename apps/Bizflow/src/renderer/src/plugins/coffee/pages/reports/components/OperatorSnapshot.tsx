import { Clock3, Truck, Repeat, Calendar, CalendarX, TrendingDown } from 'lucide-react'
import { Overview } from '../types'
import { formatCurrency, formatHour, formatDateDisplay } from '../utils'

interface OperatorSnapshotProps {
  overview: Overview | null
  loading: boolean
  t: (key: string) => string
}

export function OperatorSnapshot({ overview, loading, t }: OperatorSnapshotProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!overview) return null

  const stats = [
    {
      icon: Clock3,
      label: 'Peak Hour',
      value: formatHour(overview.peakHour.hour),
      sub: `${overview.peakHour.value} orders`,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      icon: Truck,
      label: 'Delivery Revenue',
      value: formatCurrency(overview.deliveryRevenue),
      sub: `${overview.totalRevenue ? ((overview.deliveryRevenue / overview.totalRevenue) * 100).toFixed(1) : '0.0'}% of total`,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    },
    {
      icon: Repeat,
      label: 'Repeat Rate',
      value: `${overview.repeatCustomerRatePct.toFixed(1)}%`,
      sub: `${overview.repeatCustomers} customers`,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      icon: Calendar,
      label: t('cfBestDay'),
      value: overview.bestDay.date ? formatDateDisplay(overview.bestDay.date) : '-',
      sub: overview.bestDay.date ? `${formatCurrency(overview.bestDay.revenue)} • ${overview.bestDay.orders} orders` : 'No data',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-500/10',
    },
    {
      icon: TrendingDown,
      label: t('cfWorstDay'),
      value: overview.worstDay.date ? formatDateDisplay(overview.worstDay.date) : '-',
      sub: overview.worstDay.date ? `${formatCurrency(overview.worstDay.revenue)} • ${overview.worstDay.orders} orders` : 'No data',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      icon: CalendarX,
      label: 'Low/Out of Stock',
      value: `${overview.lowStockCount + overview.outOfStockCount}`,
      sub: `${overview.lowStockCount} low • ${overview.outOfStockCount} out`,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Operator Snapshot</h3>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className={`rounded-xl p-3.5 ${stat.bg}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
              </div>
              <p className={`text-base font-bold ${stat.color} tabular-nums`}>{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
