import { LogIn, LogOut, Edit2, Plus, UserX, UserCheck, Clock } from 'lucide-react'
import type { EmployeeProfile, EmployeeAttendance } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useAuth } from '../../../contexts/AuthContext'
import { STATUS_COLORS } from '../constants'
import { getInitials, avatarColor } from '../utils'

import { Mail, Phone, Briefcase, Calendar, Star, Ban } from 'lucide-react'

interface Props {
  emp: EmployeeProfile
  todayAtt: EmployeeAttendance | null
  checkingIn: boolean
  checkingOut: boolean
  onCheckIn: () => void
  onCheckOut: () => void
  onLogAttendance: () => void
  onAddNote: () => void
  onEndContract: () => void
  onReactivate: () => void
}

export default function EmployeeHero({ emp, todayAtt, checkingIn, checkingOut, onCheckIn, onCheckOut, onLogAttendance, onAddNote, onEndContract, onReactivate }: Props) {
  const { t } = useLanguage()
  const { can } = useAuth()
  const alreadyIn  = !!todayAtt?.checkIn
  const alreadyOut = !!todayAtt?.checkOut

  const statusLabel: Record<string, string> = {
    active: t('empStatusActive'),
    'on-leave': t('empStatusOnLeave'),
    terminated: t('empStatusTerminated'),
  }
  const attStatusLabel: Record<string, string> = {
    present: t('empStatusPresent'),
    absent: t('empStatusAbsent'),
    late: t('empStatusLate'),
    'half-day': t('empHalfDay'),
    leave: t('empStatusLeave'),
  }

  const attColor = (status: string) => {
    switch (status) {
      case 'present': return { chip: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' }
      case 'absent':  return { chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400' }
      case 'late':    return { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' }
      case 'leave':   return { chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' }
      default:        return { chip: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' }
    }
  }
  const att = todayAtt ? attColor(todayAtt.status) : null
  const fmtT = (v: string) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-primary/80 to-secondary/80" />
      <div className="px-6 pb-6">
        <div className="flex items-start gap-5 -mt-10 mb-5">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor(emp.name)} flex items-center justify-center text-white font-bold text-2xl border-4 border-white dark:border-slate-800 shadow-lg shrink-0`}>
            {getInitials(emp.name)}
          </div>
          <div className="pt-11 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{emp.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[emp.status]}`}>{statusLabel[emp.status] ?? emp.status}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 capitalize">{emp.employmentType}</span>
              {emp.performanceScore != null && (() => {
                const score = emp.performanceScore as number
                const color = score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : score >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                return (
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
                    <Star size={11} className="fill-current" /> {score}%
                  </span>
                )
              })()}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</p>
          </div>
          {/* Lifecycle action — subtle, top-right */}
          <div className="pt-11 shrink-0">
            {emp.status === 'terminated' ? (
              <button
                onClick={onReactivate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <UserCheck size={14} /> {t('empReactivate') ?? 'Reactivate'}
              </button>
            ) : (
              <button
                onClick={onEndContract}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <UserX size={14} /> {t('empEndContract') ?? 'End contract'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Mail size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{emp.email ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Phone size={14} className="text-slate-400 shrink-0" />
            {emp.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Briefcase size={14} className="text-slate-400 shrink-0" />
            {can('view_finance') ? (
              <>
                <span className="font-semibold text-slate-800 dark:text-white">${Number(emp.salary).toLocaleString()}</span>
                <span className="text-xs">/{emp.salaryType}</span>
              </>
            ) : (
              <span className="text-xs italic text-slate-400">{t('empRestricted') ?? 'Restricted'} · {emp.salaryType}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            {t('empHiredLabel')} {new Date(emp.hireDate).toLocaleDateString()}
          </div>
        </div>

        {emp.status === 'terminated' && emp.terminationDate && (
          <div className="flex items-center gap-2 mt-4 text-sm text-red-600 dark:text-red-400">
            <Ban size={14} className="shrink-0" />
            <span>Terminated {new Date(emp.terminationDate).toLocaleDateString()}</span>
            {emp.terminationNote && <span className="text-xs text-red-400/80 truncate">· {emp.terminationNote}</span>}
          </div>
        )}

        {/* Today's attendance + quick actions */}
        {emp.status === 'active' && (
          <div className="mt-5 flex flex-col lg:flex-row lg:items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3.5">
            {/* Attendance summary */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${att ? att.icon : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('empToday')}</span>
                  {todayAtt ? (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${att!.chip}`}>{attStatusLabel[todayAtt.status] ?? todayAtt.status}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{t('empNoRecord')}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                  {todayAtt?.checkIn ? (
                    <span className="inline-flex items-center gap-1"><LogIn size={11} className="text-green-500" /> {fmtT(todayAtt.checkIn as string)}</span>
                  ) : (
                    <span>{t('empNotCheckedIn')}</span>
                  )}
                  {todayAtt?.checkOut && (
                    <span className="inline-flex items-center gap-1"><LogOut size={11} className="text-amber-500" /> {fmtT(todayAtt.checkOut as string)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
              {!alreadyIn && (
                <button
                  onClick={onCheckIn}
                  disabled={checkingIn}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <LogIn size={15} /> {checkingIn ? t('empCheckingIn') : t('empCheckIn')}
                </button>
              )}
              {alreadyIn && !alreadyOut && (
                <button
                  onClick={onCheckOut}
                  disabled={checkingOut}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <LogOut size={15} /> {checkingOut ? t('empCheckingOut') : t('empCheckOut')}
                </button>
              )}
              {alreadyIn && alreadyOut && (
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                  <LogOut size={14} /> {t('empShiftComplete') ?? 'Shift complete'}
                </span>
              )}
              <button onClick={onLogAttendance} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-white dark:hover:bg-slate-700 transition-colors">
                <Edit2 size={14} /> {todayAtt ? t('empEditToday') : t('empLogAttendance')}
              </button>
              <button onClick={onAddNote} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-white dark:hover:bg-slate-700 transition-colors">
                <Plus size={14} /> {t('empAddNote')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

