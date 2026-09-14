import { useMemo, useState } from 'react'
import { CalendarCheck, CalendarOff, CalendarX, Clock, Pencil, Plus, AlertTriangle } from 'lucide-react'
import type { EmployeeAttendance, AttendanceStatus } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { formatMinutes, useHrFormat } from '../ui/hrFormat'
import {
  HrBadge,
  HrButton,
  HrCard,
  HrEmptyState,
  HrIconButton,
  HrSectionHeader,
  HrStat,
  HrTableShell,
  HR_INPUT_CLASS,
  HR_SELECT_CLASS,
  type HrTone,
} from '../ui/primitives'
import { minutesBetween } from '../shiftTimes'

const STATUS_TONES: Record<AttendanceStatus, HrTone> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  'half-day': 'neutral',
  leave: 'info',
}

const STATUS_DOTS: Record<AttendanceStatus, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-400',
  late: 'bg-amber-400',
  'half-day': 'bg-yellow-300',
  leave: 'bg-blue-400',
}

const STATUS_KEYS: Record<AttendanceStatus, string> = {
  present: 'empAttPresent',
  absent: 'empAttAbsent',
  late: 'empAttLate',
  'half-day': 'empAttHalfDay',
  leave: 'empAttLeave',
}

const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'half-day', 'leave']

/** A day with a check-in but no check-out is the one thing worth flagging here. */
function isIncomplete(a: EmployeeAttendance): boolean {
  return !!a.checkIn && !a.checkOut
}

function monthKeyOf(date: string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  attendance: EmployeeAttendance[]
  onLog: () => void
  onEdit: (a: EmployeeAttendance) => void
  disabled?: boolean
}

export default function AttendanceTab({ attendance, onLog, onEdit, disabled }: Props) {
  const { t } = useLanguage()
  const fmt = useHrFormat()
  const now = new Date()
  const [monthFilter, setMonthFilter] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all')

  const statusLabel = (status: AttendanceStatus) => t(STATUS_KEYS[status] ?? 'empAttPresent')

  const forMonth = useMemo(
    () => attendance.filter(a => monthKeyOf(a.date) === monthFilter),
    [attendance, monthFilter]
  )

  const filtered = useMemo(
    () =>
      forMonth
        .filter(a => statusFilter === 'all' || a.status === statusFilter)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [forMonth, statusFilter]
  )

  const counts = filtered.reduce((acc, a) => {
    acc[a.status as AttendanceStatus] = (acc[a.status as AttendanceStatus] ?? 0) + 1
    return acc
  }, {} as Partial<Record<AttendanceStatus, number>>)

  const totalMinutes = filtered.reduce((sum, a) => sum + minutesBetween(a.checkIn, a.checkOut), 0)
  const incomplete = filtered.filter(isIncomplete).length

  const [yr, mo] = monthFilter.split('-')
  const monthIndex = Math.max(0, Math.min(11, parseInt(mo, 10) - 1))
  const rangeFrom = fmt.date(new Date(Number(yr), monthIndex, 1), { day: 'numeric', month: 'short' })
  const rangeTo = fmt.date(new Date(Number(yr), monthIndex + 1, 0), { day: 'numeric', month: 'short' })

  const filtersActive = statusFilter !== 'all'
  const logButton = !disabled ? (
    <HrButton variant="primary" size="md" icon={Plus} onClick={onLog}>
      {t('empLogAttendance')}
    </HrButton>
  ) : undefined

  return (
    <div className="space-y-4">
      <HrSectionHeader
        icon={CalendarCheck}
        title={t('tabAttendance')}
        subtitle={t('empAttSummaryLine', {
          range: t('empAttRange', { from: rangeFrom, to: rangeTo }),
          present: fmt.count(counts.present ?? 0),
          absent: fmt.count(counts.absent ?? 0),
          late: fmt.count(counts.late ?? 0),
        })}
        action={logButton}
      />

      <HrCard className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('month')}</span>
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className={HR_INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('status')}</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as AttendanceStatus | 'all')}
            className={HR_SELECT_CLASS}
          >
            <option value="all">{t('empAllStatusesFilter')}</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 pb-1">
          {STATUS_ORDER.map(s =>
            (counts[s] ?? 0) > 0 ? (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOTS[s]}`} />
                {statusLabel(s)}: <span className="font-bold">{fmt.count(counts[s] ?? 0)}</span>
              </span>
            ) : null
          )}
        </div>
        {filtersActive && (
          <HrButton className="mb-1" onClick={() => setStatusFilter('all')}>
            {t('empAttClearFilters')}
          </HrButton>
        )}
      </HrCard>

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <HrStat
            icon={CalendarCheck}
            tone="success"
            label={t('empAttDaysPresent')}
            value={fmt.count(counts.present ?? 0)}
          />
          <HrStat
            icon={CalendarX}
            tone="danger"
            label={t('empAttDaysAbsent')}
            value={fmt.count(counts.absent ?? 0)}
            valueClassName={counts.absent ? 'text-red-600 dark:text-red-400' : undefined}
          />
          <HrStat
            icon={AlertTriangle}
            tone="warning"
            label={t('empAttTimesLate')}
            value={fmt.count(counts.late ?? 0)}
            valueClassName={counts.late ? 'text-amber-600 dark:text-amber-400' : undefined}
          />
          <HrStat
            icon={Clock}
            tone="info"
            label={t('empAttTotalHours')}
            value={formatMinutes(totalMinutes, t)}
            hint={incomplete > 0 ? t('empAttNoCheckOutHint', { count: fmt.count(incomplete) }) : undefined}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        filtersActive && forMonth.length > 0 ? (
          <HrCard padded={false}>
            <HrEmptyState
              icon={CalendarOff}
              title={t('empAttNoMatch')}
              description={t('empAttNoMatchHint')}
              action={<HrButton size="md" onClick={() => setStatusFilter('all')}>{t('empAttClearFilters')}</HrButton>}
            />
          </HrCard>
        ) : (
          <HrCard padded={false}>
            <HrEmptyState
              icon={CalendarOff}
              title={t('empNoRecordsFor', { month: fmt.monthNames('long')[monthIndex], year: yr })}
              description={t('empAttNoneHint')}
              action={logButton}
            />
          </HrCard>
        )
      ) : (
        <HrTableShell
          columns={[
            { label: t('empDate') },
            { label: t('status') },
            { label: t('empCheckInCol') },
            { label: t('empCheckOutCol') },
            { label: t('empDuration') },
            { label: t('notes') },
            { label: '' },
          ]}
        >
          {filtered.map(a => (
            <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                {fmt.date(a.date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </td>
              <td className="px-4 py-3">
                <HrBadge tone={STATUS_TONES[a.status] ?? 'neutral'}>{statusLabel(a.status)}</HrBadge>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400" dir="ltr">
                {a.checkIn ? fmt.time(a.checkIn) : '—'}
              </td>
              <td className="px-4 py-3" dir="ltr">
                {a.checkOut ? (
                  <span className="text-slate-600 dark:text-slate-400">{fmt.time(a.checkOut)}</span>
                ) : a.checkIn ? (
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                    {t('empAttNoCheckOut')}
                  </span>
                ) : (                  <span className="text-slate-600 dark:text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300" dir="ltr">
                {formatMinutes(minutesBetween(a.checkIn, a.checkOut), t)}
              </td>
              <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={a.notes ?? undefined}>
                {a.notes || '—'}
              </td>
              <td className="px-4 py-3 text-end">
                {!disabled && (
                  <HrIconButton icon={Pencil} title={t('empAttEdit')} onClick={() => onEdit(a)} />
                )}
              </td>
            </tr>
          ))}
        </HrTableShell>
      )}
    </div>
  )
}

