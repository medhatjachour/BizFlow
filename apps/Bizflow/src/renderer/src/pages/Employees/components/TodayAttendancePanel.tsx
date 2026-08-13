import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogIn, LogOut, Clock, CalendarX2, Coffee, Plane, AlertCircle,
} from 'lucide-react'
import type { Employee } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { getInitials, avatarColor, formatTime } from '../utils'

interface Props {
  employees: Employee[]
  checkingIn?: string | null
  onCheckIn?: (emp: Employee) => void
  onCheckOut?: (emp: Employee) => void
}

type RosterGroup = 'present' | 'completed' | 'late' | 'leave' | 'absent'

const GROUP_META: Record<RosterGroup, { label: string; icon: ReactNode; chip: string }> = {
  present: { label: 'On shift', icon: <LogIn size={13} />, chip: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Completed', icon: <LogOut size={13} />, chip: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
  late: { label: 'Late', icon: <AlertCircle size={13} />, chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  leave: { label: 'On leave', icon: <Plane size={13} />, chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  absent: { label: 'Absent / no record', icon: <CalendarX2 size={13} />, chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const GROUP_ORDER: RosterGroup[] = ['present', 'late', 'completed', 'leave', 'absent']

/**
 * Team-wide today's attendance board. Buckets every non-terminated employee
 * into a live roster so HR can see at a glance who is on shift, late, on
 * leave or missing a record.
 */
export default function TodayAttendancePanel({ employees, checkingIn, onCheckIn, onCheckOut }: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const roster = useMemo(() => {
    const groups: Record<RosterGroup, Employee[]> = {
      present: [], completed: [], late: [], leave: [], absent: [],
    }
    for (const emp of employees) {
      if (emp.status === 'terminated') continue
      const att = emp.todayAttendance
      if (emp.status === 'on-leave' || att?.status === 'leave') { groups.leave.push(emp); continue }
      if (!att?.checkIn) { groups.absent.push(emp); continue }
      if (att.status === 'late' && !att.checkOut) { groups.late.push(emp); continue }
      if (att.checkOut) { groups.completed.push(emp); continue }
      if (att.status === 'absent') { groups.absent.push(emp); continue }
      groups.present.push(emp)
    }
    return groups
  }, [employees])

  const total = GROUP_ORDER.reduce((s, g) => s + roster[g].length, 0)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 px-5 pt-5">
        <Clock size={15} className="text-primary" />
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('empTodayAttendance') ?? 'Today\'s attendance'}</h3>
        <span className="ml-auto text-xs text-slate-400">{t('empPresentToday') ?? 'Present today'}: {roster.present.length + roster.late.length}/{total}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {GROUP_ORDER.map(g => (
            <span key={g} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${GROUP_META[g].chip}`}>
              {GROUP_META[g].icon} {GROUP_META[g].label} <span className="tabular-nums font-bold">{roster[g].length}</span>
            </span>
          ))}
        </div>

        {total === 0 ? (
          <p className="text-xs text-slate-400">{t('empNoEmployeesFound') ?? 'No employees yet'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
            {GROUP_ORDER.map(g => roster[g].map(emp => {
              const att = emp.todayAttendance
              const busy = checkingIn === emp.id
              return (
                <div key={emp.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 px-3 py-2">
                  <button
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(emp.name)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                  >
                    {getInitials(emp.name)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{emp.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{emp.role}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {att?.checkIn && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <LogIn size={11} className="text-green-500" />{formatTime(att.checkIn)}
                      </span>
                    )}
                    {att?.checkOut && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <LogOut size={11} className="text-amber-500" />{formatTime(att.checkOut)}
                      </span>
                    )}
                    {!att?.checkIn && (g === 'absent') && onCheckIn && emp.status === 'active' && (
                      <button
                        onClick={() => onCheckIn(emp)}
                        disabled={busy}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 text-[11px] font-medium disabled:opacity-50"
                      >
                        <Coffee size={10} /> {busy ? '…' : (t('empCheckIn') ?? 'Check in')}
                      </button>
                    )}
                    {att?.checkIn && !att?.checkOut && onCheckOut && (g === 'present' || g === 'late') && (
                      <button
                        onClick={() => onCheckOut(emp)}
                        disabled={busy}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-[11px] font-medium disabled:opacity-50"
                      >
                        <LogOut size={10} /> {busy ? '…' : (t('empCheckOut') ?? 'Out')}
                      </button>
                    )}
                  </div>
                </div>
              )
            }))}
          </div>
        )}
      </div>
    </div>
  )
}
