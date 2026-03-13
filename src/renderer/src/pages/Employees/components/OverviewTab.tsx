import { Calendar, User } from 'lucide-react'
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
                onClick={() => onLogDate(date, att)}
                className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 hover:ring-2 hover:ring-offset-1 hover:ring-primary/60 ${att ? ATTENDANCE_COLORS[att.status as AttendanceStatus] : 'bg-slate-200 dark:bg-slate-700'}`}
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
