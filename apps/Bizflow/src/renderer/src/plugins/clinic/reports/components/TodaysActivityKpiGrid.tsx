import React from 'react'
import { Users, Stethoscope, CalendarClock, Heart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { ClinicActivityData } from '../types'

interface Props {
  data: ClinicActivityData
  loading: boolean
}

export const TodaysActivityKpiGrid: React.FC<Props> = ({ data, loading }) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 animate-pulse">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
    )
  }

  const uniquePatientsSeen = new Set(data.todaySessions.map((s) => s.patientId)).size

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      <StatCard
        icon={Users}
        label={t('totalPatientsLabel') || 'Total Directory'}
        value={data.patientCount}
        sub={t('registeredPatientsNote') || 'Registered active patients'}
        color="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400"
      />
      <StatCard
        icon={Stethoscope}
        label={t('sessionsTodayLabel') || 'Sessions Today'}
        value={data.todaySessions.length}
        sub={`${uniquePatientsSeen} ${t('uniquePatientsNote') || 'unique patients'}`}
        color="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
      />
      <StatCard
        icon={CalendarClock}
        label={t('followUpsDueLabel') || 'Upcoming Follow-ups'}
        value={data.followUps.length}
        sub={t('within7DaysNote') || 'Within next 7 days'}
        color="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
      />
      <StatCard
        icon={Heart}
        label={t('prescriptionsLabel') || 'Prescriptions Issued'}
        value={data.todayPrescriptions.length}
        sub={t('issuedTodayNote') || 'Prescribed in today sessions'}
        color="bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400"
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700/80">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        <div className={`p-1.5 rounded-xl ${color} shrink-0`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] font-semibold text-slate-400 mt-1 truncate">{sub}</p>}
    </div>
  )
}