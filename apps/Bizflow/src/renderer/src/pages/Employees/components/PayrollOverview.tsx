/**
 * PayrollOverview — enhanced
 *
 * Features:
 *  - Period tabs: Monthly / Weekly / Daily  (switches display period)
 *  - Employee salary type badge per row
 *  - Schedule indicator: shows when next payment is due based on salary type
 *  - Live net-pay preview in modal
 *  - "Auto-generate All" bulk action for the current period
 *  - Payroll record pre-filled from employee's salary
 *  - Confirm / edit workflow per employee
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, CheckCircle, ChevronLeft, ChevronRight, DollarSign,
  Clock, AlertCircle, Zap, CalendarDays, RefreshCw,
  TrendingUp, TrendingDown, Download,
} from 'lucide-react'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import { employeeStatusLabel, formatCount, formatDate, useHrFormat } from '../ui/hrFormat'
import { HrField, HrModalActions, HrStat, HR_TEXTAREA_CLASS } from '../ui/primitives'
import type { Employee, EmployeePayroll } from '../types'
import { encodePayrollPeriodKey, resolvePayrollPeriod } from '../payrollPeriod'
import {
  PAYROLL_RUN_TRANSITIONS,
  canEditPeriod,
  isRunActionAvailable,
  runStatusKey,
  type PayrollRunAction,
} from '../../../../../shared/hrPayrollRun'
import { hourlyRateFor, salaryPeriodSuffix, standardHoursFor } from '../../../../../shared/hrRate'
import Modal from '../../../components/ui/Modal'

// ─── Constants ─────────────────────────────────────────────────────────────────

// Week helpers
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * `Week 37 · 8 Sep – 14 Sep`.
 *
 * The week number is translated and the dates follow the active language, but the
 * date pattern itself is pinned to the same shape `useHrFormat` uses so a period
 * label on this screen matches a date everywhere else in the module.
 */
function getWeekLabel(week: number, year: number, t: (k: string, p?: Record<string, unknown>) => string, language: string): string {
  // Approx start of week
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const start = new Date(simple)
  start.setDate(simple.getDate() - dow + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const short = { month: 'short', day: 'numeric' } as const
  return `${t('empPayrollWeek', { n: week })} · ${formatDate(start, language, short)}–${formatDate(end, language, short)}`
}

// ─── Types ──────────────────────────────────────────────────────────────────────

type PeriodType = 'monthly' | 'weekly' | 'daily'

interface PayrollRow {
  employee: Employee
  record: EmployeePayroll | null
}

/** Period state, mirroring `model PayrollRun`. */
interface PayrollRun {
  id: string
  year: number
  month: number
  status: string
  headcount: number
  grossTotal: number
  netTotal: number
  notes?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  lockedAt?: string | null
  reopenedBy?: string | null
  reopenedAt?: string | null
  reopenReason?: string | null
}

export interface AddForm {
  baseSalary: number
  bonuses: number
  deductions: number
  overtimeHours: number
  overtimeMultiplier: number
  daysWorked: number
  notes: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const INP = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors'

/**
 * Standard hours a pay period is spread over, per salary type.
 *
 * Was a local copy of the rule; now re-exported from `shared/hrRate` so the main
 * process, this modal and the employee profile cannot drift apart again.
 */
export { standardHoursFor } from '../../../../../shared/hrRate'

/** Overtime pay for the hours in the form, priced from the employee's own rate. */
export function computeOvertimePay(emp: Employee, form: AddForm): number {
  return form.overtimeHours * hourlyRateFor(emp.salary, emp.salaryType) * form.overtimeMultiplier
}

function salaryTypeColor(type: string): string {
  switch (type) {
    case 'monthly': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'weekly':  return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
    case 'daily':   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'hourly':  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
    default:        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
  }
}

/**
 * Net pay exactly as the main process will compute and store it.
 *
 * This used to prorate a monthly salary for weekly/daily periods and price
 * overtime at `base / 8 / 30`, none of which the backend did — so the number on
 * screen was not the number in the database. It now mirrors `employees:payroll:upsert`:
 * base + overtime + bonuses − deductions.
 */
function computeNet(emp: Employee, form: AddForm): number {
  return Math.max(0, form.baseSalary + computeOvertimePay(emp, form) + form.bonuses - form.deductions)
}

/**
 * Base pay for the period from a rate and days worked.
 * Only meaningful for hourly and daily staff — everyone else is paid by period.
 */
function periodBaseFromRate(emp: Employee, daysWorked: number): number {
  const rate = Number(emp.salary) || 0
  if (emp.salaryType === 'hourly') return rate * daysWorked * 8
  if (emp.salaryType === 'daily')  return rate * daysWorked
  return rate
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PayrollOverview() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  const fmt = useHrFormat()
  const actor = user?.username ?? user?.id ?? undefined
  const now = new Date()

  // ── Period state ─────────────────────────────────────────────────────────────
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)   // 1-based
  const [week,  setWeek]  = useState(getWeekNumber(now))    // 1-52
  const [day,   setDay]   = useState(now.getDate())         // 1-31

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [rows,    setRows]    = useState<PayrollRow[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [runBusy, setRunBusy] = useState<string | null>(null)
  const [showReopen, setShowReopen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')

  // ── Add/edit modal ─────────────────────────────────────────────────────────
  const [addTarget,  setAddTarget]  = useState<Employee | null>(null)
  const [editRecord, setEditRecord] = useState<EmployeePayroll | null>(null)
  const [addForm,   setAddForm]   = useState<AddForm>({
    baseSalary: 0, bonuses: 0, deductions: 0,
    overtimeHours: 0, overtimeMultiplier: 1.5, daysWorked: 0, notes: '',
  })
  const [saving, setSaving] = useState(false)

  // ── Period key used for storing records (encoded so monthly/weekly/daily never collide) ──
  const periodKey = encodePayrollPeriodKey(periodType, month, week, day)
  // The same period expressed as real dates. Sent with every write so the main
  // process never has to decode the packed key — that decoding is what it got
  // wrong before, and the cost was overtime quietly missing for weekly/daily staff.
  const period = resolvePayrollPeriod(periodType, year, month, week, day)

  // ── Load ──────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [employees, allPayroll, currentRun]: [Employee[], EmployeePayroll[], PayrollRun | null] = await Promise.all([
        ipc.employees.getAll(),
        ipc.employees.payroll.getAll(year),
        ipc.employees.payrollRuns.get(year, periodKey),
      ])
      const periodRecords = (allPayroll || []).filter(p => p.month === periodKey && p.year === year)
      const byEmp: Record<string, EmployeePayroll> = {}
      for (const r of periodRecords) byEmp[r.employeeId] = r

      setRun(currentRun ?? null)
      setRows((employees || []).map(emp => ({
        employee: emp,
        record: byEmp[emp.id] ?? null,
      })))
    } catch {
      toast.error?.(t('empPayrollErrLoad'))
    } finally {
      setLoading(false)
    }
  }, [year, periodKey])

  useEffect(() => { load() }, [load])

  // ── Period navigation ─────────────────────────────────────────────────────────
  function prevPeriod() {
    if (periodType === 'monthly') {
      if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
    } else if (periodType === 'weekly') {
      if (week === 1) { setWeek(52); setYear(y => y - 1) } else setWeek(w => w - 1)
    } else {
      if (day === 1) { setDay(31) } else { setDay(d => d - 1) }
    }
  }
  function nextPeriod() {
    if (periodType === 'monthly') {
      if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
    } else if (periodType === 'weekly') {
      if (week === 52) { setWeek(1); setYear(y => y + 1) } else setWeek(w => w + 1)
    } else {
      if (day === 31) { setDay(1) } else { setDay(d => d + 1) }
    }
  }
  const periodLabel = useMemo(() => {
    const months = fmt.monthNames('long')
    if (periodType === 'monthly') return `${months[month - 1]} ${year}`
    if (periodType === 'weekly')  return getWeekLabel(week, year, t, fmt.language)
    return `${t('empPayrollDay', { n: day })} · ${months[month - 1]} ${year}`
  }, [periodType, year, month, week, day, fmt, t])

  // ── Mark paid ─────────────────────────────────────────────────────────────────
  const handleMarkPaid = async (recordId: string) => {
    setMarkingId(recordId)
    try {
      const res = await ipc.employees.payroll.markPaid(recordId)
      if (res?.success || res === undefined) { toast.success?.(t('empPayrollPaidOk')); load() }
      else toast.error?.(res?.message || t('empPayrollPaidErr'))
    } catch (err: any) { toast.error?.(err.message) }
    finally { setMarkingId(null) }
  }

  // ── Open modal ───────────────────────────────────────────────────────────────
  function openModal(emp: Employee, existing: EmployeePayroll | null) {
    setAddTarget(emp)
    setEditRecord(existing)
    if (existing) {
      setAddForm({
        baseSalary:         existing.baseSalary,
        bonuses:            existing.bonuses,
        deductions:         existing.deductions,
        // Load what was actually stored, not zeroes. The old form opened every
        // record with OT at 0 and days at 0, so saving an edit silently wiped
        // both — you could not even see what you were overwriting.
        overtimeHours:      existing.overtimeHours ?? 0,
        overtimeMultiplier: 1.5,
        daysWorked:         existing.regularHours ? Math.round((existing.regularHours / 8) * 10) / 10
                            : emp.salaryType === 'daily' ? 1 : 0,
        notes:              existing.notes ?? '',
      })
    } else {
      const base = emp.salary ?? 0
      setAddForm({
        baseSalary:         base,
        bonuses:            0,
        deductions:         0,
        overtimeHours:      0,
        overtimeMultiplier: 1.5,
        daysWorked:         emp.salaryType === 'daily' ? 1 : 0,
        notes:              '',
      })
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!addTarget) return
    setSaving(true)
    try {
      // Send every figure the form collects. The main process recomputes
      // gross/net from what it receives, so anything omitted here is silently
      // replaced by an auto-computed value the user never saw — which is how the
      // modal and the database ended up disagreeing about people's pay.
      const res = await ipc.employees.payroll.upsert({
        employeeId: addTarget.id,
        month: periodKey,
        year,
        periodType: period.periodType,
        periodKey: period.periodKey,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        baseSalary:    addForm.baseSalary,
        regularHours:  addForm.daysWorked * 8,
        overtimeHours: addForm.overtimeHours,
        overtimePay:   computeOvertimePay(addTarget, addForm),
        bonuses:       addForm.bonuses,
        deductions:    addForm.deductions,
        notes:         addForm.notes || null,
        // Never downgrade a paid period. Editing used to hardcode 'pending', so
        // opening a paid row and saving reset it to pending and cleared the
        // payment date. Reversing a payment goes through handleReopen.
        status:   editRecord?.status ?? 'pending',
        paidDate: editRecord?.paidDate ?? null,
      })
      if (res?.success || res?.id) {
        toast.success?.(editRecord ? t('empPayrollSavedOk') : t('empPayrollCreatedOk'))
        setAddTarget(null)
        setEditRecord(null)
        load()
      } else {
        toast.error?.(res?.message || t('empPayrollSaveErr'))
      }
    } catch (err: any) { toast.error?.(err.message) }
    finally { setSaving(false) }
  }

  // ── Reopen a paid period ─────────────────────────────────────────────────────
  /**
   * The only way to take a payment back.
   *
   * Deliberately explicit and logged: a paid period is history, and the previous
   * behaviour (an edit form that always saved as pending) reversed payments by
   * accident rather than on purpose.
   */
  const handleReopen = async (record: EmployeePayroll) => {
    setMarkingId(record.id)
    try {
      const res = await ipc.employees.payroll.upsert({
        employeeId: record.employeeId,
        month: record.month,
        year: record.year,
        baseSalary:    record.baseSalary,
        regularHours:  record.regularHours ?? 0,
        overtimeHours: record.overtimeHours ?? 0,
        overtimePay:   record.overtimePay ?? 0,
        extraShifts:   record.extraShifts ?? 0,
        extraShiftPay: record.extraShiftPay ?? 0,
        bonuses:       record.bonuses,
        deductions:    record.deductions,
        notes:         record.notes ?? null,
        reopen:        true,
      })
      if (res?.success) { toast.success?.(t('empPayrollReopenedOk')); load() }
      else toast.error?.(res?.message || t('empPayrollReopenErr'))
    } catch (err: any) { toast.error?.(err.message) }
    finally { setMarkingId(null) }
  }

  // ── Bulk auto-generate ────────────────────────────────────────────────────────
  const handleBulkGenerate = async () => {
    const missing = rows.filter(r => !r.record && r.employee.status === 'active')
    if (missing.length === 0) { toast.success?.(t('empPayrollAllPresent')); return }
    setBulkGenerating(true)
    let count = 0
    for (const { employee: emp } of missing) {
      try {
        await ipc.employees.payroll.upsert({
          employeeId: emp.id,
          month:      periodKey,
          year,
          periodType: period.periodType,
          periodKey:  period.periodKey,
          periodStart: period.periodStart,
          periodEnd:  period.periodEnd,
          baseSalary: emp.salary ?? 0,
          bonuses:    0,
          deductions: 0,
          status:     'pending',
          notes:      t('empPayrollGeneratedNote', { period: periodLabel }),
        })
        count++
      } catch { /* skip one failure, continue */ }
    }
    toast.success?.(t('empPayrollGenerated', { n: count }))
    load()
    setBulkGenerating(false)
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const paid      = rows.filter(r => r.record?.status === 'paid').length
  const pending   = rows.filter(r => r.record?.status === 'pending').length
  const missing   = rows.filter(r => !r.record && r.employee.status === 'active').length
  const totalPaid    = rows.reduce((s, r) => s + (r.record?.status === 'paid'    ? r.record.netPay : 0), 0)
  const totalPending = rows.reduce((s, r) => s + (r.record?.status === 'pending' ? r.record.netPay : 0), 0)

  // ── Period state actions ────────────────────────────────────────────────────
  /** A frozen period refuses every write, including from this screen. */
  const frozen = !canEditPeriod(run?.status)

  const runTone = !run || run.status === 'draft'
    ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    : run.status === 'approved'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : run.status === 'paid'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'

  const runAction = async (action: PayrollRunAction) => {
    if (action === 'reopen' && !reopenReason.trim()) {
      setShowReopen(true)
      return
    }
    setRunBusy(action)
    try {
      // Open the period first when it has no run yet, so a manager can approve a
      // month they have just filled in without a separate "create" step.
      if (!run && action !== 'reopen') {
        const created = await ipc.employees.payrollRuns.ensure(year, periodKey, actor)
        if (!created?.success) {
          toast.error?.(created?.message || t('empPayrollOpenErr'))
          return
        }
      }

      const res =
        action === 'approve'  ? await ipc.employees.payrollRuns.approve(year, periodKey, actor)
      : action === 'markPaid' ? await ipc.employees.payrollRuns.markAllPaid(year, periodKey, actor)
      : action === 'lock'     ? await ipc.employees.payrollRuns.lock(year, periodKey, actor)
      :                         await ipc.employees.payrollRuns.reopen(year, periodKey, actor, reopenReason)

      if (res?.success) {
        const done: Record<PayrollRunAction, string> = {
          approve:  t('empPayrollApproveOk'),
          markPaid: t('empPayrollMarkAllPaidOk'),
          lock:     t('empPayrollLockOk'),
          reopen:   t('empPayrollRunReopenedOk'),
        }
        toast.success?.(done[action])
        setShowReopen(false)
        setReopenReason('')
        await load()
      } else {
        toast.error?.(res?.message || t('empPayrollRunErr'))
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setRunBusy(null)
    }
  }

  /**
   * Payment file for the period.
   *
   * Built in the renderer from rows the main process returns: the module already
   * exports CSV this way, and every bank wants a slightly different layout, so
   * handing over clean data beats inventing one nobody can import.
   */
  const exportPaymentFile = async () => {
    setRunBusy('bank')
    try {
      const res = await ipc.employees.payrollRuns.bankExport(year, periodKey)
      const exportRows: Array<{ name: string; bankName: string; iban: string; amount: number; reference: string; status: string }> = res?.rows ?? []
      if (!exportRows.length) {
        toast.error?.(t('empPayrollNothingToPay'))
        return
      }
      const header = [
        t('empPayrollCsvEmployee'),
        t('empPayrollCsvBank'),
        t('empPayrollCsvIban'),
        t('empPayrollCsvAmount'),
        t('empPayrollCsvReference'),
        t('empPayrollCsvStatus'),
      ]
      const csv = [header, ...exportRows.map(r => [r.name, r.bankName, r.iban, r.amount.toFixed(2), r.reference, r.status])]
        .map(line => line.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payroll-${year}-${periodKey}.csv`
      link.click()
      URL.revokeObjectURL(url)

      // Paying someone with no bank details means a manual transfer, so say so
      // rather than letting them silently drop out of the file.
      if (res?.missing?.length) {
        toast.error?.(t('empPayrollExportPartial', { n: res.missing.length, names: res.missing.join(', ') }))
      } else {
        toast.success?.(t('empPayrollExportOk'))
      }
    } catch (err: any) {
      toast.error?.(err.message || t('empPayrollExportErr'))
    } finally {
      setRunBusy(null)
    }
  }

  // ── Live net in modal ─────────────────────────────────────────────────────────
  const liveNet  = addTarget ? computeNet(addTarget, addForm) : 0
  const netColor = liveNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'

  return (
    <div className="space-y-5">

      {/* ── Period type tabs ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {(['monthly', 'weekly', 'daily'] as PeriodType[]).map(pt => (
            <button
              key={pt}
              onClick={() => setPeriodType(pt)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                periodType === pt
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {pt === 'monthly' ? t('empPayrollPeriodMonthly')
               : pt === 'weekly' ? t('empPayrollPeriodWeekly')
               : t('empPayrollPeriodDaily')}
            </button>
          ))}
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-2">
          <button onClick={prevPeriod} aria-label={t('empPayrollPrevPeriod')} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rtl:rotate-180">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-slate-900 dark:text-white text-sm min-w-[200px] text-center">
            {periodLabel}
          </span>
          <button onClick={nextPeriod} aria-label={t('empPayrollNextPeriod')} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rtl:rotate-180">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Bulk generate */}
        <button
          onClick={handleBulkGenerate}
          disabled={bulkGenerating || missing === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bulkGenerating
            ? <RefreshCw size={15} className="animate-spin" />
            : <Zap size={15} />}
          {missing > 0 ? t('empPayrollAutoGenerateMissing', { n: missing }) : t('empPayrollAutoGenerate')}
        </button>
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HrStat
          icon={CheckCircle}
          tone="success"
          label={t('empPaid')}
          value={`${paid}`}
          hint={totalPaid > 0 ? fmt.money(totalPaid, { decimals: 0 }) : undefined}
        />
        <HrStat
          icon={Clock}
          tone="warning"
          label={t('empStatusPending')}
          value={`${pending}`}
          hint={totalPending > 0 ? fmt.money(totalPending, { decimals: 0 }) : undefined}
        />
        <HrStat
          icon={AlertCircle}
          tone={missing > 0 ? 'danger' : 'neutral'}
          label={t('empNoRecord')}
          value={`${missing}`}
        />
        <HrStat
          icon={TrendingUp}
          tone="info"
          label={t('empTotal')}
          value={fmt.money(totalPaid + totalPending, { decimals: 0 })}
        />
      </div>

      {/* ── Period state ──────────────────────────────────────────────────
          The gate on this screen. A closed period is a record of something that
          already happened, so it refuses edits until it is deliberately reopened. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${runTone}`}>
              {t(runStatusKey(run?.status))}
            </span>
            {run ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('empPayrollRunSummary', {
                  n: run.headcount,
                  gross: fmt.money(run.grossTotal, { decimals: 0 }),
                  net: fmt.money(run.netTotal, { decimals: 0 }),
                })}
              </span>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('empPayrollNoRunYet')}
              </span>
            )}
            {run?.reopenedAt ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {t('empPayrollReopenedBy', { by: run.reopenedBy ?? t('empPayrollSomeone') })}
                {run.reopenReason ? ` · ${run.reopenReason}` : ''}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['approve', 'markPaid', 'lock'] as PayrollRunAction[]).map(action =>
              isRunActionAvailable(run?.status, action) ? (
                <button
                  key={action}
                  onClick={() => void runAction(action)}
                  disabled={runBusy !== null}
                  title={t(PAYROLL_RUN_TRANSITIONS[action].hintKey)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {runBusy === action ? t('empRunWorking') : t(PAYROLL_RUN_TRANSITIONS[action].labelKey)}
                </button>
              ) : null
            )}
            {frozen ? (
              <button
                onClick={() => void runAction('reopen')}
                disabled={runBusy !== null}
                title={t(PAYROLL_RUN_TRANSITIONS.reopen.hintKey)}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                {t(PAYROLL_RUN_TRANSITIONS.reopen.labelKey)}
              </button>
            ) : null}
            <button
              onClick={exportPaymentFile}
              disabled={runBusy !== null || !paid}
              title={t('empPayrollDownloadPayment')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download size={12} /> {t('empPayrollExportFile')}
            </button>
          </div>
        </div>

        {showReopen ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <input
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder={t('empPayrollReopenReason')}
              aria-label={t('empPayrollReopenReason')}
              className="min-w-64 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <button
              onClick={() => void runAction('reopen')}
              disabled={runBusy !== null || !reopenReason.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {runBusy === 'reopen' ? t('empPayrollReopening') : t('empPayrollReopenRun')}
            </button>
            <button
              onClick={() => { setShowReopen(false); setReopenReason('') }}
              className="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
            >
              {t('cancel')}
            </button>
          </div>
        ) : null}

        {frozen ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {t('empPayrollFrozenHint')}
          </p>
        ) : null}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-slate-400">{t('empPayrollNoEmployees')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {[
                    'employeeName',
                    'empPayrollColSchedule',
                    'empPayrollColBase',
                    'empPayrollColNet',
                    'empPayrollColAdjust',
                    'status',
                    'actions',
                  ].map(key => (
                    <th key={key} className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{t(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rows.map(({ employee: emp, record }) => {
                  const netPay = record?.netPay ?? null
                  return (
                    <tr key={emp.id} className={`transition-colors ${!record && emp.status === 'active' ? 'bg-amber-50/40 dark:bg-amber-900/5 hover:bg-amber-50 dark:hover:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>

                      {/* Employee */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          className="font-medium text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors text-start"
                        >
                          {emp.name}
                        </button>
                        {emp.role && (
                          <div className="text-xs text-slate-400 mt-0.5">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</div>
                        )}
                      </td>

                      {/* Schedule badge */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${salaryTypeColor(emp.salaryType)}`}>
                          {t(
                            emp.salaryType === 'weekly' ? 'empPayrollPeriodWeekly'
                            : emp.salaryType === 'daily' ? 'empPayrollPeriodDaily'
                            : 'empPayrollPeriodMonthly'
                          )}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {fmt.money(Number(emp.salary), { decimals: 0 })}/{salaryPeriodSuffix(emp.salaryType)}
                        </div>
                      </td>

                      {/* Base salary */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium" dir="ltr">
                        {fmt.money(record?.baseSalary ?? emp.salary ?? 0)}
                      </td>

                      {/* Net pay */}
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white" dir="ltr">
                        {netPay !== null ? fmt.money(netPay) : '—'}
                      </td>

                      {/* Bonus / Deductions inline */}
                      <td className="px-4 py-3">
                        {record ? (
                          <div className="flex items-center gap-2 text-xs" dir="ltr">
                            {record.bonuses > 0 && (
                              <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 font-medium">
                                <TrendingUp size={11} />+{fmt.money(record.bonuses, { decimals: 0 })}
                              </span>
                            )}
                            {record.deductions > 0 && (
                              <span className="flex items-center gap-0.5 text-red-500 dark:text-red-400 font-medium">
                                <TrendingDown size={11} />−{fmt.money(record.deductions, { decimals: 0 })}
                              </span>
                            )}
                            {record.bonuses === 0 && record.deductions === 0 && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        ) : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {record ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {record.status === 'paid' ? t('empPaid') : t('empStatusPending')}
                          </span>
                        ) : emp.status === 'active' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            <AlertCircle size={11} /> {t('empPayrollDue')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">
                            {employeeStatusLabel(emp.status, t)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {record?.status === 'pending' && !frozen && (
                            <button
                              onClick={() => handleMarkPaid(record.id)}
                              disabled={markingId === record.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              <CheckCircle size={12} />
                              {markingId === record.id ? t('empPayrollSaving') : t('empPayrollConfirmPaid')}
                            </button>
                          )}
                          {/* Paid periods are history: correcting one is an explicit act. */}
                          {record?.status === 'paid' && !frozen && (
                            <button
                              onClick={() => handleReopen(record)}
                              disabled={markingId === record.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                              title={t('empPayrollReopenRow')}
                            >
                              <RefreshCw size={12} />
                              {markingId === record.id ? t('empPayrollSaving') : t('empPayrollReopenRowShort')}
                            </button>
                          )}
                          {!record ? (
                            <button
                              onClick={() => openModal(emp, null)}
                              disabled={frozen}
                              title={frozen ? t('empPayrollFrozenAdd') : undefined}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                            >
                              <Plus size={12} /> {t('empPayrollGenerate')}
                            </button>
                          ) : (
                            <button
                              onClick={() => openModal(emp, record)}
                              disabled={frozen}
                              title={frozen ? t('empPayrollFrozenEdit') : undefined}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                            >
                              <DollarSign size={12} /> {t('edit')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={!!addTarget}
        onClose={() => { setAddTarget(null); setEditRecord(null) }}
        title={editRecord
          ? t('empPayrollModalEdit', { name: addTarget?.name ?? '' })
          : t('empPayrollModalCreate', { name: addTarget?.name ?? '' })}
        size="md"
      >
        {addTarget && (
          <div className="space-y-5">

            {/* Period & schedule context */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
              <CalendarDays size={16} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{periodLabel}</p>
                <p className="text-xs text-slate-400">
                  {addTarget.role} · <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[11px] font-medium ${salaryTypeColor(addTarget.salaryType)}`}>
                    {t(
                      addTarget.salaryType === 'weekly' ? 'empPayrollPeriodWeekly'
                      : addTarget.salaryType === 'daily' ? 'empPayrollPeriodDaily'
                      : 'empPayrollPeriodMonthly'
                    )}
                  </span> · {t('empPayrollBase')} <span dir="ltr">{fmt.money(Number(addTarget.salary), { decimals: 0 })}</span>/{addTarget.salaryType === 'hourly' ? salaryPeriodSuffix('hourly') : t('period')}
                </p>
              </div>
              {editRecord && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                  editRecord.status === 'paid'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {editRecord.status === 'paid' ? t('empPaid') : t('empStatusPending')}
                </span>
              )}
            </div>

            {/* Pay fields */}
            <div className="grid grid-cols-2 gap-4">
              <HrField
                label={addTarget.salaryType === 'hourly'
                  ? t('empPayrollBasePeriod')
                  : addTarget.salaryType === 'daily'
                    ? t('empPayrollBaseDays')
                    : t('empPayrollBaseSalary')}
              >
                <input
                  type="number" min={0} step={0.01}
                  value={addForm.baseSalary}
                  onChange={e => setAddForm(p => ({ ...p, baseSalary: Number(e.target.value) }))}
                  className={INP}
                />
              </HrField>

              {(addTarget.salaryType === 'hourly' || addTarget.salaryType === 'daily') && (
                <HrField label={t('empPayrollDaysWorked')}>
                  <input
                    type="number" min={0} step={1}
                    value={addForm.daysWorked}
                    onChange={e => setAddForm(p => ({ ...p, daysWorked: Number(e.target.value) }))}
                    className={INP}
                  />
                  {/*
                    The recalculated figure is spelled out rather than silently applied:
                    the button is the only thing that overwrites an amount the manager typed.
                  */}
                  <button
                    type="button"
                    onClick={() => setAddForm(p => ({ ...p, baseSalary: periodBaseFromRate(addTarget, p.daysWorked) }))}
                    className="mt-1 text-[11px] font-semibold text-primary hover:underline text-start"
                  >
                    {t('empPayrollUseRate', {
                      rate: formatCount(Number(addTarget.salary)),
                      unit: addTarget.salaryType === 'hourly' ? t('empPayrollPerHour8') : t('empPayrollPerDay'),
                      n: addForm.daysWorked || 0,
                      total: fmt.money(periodBaseFromRate(addTarget, addForm.daysWorked)),
                    })}
                  </button>
                </HrField>
              )}

              <HrField label={t('empPayrollOvertimeHours')}>
                <input
                  type="number" min={0} step={0.5}
                  value={addForm.overtimeHours}
                  onChange={e => setAddForm(p => ({ ...p, overtimeHours: Number(e.target.value) }))}
                  className={INP}
                />
              </HrField>

              <HrField label={t('empPayrollOtMultiplier')} hint={t('empPayrollOtMultiplierHint')}>
                <input
                  type="number" min={1} step={0.1}
                  value={addForm.overtimeMultiplier}
                  onChange={e => setAddForm(p => ({ ...p, overtimeMultiplier: Number(e.target.value) }))}
                  className={INP}
                />
              </HrField>

              <HrField label={<><span className="text-green-500">+</span> {t('empPayrollBonuses')}</>}>
                <input
                  type="number" min={0} step={0.01}
                  value={addForm.bonuses}
                  onChange={e => setAddForm(p => ({ ...p, bonuses: Number(e.target.value) }))}
                  className={INP}
                />
              </HrField>

              <HrField label={<><span className="text-red-500">−</span> {t('empPayrollDeductions')}</>}>
                <input
                  type="number" min={0} step={0.01}
                  value={addForm.deductions}
                  onChange={e => setAddForm(p => ({ ...p, deductions: Number(e.target.value) }))}
                  className={INP}
                />
              </HrField>
            </div>

            {/* Live net pay preview */}
            <div className={`rounded-xl p-4 border ${liveNet >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 flex-1">
                  <div className="flex justify-between gap-8">
                    <span>{t('empPayrollBasePay')}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300" dir="ltr">
                      {fmt.money(addForm.baseSalary)}
                    </span>
                  </div>
                  {addForm.overtimeHours > 0 && (
                    <div className="flex justify-between gap-8">
                      <span>{t('empPayrollOvertimeLine', { h: addForm.overtimeHours, m: addForm.overtimeMultiplier })}</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400" dir="ltr">
                        +{fmt.money(computeOvertimePay(addTarget, addForm))}
                      </span>
                    </div>
                  )}
                  {addForm.bonuses > 0 && (
                    <div className="flex justify-between gap-8">
                      <span>{t('empPayrollBonuses')}</span>
                      <span className="font-medium text-green-600 dark:text-green-400" dir="ltr">+{fmt.money(addForm.bonuses)}</span>
                    </div>
                  )}
                  {addForm.deductions > 0 && (
                    <div className="flex justify-between gap-8">
                      <span>{t('empPayrollDeductions')}</span>
                      <span className="font-medium text-red-500" dir="ltr">−{fmt.money(addForm.deductions)}</span>
                    </div>
                  )}
                </div>
                <div className="text-end">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">{t('empPayrollNetPay')}</p>
                  <p className={`text-3xl font-black tabular-nums ${netColor}`} dir="ltr">
                    {fmt.money(liveNet)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {t('empPayrollStoredHint', {
                  name: addTarget.name,
                  rate: formatCount(Number(addTarget.salary)),
                  hours: standardHoursFor(addTarget.salaryType),
                  basis: addTarget.salaryType === 'hourly'
                    ? t('empPayrollBasisHourly')
                    : t('empPayrollBasisStandard'),
                })}
              </p>
            </div>

            {/* Notes */}
            <HrField label={t('empPayrollNotesOptional')}>
              <textarea
                rows={2}
                value={addForm.notes}
                onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
                placeholder={t('empPayrollNotesPlaceholder')}
                className={HR_TEXTAREA_CLASS}
              />
            </HrField>

            <HrModalActions
              onCancel={() => { setAddTarget(null); setEditRecord(null) }}
              onSubmit={handleSave}
              submitting={saving}
              cancelLabel={t('cancel')}
              submitLabel={editRecord ? t('empPayrollSubmitEdit') : t('empPayrollSubmitCreate')}
              submitIcon={CheckCircle}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
