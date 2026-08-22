import { Users, Zap, Calendar, TrendingUp } from 'lucide-react'
import { CoachStats } from '../../types'

interface ProfileStatsHeaderProps {
  stats: CoachStats | null
  loading: boolean
}

export function ProfileStatsHeader({ stats, loading }: ProfileStatsHeaderProps) {
  const cards = [
    {
      label: 'Active Clients',
      value: stats?.activeTrainees ?? 0,
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40'
    },
    {
      label: 'Sessions Today',
      value: stats?.sessionsToday ?? 0,
      icon: Zap,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-900/40'
    },
    {
      label: 'This Week',
      value: stats?.sessionsWeek ?? 0,
      icon: Calendar,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200/60 dark:border-orange-900/40'
    },
    {
      label: 'This Month',
      value: stats?.sessionsMonth ?? 0,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-200/60 dark:border-purple-900/40'
    }
  ]

  return (
    <div className="grid grid-cols-4 gap-2 px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20">
      {cards.map(c => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-2.5 border ${c.color}`}
          >
            <Icon size={14} />
            <span className="text-base font-black tabular-nums leading-none">
              {loading ? '…' : c.value}
            </span>
            <span className="text-[10px] font-semibold text-center opacity-80 leading-tight">
              {c.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}