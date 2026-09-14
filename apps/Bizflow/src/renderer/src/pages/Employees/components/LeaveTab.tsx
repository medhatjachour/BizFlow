import { CheckCheck, CheckCircle, Circle, CalendarCheck, CalendarClock, CheckCircle2, Plane, Plus, Trash2, XCircle } from 'lucide-react'
import type { EmployeeLeave, LeaveBalance, LeaveType } from '../types'
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
  type HrTone,
} from '../ui/primitives'

interface Props {
  leaveRecords: EmployeeLeave[]
  balance: LeaveBalance
  onAdd: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onApproveAll?: () => void
  onDelete: (id: string) => void
  disabled?: boolean
}

/** Leave type → the shared tone vocabulary, so "sick" is the same red as every other warning. */
const TYPE_TONE: Record<LeaveType, HrTone> = {
  annual: 'info',
  sick: 'danger',
  unpaid: 'neutral',
  other: 'brand',
}

export default function LeaveTab({ leaveRecords, balance, onAdd, onApprove, onReject, onApproveAll, onDelete, disabled }: Props) {
  const { t } = useLanguage()
  const fmt = useHrFormat()
  const pendingCount = leaveRecords.filter(l => l.status === 'pending').length

  const typeLabels: Record<LeaveType, string> = {
    annual: t('empLeaveAnnual') ?? 'Annual',
    sick:   t('empLeaveSick') ?? 'Sick',
    unpaid: t('empLeaveUnpaid') ?? 'Unpaid',
    other:  t('empLeaveOther') ?? 'Other',
  }

  return (
    <div className="space-y-4">
      <HrSectionHeader
        icon={Plane}
        title={t('empLeaveRecords') ?? 'Leave & time off'}
        subtitle={
          pendingCount > 0
            ? (t('empLeavePendingHint') ?? `${pendingCount} request(s) still awaiting a decision`)
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
                {t('empRequestLeave') ?? 'Request leave'}
              </HrButton>
            </div>
          ) : undefined
        }
      />

      {/* Balance summary. "Remaining" turns red when the balance is overspent,
          which the old plain number never showed. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HrStat icon={Circle} label={t('empLeaveAllowance') ?? 'Annual allowance'} value={balance.allowance} />
        <HrStat icon={CheckCircle2} tone="info" label={t('empLeaveTaken') ?? 'Taken'} value={balance.taken} />
        <HrStat icon={CalendarClock} tone="warning" label={t('empLeavePending') ?? 'Pending'} value={balance.pending} />
        <HrStat
          icon={CalendarCheck}
          tone={balance.remaining < 0 ? 'danger' : 'success'}
          label={t('empLeaveRemaining') ?? 'Remaining'}
          value={balance.remaining}
          hint={balance.remaining < 0 ? (t('empLeaveOverdrawn') ?? 'More taken than allowance') : undefined}
        />
      </div>

      {leaveRecords.length === 0 ? (
        <HrEmptyState
          icon={Plane}
          title={t('empNoLeaveYet') ?? 'No leave requests yet'}
          description={
            t('empNoLeaveHint') ??
            'Approved leave shows up here and is deducted from the annual allowance. You can also request leave on the employee\'s behalf.'
          }
          action={
            !disabled ? (
              <HrButton onClick={onAdd} icon={Plus} variant="primary" size="md">
                {t('empRequestLeave') ?? 'Request leave'}
              </HrButton>
            ) : undefined
          }
        />
      ) : (
        <HrTableShell
          columns={[
            { label: t('empLeaveType') ?? 'Type' },
            { label: t('period') },
            { label: t('empLeaveDays') ?? 'Days', align: 'end' },
            { label: t('reason') },
            { label: t('status') },
            { label: '' },
          ]}
        >
          {leaveRecords.map(l => (
            <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <td className="px-4 py-3">
                <HrBadge tone={TYPE_TONE[l.type] ?? 'neutral'}>{typeLabels[l.type] ?? l.type}</HrBadge>
              </td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                {fmt.date(l.startDate)} – {fmt.date(l.endDate)}
              </td>
              <td className="px-4 py-3 text-end font-semibold text-slate-800 dark:text-slate-200">{l.days}</td>
              <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{l.reason ?? '—'}</td>
              <td className="px-4 py-3">
                <HrBadge tone={hrRequestStatusTone(l.status)}>
                  {l.status === 'approved'
                    ? t('empApproved')
                    : l.status === 'rejected'
                      ? (t('empLeaveRejected') ?? 'Rejected')
                      : t('empStatusPending')}
                </HrBadge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  {!disabled && l.status === 'pending' && (
                    <>
                      <HrIconButton icon={CheckCircle} onClick={() => onApprove(l.id)} title={t('empApproved')} tone="success" />
                      <HrIconButton icon={XCircle} onClick={() => onReject(l.id)} title={t('empLeaveRejected') ?? 'Reject'} tone="warning" />
                    </>
                  )}
                  {!disabled && (
                    <HrIconButton icon={Trash2} onClick={() => onDelete(l.id)} title={t('delete') ?? 'Delete'} tone="danger" />
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
