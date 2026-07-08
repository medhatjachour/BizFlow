import { useState } from 'react'
import { Calendar, User, Clock, FileText, X, Pencil, Plus } from 'lucide-react'
import type { EmployeeProfile, EmployeeAttendance, AttendanceStatus } from '../types'
import { describePayrollPeriod } from '../payrollPeriod'
import { expiryState, daysUntil } from '../expiry'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useAuth } from '../../../contexts/AuthContext'

const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present:    'bg-green-500',
  absent:     'bg-red-400',
  late:       'bg-amber-400',
  'half-day': 'bg-yellow-300',
  leave:      'bg-blue-400'
}

// Render a stored check-in/out timestamp as local HH:MM (handles ISO strings and Date objects)
function fmtTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  emp: EmployeeProfile
  calendar: { date: string; att: EmployeeAttendance | null }[]
  onLogDate: (date: string, att: EmployeeAttendance | null) => void
  onSetPerformance?: (score: number) => void
  savingPerf?: boolean
  disabled?: boolean
}

export default function OverviewTab({ emp, calendar, onLogDate, onSetPerformance, savingPerf, disabled }: Props) {
  const { t } = useLanguage()
  const { can } = useAuth()
  const [selectedDay, setSelectedDay] = useState<{ date: string; att: EmployeeAttendance | null } | null>(null)
  const [pendingScore, setPendingScore] = useState<number>(emp.performanceScore ?? 0)

  const attLabels: Record<AttendanceStatus, string> = {
    present: t('empStatusPresent'),
    absent: t('empStatusAbsent'),
    late: t('empStatusLate'),
    'half-day': t('empHalfDay'),
    leave: t('empStatusLeave'),
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Attendance summary + calendar */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar size={16} /> {t('empAttLast90Days')}
        </h3>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: t('empPresent'), value: emp.attendanceSummary.present, color: 'text-green-600' },
            { label: t('empAbsent'), value: emp.attendanceSummary.absent, color: 'text-red-500' },
            { label: t('empLate'), value: emp.attendanceSummary.late, color: 'text-amber-500' },
            { label: t('empLeave'), value: emp.attendanceSummary.onLeave, color: 'text-blue-500' },
            { label: t('empRate'), value: `${emp.attendanceSummary.rate}%`, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-700">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex flex-wrap gap-1 mt-2">
            {calendar.map(({ date, att }) => (
              <button
                key={date}
                type="button"
                title={`${new Date(date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}: ${att ? attLabels[att.status as AttendanceStatus] : t('empNoRecord')}`}
                onClick={() => setSelectedDay(prev => prev?.date === date ? null : { date, att })}
                className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 hover:ring-2 hover:ring-offset-1 hover:ring-primary/60 ${att ? ATTENDANCE_COLORS[att.status as AttendanceStatus] : 'bg-slate-200 dark:bg-slate-700'} ${selectedDay?.date === date ? 'ring-2 ring-offset-1 ring-primary scale-125' : ''}`}
              />
            ))}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {(Object.entries(ATTENDANCE_COLORS) as [AttendanceStatus, string][]).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1 text-xs text-slate-500">
                <div className={`w-3 h-3 rounded-sm ${c}`} />{attLabels[s]}
              </div>
            ))}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" />{t('empNoRecord')}
            </div>
          </div>

          {/* ── Day detail panel ──────────────────────────────────────── */}
          {selectedDay && (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedDay.date).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {selectedDay.att ? (
                <>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${ATTENDANCE_COLORS[selectedDay.att.status as AttendanceStatus]}`} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {attLabels[selectedDay.att.status as AttendanceStatus]}
                      </span>
                    </div>
                    {/* Check-in */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <Clock size={13} className="text-slate-400" />
                      <span className="text-xs text-slate-400">{t('empCheckInCol')}:</span>
                      <span>{fmtTime(selectedDay.att.checkIn)}</span>
                    </div>
                    {/* Check-out */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <Clock size={13} className="text-slate-400" />
                      <span className="text-xs text-slate-400">{t('empCheckOutCol')}:</span>
                      <span>{fmtTime(selectedDay.att.checkOut)}</span>
                    </div>
                  </div>
                  {selectedDay.att.notes && (
                    <div className="flex items-start gap-1.5 mb-3 text-sm text-slate-600 dark:text-slate-300">
                      <FileText size={13} className="text-slate-400 mt-0.5 shrink-0" />
                      <span>{selectedDay.att.notes}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { onLogDate(selectedDay.date, selectedDay.att); setSelectedDay(null) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    <Pencil size={12} /> {t('edit')}
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('empNoRecord')}</span>
                  <button
                    type="button"
                    onClick={() => { onLogDate(selectedDay.date, null); setSelectedDay(null) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    <Plus size={12} /> {t('empAddAttendanceRecord')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <User size={16} /> {t('empProfileDetails')}
        </h3>
        <dl className="space-y-3">
          {[
            { label: t('empNationalId'), value: emp.nationalId },
            { label: t('empAddress'), value: emp.address },
            { label: t('empEmergencyContact'), value: emp.emergencyName },
            { label: t('empEmergencyPhone'), value: emp.emergencyPhone },
            { label: t('empTaxId'), value: emp.taxId },
            { label: t('empSocialInsurance'), value: emp.socialInsuranceNo },
            { label: t('empBankName'), value: emp.bankName },
            { label: t('empIban'), value: emp.iban },
          ].filter(f => f.value).map(f => (
            <div key={f.label}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{f.label}</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{f.value}</dd>
            </div>
          ))}
          {([
            { label: t('empContractEnd'), value: emp.contractEndDate },
            { label: t('empIdExpiry'), value: emp.idExpiryDate },
          ] as const).filter(f => f.value).map(f => {
            const st = expiryState(f.value)
            const n = daysUntil(f.value)
            const cls = st === 'expired' ? 'text-red-600 dark:text-red-400'
              : st === 'soon' ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-900 dark:text-white'
            return (
              <div key={f.label}>
                <dt className="text-xs text-slate-500 dark:text-slate-400">{f.label}</dt>
                <dd className={`text-sm font-medium mt-0.5 flex items-center gap-2 ${cls}`}>
                  {new Date(f.value as string).toLocaleDateString()}
                  {st === 'expired' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('empExpired') ?? 'Expired'}</span>}
                  {st === 'soon' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{n}{t('empDaysLeftSuffix') ?? 'd left'}</span>}
                </dd>
              </div>
            )
          })}
          {emp.notes && (
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{t('notes')}</dt>
              <dd className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{emp.notes}</dd>
            </div>
          )}
        </dl>

        {/* Performance rating */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('empPerformance') ?? 'Performance'}</h4>
            <span className={`text-lg font-bold ${pendingScore >= 80 ? 'text-green-600 dark:text-green-400' : pendingScore >= 60 ? 'text-amber-600 dark:text-amber-400' : pendingScore > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
              {pendingScore > 0 ? `${pendingScore}%` : (t('empUnrated') ?? 'Unrated')}
            </span>
          </div>
          <input
            type="range" min={0} max={100} step={5} value={pendingScore}
            onChange={e => setPendingScore(Number(e.target.value))}
            disabled={disabled}
            className="w-full accent-primary disabled:opacity-50 cursor-pointer"
          />
          {!disabled && onSetPerformance && pendingScore !== (emp.performanceScore ?? 0) && (
            <button
              onClick={() => onSetPerformance(pendingScore)}
              disabled={savingPerf}
              className="mt-2 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingPerf ? (t('empSaving') ?? 'Saving…') : (t('save') ?? 'Save')}
            </button>
          )}
        </div>

        {can('view_finance') && emp.payrollRecords.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('empLatestPayroll')}</h4>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{describePayrollPeriod(emp.payrollRecords[0].month, emp.payrollRecords[0].year)}</span>
                <span className={`font-medium ${emp.payrollRecords[0].status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                  {emp.payrollRecords[0].status === 'paid' ? t('empPaid') : t('empStatusPending')}
                </span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">${emp.payrollRecords[0].netPay.toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
