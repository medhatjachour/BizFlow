import { Phone, Mail, Calendar, DollarSign, ShieldAlert, Award } from 'lucide-react'
import { Coach, CoachStats } from '../../types'
import { formatSalary, formatDateLabel } from '../../utils'

interface TabInfoProps {
  coach: Coach
  stats: CoachStats | null
}

export function TabInfo({ coach, stats }: TabInfoProps) {
  return (
    <div className="space-y-4">
      {/* Key Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Phone, label: 'Phone', value: coach.phone },
          { icon: Mail, label: 'Email', value: coach.email },
          {
            icon: Calendar,
            label: 'Hire Date',
            value: coach.hireDate ? formatDateLabel(coach.hireDate) : null
          },
          {
            icon: DollarSign,
            label: 'Salary & Compensation',
            value: formatSalary(coach.salary, coach.salaryType)
          }
        ].map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60"
            >
              <div className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-400">
                <Icon size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {item.value || '—'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aggregate KPI Summary Strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
            <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
              {stats.uniqueTrainees}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Lifetime Clients</p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 p-3 text-center">
            <p className="text-base font-black text-amber-700 dark:text-amber-300 tabular-nums">
              {stats.expiringSoon}
            </p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
              Expiring in ≤ 7d
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 text-center">
            <p className="text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Revenue
            </p>
          </div>
        </div>
      )}

      {/* National ID & Certifications */}
      {coach.nationalId && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <ShieldAlert size={14} className="text-slate-400 shrink-0" />
          <span>National ID / Passport: <strong className="font-mono">{coach.nationalId}</strong></span>
        </div>
      )}

      {coach.notes && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 p-3.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-bold text-slate-400 text-[10px] uppercase mb-1">
            <Award size={13} className="text-orange-500" />
            <span>Certifications & Bio Notes</span>
          </div>
          <p>{coach.notes}</p>
        </div>
      )}
    </div>
  )
}