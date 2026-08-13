import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, LogIn, LogOut, ChevronRight, Mail, Phone, Briefcase, Star, CheckCircle2 } from 'lucide-react'
import type { Employee } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { STATUS_COLORS } from '../constants'
import { getInitials, avatarColor, formatTime } from '../utils'

interface Props {
  emp: Employee
  onEdit: (emp: Employee) => void
  onDelete: (emp: Employee) => void
  onCheckIn: (emp: Employee) => void
  onCheckOut: (emp: Employee) => void
  checkingIn: string | null
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (emp: Employee) => void
}

export default function EmployeeCard({ emp, onEdit, onDelete, onCheckIn, onCheckOut, checkingIn, selectMode, selected, onToggleSelect }: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const statusLabel: Record<string, string> = {
    active: t('empStatusActive'),
    'on-leave': t('empStatusOnLeave'),
    terminated: t('empStatusTerminated'),
  }

  const att = emp.todayAttendance
  const fmtTime = formatTime
  const checkedIn = !!att?.checkIn
  const checkedOut = !!att?.checkOut
  const busy = checkingIn === emp.id

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md transition-all ${selected ? 'border-primary ring-2 ring-primary/30' : checkedIn && !checkedOut ? 'border-green-300 dark:border-green-800 ring-1 ring-green-400/40' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {selectMode && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onToggleSelect?.(emp)}
              className="mt-1 w-4 h-4 accent-primary cursor-pointer shrink-0"
              aria-label={`Select ${emp.name}`}
            />
          )}
          <div
            onClick={() => { if (!selectMode) navigate(`/employees/${emp.id}`) }}
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarColor(emp.name)} flex items-center justify-center text-white font-bold text-lg shrink-0 ${selectMode ? '' : 'cursor-pointer'}`}
          >
            {getInitials(emp.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                onClick={() => { if (!selectMode) navigate(`/employees/${emp.id}`) }}
                title={selectMode ? undefined : (t('empViewProfile') ?? 'View Profile')}
                className={`font-semibold text-slate-900 dark:text-white truncate ${selectMode ? '' : 'cursor-pointer hover:text-primary transition-colors'}`}
              >{emp.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[emp.status] || ''}`}>
                {statusLabel[emp.status] ?? emp.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {emp.performanceScore != null && emp.performanceScore > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs text-amber-600 dark:text-amber-400">{emp.performanceScore}</span>
                </div>
              )}
              {checkedIn && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${checkedOut ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                  <CheckCircle2 size={10} />
                  {checkedOut ? `${fmtTime(att?.checkIn)}–${fmtTime(att?.checkOut)}` : `${t('empCheckedInAt') ?? 'In'} ${fmtTime(att?.checkIn)}`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {emp.email && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Mail size={12} className="shrink-0" /><span className="truncate">{emp.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Phone size={12} className="shrink-0" />{emp.phone}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Briefcase size={12} className="shrink-0" />
            <span className="capitalize">{emp.salaryType}</span>
            <span className="ml-auto font-medium text-slate-600 dark:text-slate-300">{t('empHired') ?? 'Hired'} {new Date(emp.hireDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-700">
        {/* Primary CTA */}
        <div className="px-4 pt-3 pb-2">
          <button
            onClick={() => navigate(`/employees/${emp.id}`)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 text-xs font-semibold transition-colors"
          >
            {t('empViewProfile') ?? 'View Profile'} <ChevronRight size={13} />
          </button>
        </div>
        {/* Secondary actions */}
        <div className="px-4 pb-3 flex items-center gap-1.5">
          {emp.status === 'active' && (
            <>
              {!checkedIn && (
                <button
                  onClick={() => onCheckIn(emp)}
                  disabled={busy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <LogIn size={11} /> {t('empCheckIn')}
                </button>
              )}
              {checkedIn && !checkedOut && (
                <>
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400/80 text-xs font-medium cursor-default"
                    title={`${t('empCheckedInAt') ?? 'Checked in at'} ${fmtTime(att?.checkIn)}`}
                  >
                    <CheckCircle2 size={11} /> {fmtTime(att?.checkIn)}
                  </span>
                  <button
                    onClick={() => onCheckOut(emp)}
                    disabled={busy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <LogOut size={11} /> {t('empCheckOut')}
                  </button>
                </>
              )}
              {checkedIn && checkedOut && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 text-xs font-medium cursor-default">
                  <CheckCircle2 size={11} /> {t('empShiftComplete') ?? 'Shift complete'}
                </span>
              )}
            </>
          )}
          <div className="ml-auto flex gap-1">
            <button onClick={() => onEdit(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={() => onDelete(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

