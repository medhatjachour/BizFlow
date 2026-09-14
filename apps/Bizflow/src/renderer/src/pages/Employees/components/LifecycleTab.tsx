/**
 * Lifecycle tab — onboarding and offboarding.
 *
 * The two ends of the employment journey, which previously did not exist: a new
 * hire was a row with a hire date, and a leaver was a status flip.
 *
 * Design notes worth keeping:
 *  - Onboarding and offboarding share one checklist model, so they share one
 *    screen shape. Only the surrounding context differs.
 *  - The settlement is a *preview*. Nothing is written until a human confirms it,
 *    and the confirm step is what creates the final payslip.
 *  - Offboarding cannot be closed while required tasks are open, but the override
 *    exists and is recorded — insisting on a perfect process is how people work
 *    around software instead of using it.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  UserPlus,
  Wallet,
} from 'lucide-react'

import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import {
  checklistProgress,
  type ChecklistCategory,
  type ChecklistPhase,
  type EmployeeChecklistItem,
  type EmployeeProfile,
} from '../types'
import { daysUntil, expiryState } from '../expiry'
import { localDayOffset } from '../shiftTimes'
import { useHrFormat } from '../ui/hrFormat'

interface Props {
  emp: EmployeeProfile
  /** Re-reads the profile (and the list) after any change. */
  onChanged: () => void
  disabled?: boolean
}

interface SettlementView {
  dailyRate: number
  monthlyRate: number
  completedYears: number
  proratedDays: number
  daysInFinalMonth: number
  lines: { label: string; amount: number }[]
  grossTotal: number
  deductions: number
  total: number
  leaveAllowance: number
  leaveTaken: number
  overtimeHours: number
  overtimePay: number
}

const EXIT_REASONS = [
  'resignation',
  'end-of-contract',
  'dismissal',
  'redundancy',
  'retirement',
] as const

const CATEGORIES: ChecklistCategory[] = [
  'documents', 'access', 'equipment', 'payroll', 'handover', 'compliance', 'other',
]

// Label lookups live here rather than inline so a new category or exit reason is
// a one-line change next to the key it needs, not a new branch in the renderer.
const CATEGORY_KEY: Record<ChecklistCategory, string> = {
  documents: 'lcCatDocuments',
  access: 'lcCatAccess',
  equipment: 'lcCatEquipment',
  payroll: 'lcCatPayroll',
  handover: 'lcCatHandover',
  compliance: 'lcCatCompliance',
  other: 'lcCatOther',
}

const EXIT_REASON_KEY: Record<string, string> = {
  resignation: 'lcReasonResignation',
  'end-of-contract': 'lcReasonEndOfContract',
  dismissal: 'lcReasonDismissal',
  redundancy: 'lcReasonRedundancy',
  retirement: 'lcReasonRetirement',
}

/** Settlement line keys come from the main process; unknown ones pass through. */
const SETTLEMENT_LINE_KEY: Record<string, string> = {
  salaryForDaysWorked: 'lcSalaryForDays',
  overtime: 'lcOvertime',
  extraShifts: 'lcExtraShifts',
  leaveEncashment: 'lcLeaveEncashment',
  endOfService: 'lcEndOfService',
  otherAdditions: 'lcOtherAdditions',
  deductions: 'lcDeductions',
}

export default function LifecycleTab({ emp, onChanged, disabled }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  const hrFormat = useHrFormat()
  const actor = user?.username ?? user?.id ?? undefined

  const [busy, setBusy] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<SettlementView | null>(null)
  const [showOffboard, setShowOffboard] = useState(false)
  const [outstanding, setOutstanding] = useState<string[]>([])
  const [newTask, setNewTask] = useState<{ phase: ChecklistPhase; title: string; category: ChecklistCategory }>({
    phase: 'onboarding',
    title: '',
    category: 'other',
  })

  // Settlement options. The gratuity basis is a business convention, so it is an
  // input rather than a constant buried in the code.
  const [gratuityMonths, setGratuityMonths] = useState(1)
  const [includeGratuity, setIncludeGratuity] = useState(true)
  const [additions, setAdditions] = useState(0)
  const [deductions, setDeductions] = useState(0)

  const [offboardForm, setOffboardForm] = useState({
    lastWorkingDate: localDayOffset(0),
    exitReason: 'resignation' as string,
    rehireEligible: true,
    notes: '',
  })

  const items = emp.checklistItems ?? []
  const onboarding = items.filter((item) => item.phase === 'onboarding')
  const offboarding = items.filter((item) => item.phase === 'offboarding')
  const onboardProgress = checklistProgress(onboarding)
  const offboardProgress = checklistProgress(offboarding)

  const isTerminated = emp.status === 'terminated'
  const offboardingStarted = Boolean(emp.lastWorkingDate) || offboarding.length > 0

  const categoryLabel = (category: ChecklistCategory): string => t(CATEGORY_KEY[category] ?? 'lcCatOther')

  const reasonLabel = (reason: string): string => {
    const key = EXIT_REASON_KEY[reason]
    return key ? t(key) : reason
  }

  const lineLabel = (label: string): string => {
    const key = SETTLEMENT_LINE_KEY[label]
    return key ? t(key) : label
  }

  // Settlement amounts are money somebody will actually be paid, so they must use
  // the store currency and never be rounded — this was a hardcoded `$`.
  const money = (value: number) => hrFormat.money(value)

  // ── Settlement preview ──────────────────────────────────────────────────────
  const loadSettlement = useCallback(async () => {
    if (!offboardingStarted) return
    try {
      const res = await ipc.employees.offboarding.settlement({
        employeeId: emp.id,
        gratuityMonthsPerYear: gratuityMonths,
        includeGratuity,
        additions,
        deductions,
      })
      setSettlement(res ?? null)
    } catch (err: any) {
      toast.error?.(err.message)
    }
  }, [emp.id, offboardingStarted, gratuityMonths, includeGratuity, additions, deductions, toast])

  useEffect(() => { void loadSettlement() }, [loadSettlement])

  // ── Checklist actions ───────────────────────────────────────────────────────
  const toggleItem = async (item: EmployeeChecklistItem) => {
    if (disabled) return
    setBusy(item.id)
    try {
      const res = await ipc.employees.checklist.toggle(item.id, !item.completed, actor)
      if (res?.success) onChanged()
      else toast.error?.(t('lcCouldNotUpdateTask'))
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  const addTask = async (phase: ChecklistPhase) => {
    const title = newTask.title.trim()
    if (!title) return
    setBusy('add-task')
    try {
      const res = await ipc.employees.checklist.add({
        employeeId: emp.id,
        phase,
        title,
        category: newTask.category,
        required: true,
      })
      if (res?.success) {
        setNewTask({ phase, title: '', category: 'other' })
        onChanged()
      } else {
        toast.error?.(t('lcCouldNotAddTask'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  const removeTask = async (id: string) => {
    setBusy(id)
    try {
      const res = await ipc.employees.checklist.remove(id)
      if (res?.success) onChanged()
      else toast.error?.(t('lcCouldNotRemoveTask'))
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  const startOnboarding = async () => {
    setBusy('start-onboarding')
    try {
      const res = await ipc.employees.onboarding.start(emp.id, 3, actor)
      if (res?.success) {
        toast.success?.(t('lcTasksAdded', { count: res.created ?? 0 }))
        onChanged()
      } else {
        toast.error?.(t('lcCouldNotStartOnboarding'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  // ── Offboarding actions ────────────────────────────────────────────────────
  const initiateOffboarding = async () => {
    setBusy('initiate')
    try {
      const res = await ipc.employees.offboarding.initiate({
        employeeId: emp.id,
        lastWorkingDate: offboardForm.lastWorkingDate,
        exitReason: offboardForm.exitReason,
        rehireEligible: offboardForm.rehireEligible,
        exitInterviewNotes: offboardForm.notes,
        performedBy: actor,
      })
      if (res?.success) {
        toast.success?.(t('lcOffboardingStarted'))
        setShowOffboard(false)
        onChanged()
      } else {
        toast.error?.(t('lcCouldNotStartOffboarding'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  const completeOffboarding = async (force?: boolean) => {
    setBusy('complete')
    try {
      const res = await ipc.employees.offboarding.complete(emp.id, actor, force)
      if (res?.success) {
        setOutstanding([])
        toast.success?.(t('lcOffboardingCompleted'))
        onChanged()
      } else if (res?.code === 'OUTSTANDING_TASKS') {
        // Not an error: the screen shows the list and offers the override.
        setOutstanding(res.outstanding ?? [])
      } else {
        toast.error?.(t('lcCouldNotCompleteOffboarding'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  /**
   * Turn the confirmed figures into a payroll record.
   *
   * Deliberately explicit: the settlement is computed for display, and only this
   * button writes anything. The figures are passed explicitly so the stored
   * payslip matches the numbers the manager just approved.
   */
  const createFinalPayslip = async () => {
    if (!settlement) return
    setBusy('payslip')
    try {
      const lastDay = new Date(emp.lastWorkingDate ?? Date.now())
      const res = await ipc.employees.payroll.upsert({
        employeeId: emp.id,
        month: lastDay.getMonth() + 1,
        year: lastDay.getFullYear(),
        baseSalary: settlement.lines.find((l) => l.label === 'salaryForDaysWorked')?.amount ?? 0,
        overtimeHours: settlement.overtimeHours,
        overtimePay: settlement.overtimePay,
        extraShifts: 0,
        extraShiftPay: 0,
        bonuses: settlement.lines
          .filter((l) => l.amount > 0 && l.label !== 'salaryForDaysWorked' && l.label !== 'overtime')
          .reduce((sum, l) => sum + l.amount, 0),
        deductions: settlement.deductions,
        status: 'pending',
        notes: t('lcSettlementNoteText', {
          date: hrFormat.date(lastDay),
          years: settlement.completedYears,
        }),
        performedBy: actor,
      })
      if (res?.success || res?.id) {
        toast.success?.(t('lcCreatePayslipDone'))
        onChanged()
      } else {
        toast.error?.(t('lcCouldNotCreatePayslip'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setBusy(null)
    }
  }

  // ── Checklist rendering ────────────────────────────────────────────────────
  const renderList = (phase: ChecklistPhase, list: EmployeeChecklistItem[], progress: ReturnType<typeof checklistProgress>) => {
    if (!list.length) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-600">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {phase === 'onboarding'
              ? t('lcNoOnboardingYet')
              : t('lcNoOffboardingYet')}
          </p>
          {!disabled ? (
            <button
              onClick={startOnboardingFor(phase)}
              disabled={busy !== null}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {busy === 'start-onboarding' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {phase === 'onboarding' ? t('lcStartOnboarding') : t('lcStartOffboarding')}
            </button>
          ) : null}
        </div>
      )
    }

    const byCategory = CATEGORIES.map((category) => ({
      category,
      items: list.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0)

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${
                progress.complete ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {t('lcProgress', { done: progress.done, total: progress.total })}
          </span>
          {progress.complete ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <BadgeCheck size={13} /> {t('lcAllDone')}
            </span>
          ) : (
            <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">
              {t('lcWaitingOn', { count: progress.requiredOpen })}
            </span>
          )}
        </div>

        {byCategory.map((group) => (
          <div key={group.category}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {categoryLabel(group.category)}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                >
                  <button
                    onClick={() => toggleItem(item)}
                    disabled={disabled || busy === item.id}
                    className="mt-0.5 shrink-0 disabled:opacity-50"
                    aria-label={item.completed ? t('lcMarkNotDone') : t('lcMarkDone')}
                  >
                    {busy === item.id ? (
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    ) : item.completed ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <Circle size={16} className="text-slate-300 dark:text-slate-600" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        item.completed
                          ? 'text-slate-400 line-through dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {item.required ? t('lcRequired') : t('lcOptional')}
                      {item.completedBy ? ` · ${item.completedBy}` : ''}
                      {item.completedAt ? ` · ${hrFormat.date(item.completedAt)}` : ''}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </p>
                  </div>

                  {!disabled && !item.completed ? (
                    <button
                      onClick={() => removeTask(item.id)}
                      className="shrink-0 p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                      aria-label={t('lcDeleteTask')}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {!disabled ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              value={newTask.phase === phase ? newTask.title : ''}
              onChange={(event) => setNewTask({ phase, title: event.target.value, category: newTask.category })}
              onKeyDown={(event) => { if (event.key === 'Enter') void addTask(phase) }}
              placeholder={t('lcAddTask')}
              className="min-w-48 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <select
              value={newTask.category}
              onChange={(event) => setNewTask({ phase, title: newTask.title, category: event.target.value as ChecklistCategory })}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{categoryLabel(category)}</option>
              ))}
            </select>
            <button
              onClick={() => void addTask(phase)}
              disabled={busy === 'add-task' || !newTask.title.trim() || newTask.phase !== phase}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t('lcAdd')}
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  /** Start either phase: onboarding seeds its own list, offboarding needs details first. */
  const startOnboardingFor = (phase: ChecklistPhase) => async () => {
    if (phase === 'onboarding') {
      await startOnboarding()
    } else {
      setShowOffboard(true)
    }
  }

  const probationDays = daysUntil(emp.probationEndDate)
  const probationState = expiryState(emp.probationEndDate, 30)

  return (
    <div className="space-y-5">
      {/* Probation — the one onboarding fact with a deadline attached. */}
      {!isTerminated && emp.probationEndDate && probationState !== 'none' ? (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            probationState === 'expired'
              ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'
              : probationState === 'soon'
                ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-900/10'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
          }`}
        >
          <CalendarClock size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {t('lcProbation')} · {hrFormat.date(emp.probationEndDate)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {probationState === 'expired' || (probationDays ?? 0) < 0
                ? t('lcProbationEnded')
                : t('lcProbationLeft', { days: probationDays ?? 0 })}
              {' · '}
              {t('lcProbationNote')}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Onboarding ────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('lcOnboarding')}</h3>
          <span className="text-xs text-slate-400">{t('lcOnboardingLead')}</span>
        </header>
        {renderList('onboarding', onboarding, onboardProgress)}
      </section>

      {/* ── Offboarding ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <header className="mb-3 flex flex-wrap items-center gap-2">
          <LogOut size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('lcOffboarding')}</h3>
          <span className="text-xs text-slate-400">{t('lcOffboardingLead')}</span>
        </header>

        {isTerminated ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              <BadgeCheck size={15} /> {t('lcTerminated')}
            </p>
            {emp.lastWorkingDate ? (
              <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-300/80">
                {t('lcLastWorkingDay')}: {hrFormat.date(emp.lastWorkingDate)}
                {emp.exitReason ? ` · ${reasonLabel(emp.exitReason)}` : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        {!offboardingStarted && !isTerminated ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-600">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('lcNoOffboardingInProgress')}
            </p>
            <button
              onClick={() => setShowOffboard(true)}
              disabled={disabled}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              <LogOut size={14} /> {t('lcStartOffboarding')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Exit summary */}
            <dl className="grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3 dark:bg-slate-900/40">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('lcLastWorkingDay')}</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                  {emp.lastWorkingDate
                    ? hrFormat.date(emp.lastWorkingDate)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('lcReason')}</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                  {emp.exitReason ? reasonLabel(emp.exitReason) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('lcRehire')}</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                  {emp.rehireEligible == null ? '—' : emp.rehireEligible ? t('lcYes') : t('lcNo')}
                </dd>
              </div>
            </dl>

            {renderList('offboarding', offboarding, offboardProgress)}

            {/* Outstanding-task block, shown only when completion was refused. */}
            {outstanding.length > 0 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  <AlertTriangle size={14} /> {t('lcOutstanding')}
                </p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {outstanding.map((title) => <li key={title}>· {title}</li>)}
                </ul>
              </div>
            ) : null}

            {/* ── Settlement ─────────────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Wallet size={15} className="text-primary" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('lcSettlement')}</h4>
                <span className="text-xs text-slate-400">{t('lcSettlementNote')}</span>
              </div>

              {settlement ? (
                <>
                  <dl className="space-y-1 text-sm">
                    {settlement.lines.map((line) => (
                      <div key={line.label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-slate-500 dark:text-slate-400">{lineLabel(line.label)}</dt>
                        <dd className={`tabular-nums ${line.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {line.amount < 0 ? `−${money(Math.abs(line.amount))}` : money(line.amount)}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                      <dt className="font-semibold text-slate-900 dark:text-white">{t('lcNet')}</dt>
                      <dd className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                        {money(settlement.total)}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-2 text-[11px] text-slate-400">
                    {t('lcDaysWorked', { days: settlement.proratedDays, of: settlement.daysInFinalMonth })} ·{' '}
                    {t('lcYearsOfService', { years: settlement.completedYears })}
                    {settlement.overtimeHours > 0 ? ` · ${settlement.overtimeHours}h OT` : ''}
                  </p>

                  {/* Options, because the gratuity basis is a business decision. */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('lcGratuityBasis')}
                      </span>
                      <input
                        type="number" min={0} step={0.5}
                        value={gratuityMonths}
                        onChange={(event) => setGratuityMonths(Number(event.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('lcOtherAdditions')}
                      </span>
                      <input
                        type="number" min={0} step={0.01}
                        value={additions}
                        onChange={(event) => setAdditions(Number(event.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('lcDeductions')}
                      </span>
                      <input
                        type="number" min={0} step={0.01}
                        value={deductions}
                        onChange={(event) => setDeductions(Number(event.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </label>
                    <label className="flex items-center gap-2 self-end text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeGratuity}
                        onChange={(event) => setIncludeGratuity(event.target.checked)}
                      />
                      {t('lcIncludeGratuity')}
                    </label>
                  </div>

                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{t('lcGratuityDisclaimer')}</p>

                  {!disabled ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={createFinalPayslip}
                        disabled={busy === 'payslip'}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                      >
                        {busy === 'payslip' ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                        {t('lcCreatePayslip')}
                      </button>
                      <button
                        onClick={() => void completeOffboarding(false)}
                        disabled={busy === 'complete'}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        {busy === 'complete' ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                        {t('lcComplete')}
                      </button>
                      {outstanding.length > 0 ? (
                        <button
                          onClick={() => void completeOffboarding(true)}
                          className="text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
                        >
                          {t('lcForce')}
                        </button>
                      ) : null}
                      <span className="text-[11px] text-slate-400">{t('lcReplaceWarning')}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex items-center gap-2 py-3 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  {t('lcCalculating')}
                </div>
              )}
            </div>

            {emp.exitInterviewNotes ? (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <ClipboardList size={12} /> {t('lcExitNotes')}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                  {emp.exitInterviewNotes}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Start offboarding modal ───────────────────────────────────────── */}
      {showOffboard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            aria-label={t('lcClose')}
            onClick={() => setShowOffboard(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('lcStartOffboarding')}</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('lcOffboardingLead')}</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('lcLastWorkingDay')}
                </span>
                <input
                  type="date"
                  value={offboardForm.lastWorkingDate}
                  onChange={(event) => setOffboardForm((prev) => ({ ...prev, lastWorkingDate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('lcReason')}
                </span>
                <select
                  value={offboardForm.exitReason}
                  onChange={(event) => setOffboardForm((prev) => ({ ...prev, exitReason: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  {EXIT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reasonLabel(reason)}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={offboardForm.rehireEligible}
                  onChange={(event) => setOffboardForm((prev) => ({ ...prev, rehireEligible: event.target.checked }))}
                />
                {t('lcRehire')}
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('lcExitNotes')}
                </span>
                <textarea
                  rows={3}
                  value={offboardForm.notes}
                  onChange={(event) => setOffboardForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowOffboard(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                {t('lcCancel')}
              </button>
              <button
                onClick={initiateOffboarding}
                disabled={busy === 'initiate'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === 'initiate' ? <Loader2 size={14} className="animate-spin" /> : null}
                {t('lcStartOffboarding')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
