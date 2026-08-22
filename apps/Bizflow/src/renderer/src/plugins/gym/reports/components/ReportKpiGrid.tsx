import React from 'react'
import { Users, CalendarX, Footprints, Flame } from 'lucide-react'
import { GymReportStats } from '../types'

interface Props {
  stats: GymReportStats
}

export const ReportKpiGrid: React.FC<Props> = ({ stats }) => {
  const kpis = [
    {
      label: 'Active Gym Members',
      value: stats.activeMembers.toLocaleString(),
      subtext: 'Current enrolled roster',
      icon: Users,
      style: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20'
    },
    {
      label: 'Expiring This Week',
      value: stats.expiringSoon.toLocaleString(),
      subtext: 'Pending renewals required',
      icon: CalendarX,
      style: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      label: 'Check-in Attendance',
      value: stats.todayCheckIns.toLocaleString(),
      subtext: 'Turnstile & manual entries',
      icon: Footprints,
      style: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20'
    },
    {
      label: 'New Registrations',
      value: (stats.newSignups ?? 0).toLocaleString(),
      subtext: 'New signups this period',
      icon: Flame,
      style: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon
        return (
          <div
            key={idx}
            className="bg-white dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className={`p-2 rounded-xl border ${kpi.style}`}>
                <Icon size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {kpi.value}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
              {kpi.subtext}
            </span>
          </div>
        )
      })}
    </div>
  )
}