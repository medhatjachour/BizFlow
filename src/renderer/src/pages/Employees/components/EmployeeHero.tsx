import { LogIn, LogOut, Edit2, Plus } from 'lucide-react'
import type { EmployeeProfile, EmployeeAttendance } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'on-leave': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function avatarColor(name: string) {
  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}

import { Mail, Phone, Briefcase, Calendar, Star } from 'lucide-react'

interface Props {
  emp: EmployeeProfile
  todayAtt: EmployeeAttendance | null
  checkingIn: boolean
  checkingOut: boolean
  onCheckIn: () => void
  onCheckOut: () => void
  onLogAttendance: () => void
  onAddNote: () => void
}

export default function EmployeeHero({ emp, todayAtt, checkingIn, checkingOut, onCheckIn, onCheckOut, onLogAttendance, onAddNote }: Props) {
  const { t } = useLanguage()
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-primary/80 to-secondary/80" />
      <div className="px-6 pb-6">
        <div className="flex items-end gap-5 -mt-10 mb-4">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor(emp.name)} flex items-center justify-center text-white font-bold text-2xl border-4 border-white dark:border-slate-800 shadow-lg`}>
            {getInitials(emp.name)}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{emp.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[emp.status]}`}>{statusLabel[emp.status] ?? emp.status}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">{emp.employmentType}</span>
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
            <span className="font-semibold text-slate-800 dark:text-white">${Number(emp.salary).toLocaleString()}</span>
            <span className="text-xs">/{emp.salaryType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            {t('empHiredLabel')} {new Date(emp.hireDate).toLocaleDateString()}
          </div>
        </div>

        {emp.status === 'active' && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {/* Today's status pill */}
            {todayAtt && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                todayAtt.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : todayAtt.status === 'absent'  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : todayAtt.status === 'late'    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : todayAtt.status === 'leave'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {t('empToday')}: {attStatusLabel[todayAtt.status] ?? todayAtt.status}
                {todayAtt.checkIn && (
                  <span className="opacity-70 ml-1">
                    · In {new Date(todayAtt.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {todayAtt.checkOut && (
                  <span className="opacity-70">
                    {' '}· Out {new Date(todayAtt.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}

            {/* Check In — hide if already checked in */}
            {!alreadyIn && (
              <button
                onClick={onCheckIn}
                disabled={checkingIn}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn size={15} /> {checkingIn ? t('empCheckingIn') : t('empCheckIn')}
              </button>
            )}

            {/* Check Out — only show if checked in but not yet out */}
            {alreadyIn && !alreadyOut && (
              <button
                onClick={onCheckOut}
                disabled={checkingOut}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={15} /> {checkingOut ? t('empCheckingOut') : t('empCheckOut')}
              </button>
            )}

            <button onClick={onLogAttendance} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-medium transition-colors">
              <Edit2 size={14} /> {todayAtt ? t('empEditToday') : t('empLogAttendance')}
            </button>
            <button onClick={onAddNote} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
              <Plus size={14} /> {t('empAddNote')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

