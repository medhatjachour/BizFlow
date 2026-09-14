import { AlarmClock, CheckCheck, CheckCircle, CheckCircle2, Clock, Plus, Trash2, Undo2 } from 'lucide-react'
import type { EmployeeOvertime } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useHrFormat } from '../ui/hrFormat'
import {
  HrBadge,
  HrButton,
  HrEmptyState,
  HrIconButton,
  HrSectionHeader,
  HrStat,
  HrTableShell,
  hrRequestStatusTone,
} from '../ui/primitives'

interface Props {
  overtimeRecords: EmployeeOvertime[]
  onAdd: () => void
  onApprove: (id: string) => void
  /** Withdraw an approval taken by mistake. */
  onRevoke?: (id: string) => void
  onApproveAll?: () => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export default function OvertimeTab({ overtimeRecords, onAdd, onApprove, onRevoke, onApproveAll, onDelete, disabled }: Props) {
  const { t } = useLanguage()
  const fmt = useHrFormat()
  const totalHours = overtimeRecords.reduce((sum, o) => sum + o.hours, 0)
  const approvedHours = overtimeRecords.filter(o => o.approved).reduce((sum, o) => sum + o.hours, 0)
  const pendingCount = overtimeRecords.filter(o => !o.approved).length

  return (
    <div className="space-y-4">
      <HrSectionHeader
        icon={AlarmClock}
        title={t('empOvertimeRecords')}
        subtitle={
          pendingCount > 0
            ? `${pendingCount} ${t('empOvertimePendingHint') ?? 'hour(s) awaiting approval'}`
            : undefined
        }
        action={
          !disabled ? (
            <div className="flex items-center gap-2">
              {pendingCount > 0 && onApproveAll && (
                <HrButton onClick={onApproveAll} icon={CheckCheck} variant="successOutline" size="md">
                  {t('empApproveAll') ?? 'Approve all'} ({pendingCount})
                </HrButton>
              )}
              <HrButton onClick={onAdd} icon={Plus} variant="primary" size="md">
                {t('empLogOvertime')}
              </HrButton>
            </div>
          ) : undefined
        }
      />

      {/* Summary row */}
      {overtimeRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <HrStat icon={Clock} label={t('empTotalOTHours')} value={`${totalHours.toFixed(1)}h`} />
          <HrStat
            icon={CheckCircle2}
            tone="success"
            label={t('empApproved')}
            value={`${approvedHours.toFixed(1)}h`}
            hint={
              totalHours > 0
                ? `${Math.round((approvedHours / totalHours) * 100)}% ${t('empOfTotal') ?? 'of total'}`
                : undefined
            }
          />
          <HrStat
            icon={AlarmClock}
            tone={totalHours - approvedHours > 0 ? 'warning' : 'neutral'}
            label={t('empPendingApproval')}
            value={`${(totalHours - approvedHours).toFixed(1)}h`}
          />
        </div>
      )}

      {overtimeRecords.length === 0 ? (
        <HrEmptyState
          icon={AlarmClock}
          title={t('empNoOvertimeYet')}
          description={t('empNoOvertimeHint')}
          action={
            !disabled ? (
              <HrButton onClick={onAdd} icon={Plus} variant="primary" size="md">
                {t('empLogOvertime')}
              </HrButton>
            ) : undefined
          }
        />
      ) : (
        <HrTableShell
          columns={[
            { label: t('empDate') },
            // Was labelled `empHourly` ("Hourly") over a cell showing hours worked.
            { label: t('empHours') ?? 'Hours', align: 'end' },
            { label: t('empMultiplier'), align: 'end' },
            { label: t('reason') },
            { label: t('status') },
            { label: t('empApprovedBy') },
            { label: '' },
          ]}
        >
          {overtimeRecords.map(o => (
            <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{fmt.date(o.date)}</td>
              <td className="px-4 py-3 text-end font-semibold text-slate-800 dark:text-slate-200">{o.hours}h</td>
              <td className="px-4 py-3 text-end text-slate-600 dark:text-slate-400">{o.multiplier}×</td>
              <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{o.reason ?? '—'}</td>
              <td className="px-4 py-3">
                <HrBadge tone={o.approved ? hrRequestStatusTone('approved') : hrRequestStatusTone('pending')}>
                  {o.approved ? t('empApproved') : t('empStatusPending')}
                </HrBadge>
              </td>
              <td className="px-4 py-3 text-slate-500">{o.approvedBy ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  {!disabled && !o.approved && (
                    <HrIconButton icon={CheckCircle} onClick={() => onApprove(o.id)} title={t('empApproved')} tone="success" />
                  )}
                  {/* Approval was a one-way latch: a mistake could only be undone by
                      deleting the record, which also destroyed the history. */}
                  {!disabled && o.approved && onRevoke && (
                    <HrIconButton
                      icon={Undo2}
                      onClick={() => onRevoke(o.id)}
                      title={t('empRevokeApproval') ?? 'Withdraw approval'}
                      tone="warning"
                    />
                  )}
                  {!disabled && (
                    <HrIconButton icon={Trash2} onClick={() => onDelete(o.id)} title={t('delete') ?? 'Delete'} tone="danger" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </HrTableShell>
      )}
    </div>
  )
}

