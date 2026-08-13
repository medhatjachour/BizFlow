import { useMemo } from 'react'
import {
  Users, Clock, CalendarX2, Activity, DollarSign, AlertTriangle,
} from 'lucide-react'
import type { Employee, EmployeeStats } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useAuth } from '../../../contexts/AuthContext'
import { expiryState, daysUntil, formatMoney } from '../utils'
import TodayAttendancePanel from './TodayAttendancePanel'
import ApprovalsPanel from './ApprovalsPanel'
import OrgChartPanel from './OrgChartPanel'
import DepartmentsPanel from './DepartmentsPanel'

interface Props {
  employees: Employee[]
  stats: EmployeeStats | null
  checkingIn?: string | null
  onCheckIn?: (emp: Employee) => void
  onCheckOut?: (emp: Employee) => void
  onFilterByDepartment: (dept: string) => void
}

/**
 * HR Dashboard — the landing view for the Employees page. Combines live team
 * stats, today's attendance roster, the pending-approvals queue, the org chart
 * and department breakdowns into a single at-a-glance screen.
 */
export default function Dashboard({
  employees, stats, checkingIn, onCheckIn, onCheckOut, onFilterByDepartment,
}: Props) {
  const { t } = useLanguage()
  const { can } = useAuth()
  const canFinance = can('view_finance')

  const expiries = useMemo(() => {
    const out: { name: string; kind: string; date: string; state: string; days: number }[] = []
    for (const e of employees) {
      if (e.status === 'terminated') continue
      for (const [kind, date] of [['Contract', e.contractEndDate], ['ID / visa', e.idExpiryDate]] as const) {
        const st = expiryState(date)
        if (st === 'soon' || st === 'expired') out.push({ name: e.name, kind, date: date as string, state: st, days: daysUntil(date) ?? 0 })
      }
    }
    return out.sort((a, b) => a.days - b.days)
  }, [employees])

  const kpis = [
    {
      label: t('empTotal') ?? 'Total', value: String(employees.length),
      icon: <Users size={16} />, tone: 'text-primary',
      sub: `${employees.filter(e => e.status === 'active').length} ${t('empActive') ?? 'active'}`,
    },
    {
      label: t('empPresentToday') ?? 'Present today', value: String(stats?.presentToday ?? 0),
      icon: <Activity size={16} />, tone: 'text-green-600',
      sub: `${stats?.attendanceRate ?? 0}% ${t('empRate') ?? 'rate'}`,
    },
    {
      label: t('empOnLeaveCount') ?? 'On leave', value: String(employees.filter(e => e.status === 'on-leave').length),
      icon: <Clock size={16} />, tone: 'text-amber-500',
      sub: `${expiries.length} ${t('empExpiriesSoon') ?? 'expiries soon'}`,
    },
    {
      label: t('empTerminatedCount') ?? 'Terminated', value: String(employees.filter(e => e.status === 'terminated').length),
      icon: <CalendarX2 size={16} />, tone: 'text-red-500',
      sub: `${t('empAttendanceRate') ?? 'Attendance rate'} ${stats?.attendanceRate ?? 0}%`,
    },
    ...(canFinance ? [{
      label: t('empPaidThisMonth') ?? 'Payroll this month', value: formatMoney(stats?.payrollThisMonth ?? 0, 0),
      icon: <DollarSign size={16} />, tone: 'text-violet-500',
      sub: t('empMonthlyBaseShort') ?? 'monthly base',
    }] : []),
  ]

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className={`flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2 ${k.tone}`}>
              {k.icon} <span className="text-slate-400">{k.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{k.value}</div>
            <div className="text-xs text-slate-400 mt-1.5 truncate">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Upcoming expiries strip */}
      {expiries.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-2 text-xs">
            {expiries.slice(0, 6).map((x, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-full font-medium ${x.state === 'expired' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {x.name} · {x.kind} {x.state === 'expired' ? (t('empExpired') ?? 'expired') : `${x.days}d`}
              </span>
            ))}
            {expiries.length > 6 && <span className="text-amber-600/70">+{expiries.length - 6}</span>}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <TodayAttendancePanel employees={employees} checkingIn={checkingIn} onCheckIn={onCheckIn} onCheckOut={onCheckOut} />
          <ApprovalsPanel />
        </div>
        <div className="space-y-5">
          <OrgChartPanel employees={employees} />
          <DepartmentsPanel employees={employees} onFilterByDepartment={onFilterByDepartment} />
        </div>
      </div>
    </div>
  )
}
