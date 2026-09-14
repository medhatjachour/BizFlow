import { Clock, Plus, Trash2, AlertTriangle } from 'lucide-react'
import type { EmployeeShift } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { formatMinutes, useHrFormat } from '../ui/hrFormat'
import {
  HrBadge,
  HrButton,
  HrEmptyState,
  HrIconButton,
  HrSectionHeader,
  HrStat,
  HrTableShell,
  type HrTone,
} from '../ui/primitives'
import {
  localDayOffset,
  overlappingShiftIds,
  shiftDurationMinutes,
  shiftsBetween,
  totalShiftMinutes,
} from '../shiftTimes'

const SHIFT_TYPE_TONES: Record<string, HrTone> = {
  morning: 'warning',
  evening: 'info',
  night: 'brand',
  custom: 'neutral',
}

const SHIFT_TYPE_KEYS: Record<string, string> = {
  morning: 'empShiftMorning',
  evening: 'empShiftEvening',
  night: 'empShiftNight',
  custom: 'empCustomShift',
}

interface Props {
  shifts: EmployeeShift[]
  onAdd: () => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export default function ShiftsTab({ shifts, onAdd, onDelete, disabled }: Props) {
  const { t } = useLanguage()
  const fmt = useHrFormat()

  const today = localDayOffset(0)
  const overlapping = overlappingShiftIds(shifts)
  const thisWeek = shiftsBetween(shifts, localDayOffset(-6), today)
  const next30 = shiftsBetween(shifts, today, localDayOffset(30))
  const ordered = [...shifts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const minutesFor = (list: EmployeeShift[]) => formatMinutes(totalShiftMinutes(list), t)
  const addButton = !disabled ? (
    <HrButton variant="primary" size="md" icon={Plus} onClick={onAdd}>
      {t('empAddShift')}
    </HrButton>
  ) : undefined

  return (
    <div className="space-y-4">
      <HrSectionHeader
        icon={Clock}
        title={t('empShiftSchedule')}
        subtitle={t('empShiftStatCount', { count: fmt.count(shifts.length) })}
        action={addButton}
      />

      {shifts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <HrStat icon={Clock} tone="brand" label={t('empShiftTotalHours')} value={minutesFor(shifts)} />
          <HrStat
            icon={Clock}
            tone="info"
            label={t('empShiftThisWeek')}
            value={minutesFor(thisWeek)}
            hint={t('empShiftStatCount', { count: fmt.count(thisWeek.length) })}
          />
          <HrStat
            icon={Clock}
            tone="neutral"
            label={t('empShiftNext30')}
            value={minutesFor(next30)}
            hint={t('empShiftStatCount', { count: fmt.count(next30.length) })}
          />
        </div>
      )}

      {shifts.length === 0 ? (
        <HrEmptyState
          icon={Clock}
          title={t('empShiftNone')}
          description={t('empShiftNoneHint')}
          action={addButton}
        />
      ) : (
        <HrTableShell
          columns={[
            { label: t('empDate') },
            { label: t('empShiftType') },
            { label: t('empStart') },
            { label: t('empEnd') },
            { label: t('empBreak') },
            { label: t('empDuration') },
            { label: t('notes') },
            { label: '' },
          ]}
        >
          {ordered.map(s => {
            const minutes = shiftDurationMinutes(s.startTime, s.endTime, s.breakMins)
            const clashes = overlapping.has(s.id)
            return (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                  {fmt.date(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                  {clashes && (
                    <span className="ms-2 align-middle">
                      <HrBadge tone="danger" icon={AlertTriangle}>
                        {t('empShiftOverlapShort')}
                      </HrBadge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <HrBadge tone={SHIFT_TYPE_TONES[s.shiftType] ?? 'neutral'}>
                    {t(SHIFT_TYPE_KEYS[s.shiftType] ?? 'empCustomShift')}
                  </HrBadge>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300" dir="ltr">
                  {s.startTime}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300" dir="ltr">
                  {s.endTime}
                </td>
                <td className="px-4 py-3 text-slate-500">{s.breakMins > 0 ? formatMinutes(s.breakMins, t) : '—'}</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200" dir="ltr">
                  {formatMinutes(minutes, t)}
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={s.notes ?? undefined}>
                  {s.notes || '—'}
                </td>
                <td className="px-4 py-3 text-end">
                  {!disabled && (
                    <HrIconButton
                      icon={Trash2}
                      tone="danger"
                      title={t('empShiftDelete')}
                      onClick={() => onDelete(s.id)}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </HrTableShell>
      )}
    </div>
  )
}

