/**
 * Approvals inbox.
 *
 * The gap this fills: approvals already existed, but only *inside* one
 * employee's profile. To clear a queue of five requests you had to know which
 * five people had asked, then open five profiles — and if you missed one, nobody
 * told you. Every HR tool worth using has a single "waiting on you" list; this is
 * ours.
 *
 * Two kinds of decision live here, and both are reversible on purpose: leave can
 * go back to pending, and an overtime approval can be withdrawn rather than
 * deleted.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle,
  Clock,
  Inbox,
  Loader2,
  Plane,
  RefreshCw,
  Undo2,
  X,
} from 'lucide-react'

import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useHrFormat } from '../ui/hrFormat'

interface Approver {
  id: string
  name: string
  role: string | null
  department: string | null
}

interface PendingLeave {
  id: string
  employeeId: string
  employee: Approver
  type: string
  startDate: string
  endDate: string
  days: number
  reason: string | null
}

interface PendingOvertime {
  id: string
  employeeId: string
  employee: Approver
  date: string
  hours: number
  multiplier: number
  reason: string | null
}

interface LeaveBalance {
  allowance: number
  taken: number
  remaining: number
}

interface Props {
  /** Opens the employee profile so the approver can see the full picture. */
  onOpen: (employeeId: string) => void
}

export default function ApprovalsInbox({ onOpen }: Props) {
  const toast = useToast()
  const { t } = useLanguage()
  const hrFormat = useHrFormat()

  const [leave, setLeave] = useState<PendingLeave[]>([])
  const [overtime, setOvertime] = useState<PendingOvertime[]>([])
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ipc.employees.approvals.pending()
      setLeave(res?.leave ?? [])
      setOvertime(res?.overtime ?? [])
      setBalances(res?.leaveBalance ?? {})
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const decideLeave = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    setBusy(id)
    try {
      const res = await ipc.employees.leave.setStatus(id, status)
      if (res?.success) {
        toast.success?.(
          status === 'approved'
            ? t('hrInboxLeaveApproved')
            : status === 'rejected'
              ? t('hrInboxLeaveRejected')
              : t('hrInboxReturnedToPending')
        )
        await load()
      } else {
        toast.error?.(t('hrInboxCouldNotRequest'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  const decideOvertime = async (id: string, approved: boolean) => {
    setBusy(id)
    try {
      const res = await ipc.employees.overtime.approve(id, undefined, approved)
      if (res?.success) {
        toast.success?.(
          approved ? t('hrInboxOvertimeApproved') : t('hrInboxApprovalWithdrawn')
        )
        await load()
      } else {
        toast.error?.(t('hrInboxCouldNotRecord'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  const total = leave.length + overtime.length

  const fmtDate = (value: string) =>
    hrFormat.date(value, { day: 'numeric', month: 'short' })

  const days = (from: string, to: string) => {
    const ms = new Date(to).getTime() - new Date(from).getTime()
    return Math.max(1, Math.round(ms / 86400000) + 1)
  }

  const LEAVE_TYPE_KEY: Record<string, string> = {
    annual: 'empLeaveAnnual',
    sick: 'empLeaveSick',
    unpaid: 'empLeaveUnpaid',
    other: 'empLeaveOther',
  }

  const typeLabel = (type: string) => {
    const key = LEAVE_TYPE_KEY[type]
    return key ? t(key) : type
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Inbox size={18} />
          {t('hrInboxTitle')}
          {total > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {total}
            </span>
          )}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {t('hrInboxSubtitle')}
        </p>
      </div>
      <button
        onClick={() => void load()}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {t('hrInboxRefresh')}
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!total) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {t('hrInboxEmpty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}

      {/* ── Leave ─────────────────────────────────────────────────────────── */}
      {leave.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <Plane size={15} className="text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('hrInboxLeave')}
            </h3>
            <span className="text-xs text-slate-400">({leave.length})</span>
          </header>

          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {leave.map((request) => {
              const requested = request.days || days(request.startDate, request.endDate)
              const balance = balances[request.employeeId]
              // Only annual leave draws on the allowance, and only flag it when the
              // approver can actually do something about it.
              const overBalance =
                request.type === 'annual' && balance ? requested > balance.remaining : false

              return (
                <li key={request.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onOpen(request.employeeId)}
                        className="text-sm font-semibold text-slate-900 hover:text-primary dark:text-white"
                      >
                        {request.employee.name}
                      </button>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {typeLabel(request.type)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {fmtDate(request.startDate)} → {fmtDate(request.endDate)} · {requested}{' '}
                        {requested === 1 ? t('hrInboxDay') : t('hrInboxDaysPlural')}
                      </span>
                    </div>

                    {request.reason ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{request.reason}</p>
                    ) : null}

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      {request.employee.role ? <span>{request.employee.role}</span> : null}
                      {request.employee.department ? <span>· {request.employee.department}</span> : null}
                      {balance ? (
                        <span>
                          · {t('hrInboxBalanceLeft')}: {balance.remaining}/{balance.allowance}
                        </span>
                      ) : null}
                    </div>

                    {overBalance ? (
                      <p className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                        <AlertTriangle size={11} />
                        {t('hrInboxOverBalance', { left: balance?.remaining ?? 0 })}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => decideLeave(request.id, 'approved')}
                      disabled={busy === request.id}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {busy === request.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      {t('hrInboxApprove')}
                    </button>
                    <button
                      onClick={() => decideLeave(request.id, 'rejected')}
                      disabled={busy === request.id}
                      className="flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    >
                      <X size={12} />
                      {t('hrInboxReject')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ── Overtime ──────────────────────────────────────────────────────── */}
      {overtime.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <Clock size={15} className="text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('hrInboxOvertime')}
            </h3>
            <span className="text-xs text-slate-400">({overtime.length})</span>
            <span className="ms-auto text-[11px] text-slate-400">
              {t('hrInboxOvertimeHint')}
            </span>
          </header>

          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {overtime.map((record) => (
              <li key={record.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onOpen(record.employeeId)}
                      className="text-sm font-semibold text-slate-900 hover:text-primary dark:text-white"
                    >
                      {record.employee.name}
                    </button>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {record.hours}h × {record.multiplier}×
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {hrFormat.date(record.date)}
                    </span>
                  </div>
                  {record.reason ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{record.reason}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => decideOvertime(record.id, true)}
                    disabled={busy === record.id}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {busy === record.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    {t('hrInboxApprove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reversing a decision is a normal part of the job, so say where it lives. */}
      <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        <Undo2 size={13} className="mt-0.5 shrink-0" />
        {t('hrInboxUndoHint')}
      </p>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <CalendarCheck size={13} />
        {t('hrInboxAttendanceHint')}
      </p>
    </div>
  )
}
