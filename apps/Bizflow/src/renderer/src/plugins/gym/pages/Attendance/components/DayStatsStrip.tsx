import { Users, DollarSign, CalendarCheck, Footprints } from 'lucide-react'
import { Session } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DayStatsStripProps {
  sessions: Session[]
}

export function DayStatsStrip({ sessions }: DayStatsStripProps) {
  const { t } = useLanguage()

  const totalSubscribers = sessions.filter(s => s.type === 'subscription_visit').length
  const totalMemberWalkins = sessions.filter(s => s.type === 'walkin' && s.traineeId).length
  const totalAnonWalkins = sessions.filter(s => s.type === 'walkin' && !s.traineeId).length
  const totalRevenue = sessions.reduce((acc, curr) => acc + (curr.amount ?? 0), 0)

  const stats = [
    {
      label: t('gymSubscribers') || 'Subscribers',
      value: totalSubscribers,
      icon: CalendarCheck,
      color: 'emerald'
    },
    {
      label: 'Member Walk-ins',
      value: totalMemberWalkins,
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Guest Walk-ins',
      value: totalAnonWalkins,
      icon: Footprints,
      color: 'teal'
    },
    {
      label: t('gymRevenue') || 'Daily Revenue',
      value: totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      icon: DollarSign,
      color: 'orange'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(st => {
        const Icon = st.icon
        return (
          <div
            key={st.label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{st.label}</span>
              <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 text-slate-500">
                <Icon size={14} />
              </div>
            </div>
            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-white mt-1">
              {st.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}