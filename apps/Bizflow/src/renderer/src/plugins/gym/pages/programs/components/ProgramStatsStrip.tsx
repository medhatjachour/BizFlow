import { Dumbbell, Users, CalendarCheck, CheckCircle2 } from 'lucide-react'
import { Program } from '../types'

interface ProgramStatsStripProps {
  programs: Program[]
}

export function ProgramStatsStrip({ programs }: ProgramStatsStripProps) {
  const activeCount = programs.filter(p => p.isActive).length
  const totalDaysConfigured = programs.reduce((acc, p) => acc + (p.days?.length || p._count?.days || 0), 0)
  const totalEnrolled = programs.reduce((acc, p) => acc + (p.assignments?.length || p._count?.assignments || 0), 0)

  const stats = [
    {
      label: 'Workout Programs',
      value: programs.length,
      icon: Dumbbell,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
    },
    {
      label: 'Active & Assigned',
      value: activeCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: 'Workout Days Built',
      value: totalDaysConfigured,
      icon: CalendarCheck,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
    },
    {
      label: 'Enrolled Members',
      value: totalEnrolled,
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30'
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