import { CalendarCheck,      Snowflake, DollarSign } from 'lucide-react'
import { Subscription } from '../types'

interface SubscriptionStatsStripProps {
  subscriptions: Subscription[]
}

export function SubscriptionStatsStrip({ subscriptions }: SubscriptionStatsStripProps) {
  const activeCount = subscriptions.filter(s => s.status === 'active').length
  const frozenCount = subscriptions.filter(s => s.status === 'frozen').length
  const totalRevenue = subscriptions.reduce((acc, curr) => acc + (curr.amountPaid ?? 0), 0)

  const stats = [
    {
      label: 'Active Plans',
      value: activeCount,
      icon: CalendarCheck,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: 'Frozen Memberships',
      value: frozenCount,
      icon: Snowflake,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
    },
    {
      label: 'Logged Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {stats.map(s => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 flex items-center justify-between shadow-xs"
          >
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                {s.value}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${s.color}`}>
              <Icon size={18} />
            </div>
          </div>
        )
      })}
    </div>
  )
}