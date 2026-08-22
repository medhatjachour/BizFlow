import { Footprints, CalendarCheck, Users, DollarSign } from 'lucide-react'
import { GymSession } from '../types'

interface WalkInStatsStripProps {
  sessions: GymSession[]
  totalRevenue: number
}

export function WalkInStatsStrip({ sessions, totalRevenue }: WalkInStatsStripProps) {
  const subVisits = sessions.filter(s => s.type === 'subscription_visit').length
  const memberWalkins = sessions.filter(s => s.type === 'walkin' && s.traineeId).length
  const guestWalkins = sessions.filter(s => s.type === 'walkin' && !s.traineeId).length

  const stats = [
    {
      label: 'Total Check-Ins',
      value: sessions.length,
      icon: Footprints,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
    },
    {
      label: 'Subscription Visits',
      value: subVisits,
      icon: CalendarCheck,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: 'Walk-In Visitors',
      value: memberWalkins + guestWalkins,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
    },
    {
      label: 'Period Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                {s.value}
              </p>
            </div>
            <div className={`p-2.5 rounded-2xl ${s.color}`}>
              <Icon size={18} />
            </div>
          </div>
        )
      })}
    </div>
  )
}