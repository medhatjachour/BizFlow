import { Zap, Calendar, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import { CoachStats } from '../../types'

interface TabActivityProps {
  stats: CoachStats | null
}

export function TabActivity({ stats }: TabActivityProps) {
  return (
    <div className="space-y-4">
      {/* Overview Metric Boxes */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Today', value: stats?.sessionsToday ?? 0, icon: Zap, color: 'text-blue-500' },
          { label: 'This Week', value: stats?.sessionsWeek ?? 0, icon: Calendar, color: 'text-orange-500' },
          { label: 'This Month', value: stats?.sessionsMonth ?? 0, icon: TrendingUp, color: 'text-purple-500' }
        ].map(item => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-center shadow-xs"
            >
              <Icon size={18} className={`mx-auto mb-2 ${item.color}`} />
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {item.value}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">{item.label}</p>
            </div>
          )
        })}
      </div>

      {/* Expiring Alert */}
      {stats && stats.expiringSoon > 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Retention Warning: {stats.expiringSoon} subscription{stats.expiringSoon !== 1 ? 's' : ''} expiring soon
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              Remind these clients to renew before their plans lapse.
            </p>
          </div>
        </div>
      )}

      {/* Revenue Card */}
      {stats && (
        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Total Revenue Generated
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <DollarSign size={24} />
          </div>
        </div>
      )}
    </div>
  )
}