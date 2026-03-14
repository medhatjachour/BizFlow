import { useState } from 'react'
import { Calendar, User, Clock, FileText, X, Pencil, Plus } from 'lucide-react'
import type { EmployeeProfile, EmployeeAttendance, AttendanceStatus } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present:    'bg-green-500',
  absent:     'bg-red-400',
  late:       'bg-amber-400',
  'half-day': 'bg-yellow-300',
  leave:      'bg-blue-400'
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface Props {
  emp: EmployeeProfile
  calendar: { date: string; att: EmployeeAttendance | null }[]
  onLogDate: (date: string, att: EmployeeAttendance | null) => void
}

export default function OverviewTab({ emp, calendar, onLogDate }: Props) {
  const { t } = useLanguage()
  const [selectedDay, setSelectedDay] = useState<{ date: string; att: EmployeeAttendance | null } | null>(null)

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
                      <span>{selectedDay.att.checkIn ? String(selectedDay.att.checkIn) : '—'}</span>
                    </div>
                    {/* Check-out */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                      <Clock size={13} className="text-slate-400" />
                      <span className="text-xs text-slate-400">{t('empCheckOutCol')}:</span>
                      <span>{selectedDay.att.checkOut ? String(selectedDay.att.checkOut) : '—'}</span>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
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
          ].filter(f => f.value).map(f => (
            <div key={f.label}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{f.label}</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{f.value}</dd>
            </div>
          ))}
          {emp.notes && (
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{t('notes')}</dt>
              <dd className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{emp.notes}</dd>
            </div>
          )}
        </dl>

        {emp.payrollRecords.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('empLatestPayroll')}</h4>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{MONTHS[emp.payrollRecords[0].month - 1]} {emp.payrollRecords[0].year}</span>
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
