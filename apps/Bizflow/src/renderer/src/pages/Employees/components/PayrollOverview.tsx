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
  TrendingUp, TrendingDown,
} from 'lucide-react'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import type { Employee, EmployeePayroll } from '../types'
import { encodePayrollPeriodKey } from '../utils'
import Modal from '../../../components/ui/Modal'

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// Week helpers
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
function getWeekLabel(week: number, year: number): string {
  // Approx start of week
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const start = new Date(simple)
  start.setDate(simple.getDate() - dow + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `Week ${week} · ${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})}–${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`
}

// ─── Types ──────────────────────────────────────────────────────────────────────

type PeriodType = 'monthly' | 'weekly' | 'daily'

interface PayrollRow {
  employee: Employee
  record: EmployeePayroll | null
}

interface AddForm {
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

function salaryTypeColor(type: string): string {
  switch (type) {
    case 'monthly': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'weekly':  return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
    case 'daily':   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'hourly':  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
    default:        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
  }
}

function computeNet(emp: Employee, form: AddForm, periodType: PeriodType): number {
  const base = form.baseSalary
  let periodBase = base
  if (emp.salaryType === 'monthly' && periodType === 'weekly')  periodBase = base / 4.33
  if (emp.salaryType === 'monthly' && periodType === 'daily')   periodBase = base / 30
  if (emp.salaryType === 'hourly')  periodBase = base * form.daysWorked * 8 // 8h day
  const overtime = (emp.salaryType === 'hourly' ? base : (base / 8 / 30))
    * form.overtimeHours * form.overtimeMultiplier
  return Math.max(0, periodBase + overtime + form.bonuses - form.deductions)
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PayrollOverview() {
  const navigate = useNavigate()
  const toast = useToast()
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

  // ── Load ──────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [employees, allPayroll]: [Employee[], EmployeePayroll[]] = await Promise.all([
        ipc.employees.getAll(),
        ipc.employees.payroll.getAll(year),
      ])
      const periodRecords = (allPayroll || []).filter(p => p.month === periodKey && p.year === year)
      const byEmp: Record<string, EmployeePayroll> = {}
      for (const r of periodRecords) byEmp[r.employeeId] = r

      setRows((employees || []).map(emp => ({
        employee: emp,
        record: byEmp[emp.id] ?? null,
      })))
    } catch {
      toast.error?.('Failed to load payroll data')
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
    if (periodType === 'monthly') return `${MONTH_NAMES[month - 1]} ${year}`
    if (periodType === 'weekly')  return getWeekLabel(week, year)
    return `Day ${day} · ${MONTH_NAMES[month - 1]} ${year}`
  }, [periodType, year, month, week, day])

  // ── Mark paid ─────────────────────────────────────────────────────────────────
  const handleMarkPaid = async (recordId: string) => {
    setMarkingId(recordId)
    try {
      const res = await ipc.employees.payroll.markPaid(recordId)
      if (res?.success || res === undefined) { toast.success?.('Salary marked as paid'); load() }
      else toast.error?.(res?.message || 'Failed to mark as paid')
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
        overtimeHours:      0,
        overtimeMultiplier: 1.5,
        daysWorked:         emp.salaryType === 'daily' ? 1 : 0,
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
      const netPay = computeNet(addTarget, addForm, periodType)
      const res = await ipc.employees.payroll.upsert({
        employeeId: addTarget.id,
        month: periodKey,
        year,
        baseSalary: addForm.baseSalary,
        bonuses:    addForm.bonuses,
        deductions: addForm.deductions,
        netPay,
        notes:  addForm.notes || null,
        status: 'pending',
      })
      if (res?.success || res?.id) {
        toast.success?.(editRecord ? 'Payroll updated' : 'Payroll record created')
        setAddTarget(null)
        setEditRecord(null)
        load()
      } else {
        toast.error?.(res?.message || 'Failed to save payroll')
      }
    } catch (err: any) { toast.error?.(err.message) }
    finally { setSaving(false) }
  }

  // ── Bulk auto-generate ────────────────────────────────────────────────────────
  const handleBulkGenerate = async () => {
    const missing = rows.filter(r => !r.record && r.employee.status === 'active')
    if (missing.length === 0) { toast.success?.('All active employees already have a record for this period'); return }
    setBulkGenerating(true)
    let count = 0
    for (const { employee: emp } of missing) {
      try {
        await ipc.employees.payroll.upsert({
          employeeId: emp.id,
          month:      periodKey,
          year,
          baseSalary: emp.salary ?? 0,
          bonuses:    0,
          deductions: 0,
          netPay:     emp.salary ?? 0,
          status:     'pending',
          notes:      `Auto-generated · ${periodLabel}`,
        })
        count++
      } catch { /* skip one failure, continue */ }
    }
    toast.success?.(`Generated ${count} payroll record${count !== 1 ? 's' : ''} — review and confirm each one`)
    load()
    setBulkGenerating(false)
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const paid      = rows.filter(r => r.record?.status === 'paid').length
  const pending   = rows.filter(r => r.record?.status === 'pending').length
  const missing   = rows.filter(r => !r.record && r.employee.status === 'active').length
  const totalPaid    = rows.reduce((s, r) => s + (r.record?.status === 'paid'    ? r.record.netPay : 0), 0)
  const totalPending = rows.reduce((s, r) => s + (r.record?.status === 'pending' ? r.record.netPay : 0), 0)

  // ── Live net in modal ─────────────────────────────────────────────────────────
  const liveNet  = addTarget ? computeNet(addTarget, addForm, periodType) : 0
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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                periodType === pt
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {pt}
            </button>
          ))}
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-2">
          <button onClick={prevPeriod} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-slate-900 dark:text-white text-sm min-w-[200px] text-center">
            {periodLabel}
          </span>
          <button onClick={nextPeriod} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
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
          Auto-generate {missing > 0 ? `(${missing} missing)` : ''}
        </button>
      </div>

      {/* ── Summary chips ──────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
          <CheckCircle size={13} /> {paid} paid
          {totalPaid > 0 && <span className="font-semibold ml-0.5">${totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium">
          <Clock size={13} /> {pending} pending
          {totalPending > 0 && <span className="font-semibold ml-0.5">${totalPending.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
        </span>
        {missing > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium">
            <AlertCircle size={13} /> {missing} no record
          </span>
        )}
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium">
          <TrendingUp size={13} /> Total ${(totalPaid + totalPending).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-slate-400">No employees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Employee', 'Schedule', 'Base Salary', 'Net Pay', '+Bonus / −Ded', 'Status', 'Actions'].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
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
                          className="font-medium text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors text-left"
                        >
                          {emp.name}
                        </button>
                        {emp.role && (
                          <div className="text-xs text-slate-400 mt-0.5">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</div>
                        )}
                      </td>

                      {/* Schedule badge */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${salaryTypeColor(emp.salaryType)}`}>
                          {emp.salaryType || 'monthly'}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          ${Number(emp.salary).toLocaleString()}/{emp.salaryType === 'hourly' ? 'hr' : emp.salaryType === 'daily' ? 'day' : emp.salaryType === 'weekly' ? 'wk' : 'mo'}
                        </div>
                      </td>

                      {/* Base salary */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        ${(record?.baseSalary ?? emp.salary ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Net pay */}
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {netPay !== null ? `$${netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>

                      {/* Bonus / Deductions inline */}
                      <td className="px-4 py-3">
                        {record ? (
                          <div className="flex items-center gap-2 text-xs">
                            {record.bonuses > 0 && (
                              <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 font-medium">
                                <TrendingUp size={11} />+${record.bonuses.toFixed(0)}
                              </span>
                            )}
                            {record.deductions > 0 && (
                              <span className="flex items-center gap-0.5 text-red-500 dark:text-red-400 font-medium">
                                <TrendingDown size={11} />−${record.deductions.toFixed(0)}
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
                            {record.status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        ) : emp.status === 'active' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            <AlertCircle size={11} /> Due
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500">
                            {emp.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {record?.status === 'pending' && (
                            <button
                              onClick={() => handleMarkPaid(record.id)}
                              disabled={markingId === record.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              <CheckCircle size={12} />
                              {markingId === record.id ? 'Saving…' : 'Confirm Paid'}
                            </button>
                          )}
                          {!record ? (
                            <button
                              onClick={() => openModal(emp, null)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              <Plus size={12} /> Generate
                            </button>
                          ) : (
                            <button
                              onClick={() => openModal(emp, record)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              <DollarSign size={12} /> Edit
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
          ? `Edit Payroll — ${addTarget?.name ?? ''}`
          : `Generate Payroll — ${addTarget?.name ?? ''}`}
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
                    {addTarget.salaryType}
                  </span> · Base ${Number(addTarget.salary).toLocaleString()}/{addTarget.salaryType === 'hourly' ? 'hr' : 'period'}
                </p>
              </div>
              {editRecord && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                  editRecord.status === 'paid'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {editRecord.status}
                </span>
              )}
            </div>

            {/* Pay fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Base {addTarget.salaryType === 'hourly' ? 'Rate / hr' : 'Salary'}
                </label>
                <input
                  type="number" min={0} step={0.01}
                  value={addForm.baseSalary}
                  onChange={e => setAddForm(p => ({ ...p, baseSalary: Number(e.target.value) }))}
                  className={INP}
                />
              </div>

              {(addTarget.salaryType === 'daily') && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Days Worked</label>
                  <input
                    type="number" min={0} step={1}
                    value={addForm.daysWorked}
                    onChange={e => setAddForm(p => ({ ...p, daysWorked: Number(e.target.value) }))}
                    className={INP}
                  />
                </div>
              )}

              {(addTarget.salaryType === 'hourly') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Days Worked</label>
                    <input
                      type="number" min={0} step={1}
                      value={addForm.daysWorked}
                      onChange={e => setAddForm(p => ({ ...p, daysWorked: Number(e.target.value) }))}
                      className={INP}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Overtime Hours</label>
                <input
                  type="number" min={0} step={0.5}
                  value={addForm.overtimeHours}
                  onChange={e => setAddForm(p => ({ ...p, overtimeHours: Number(e.target.value) }))}
                  className={INP}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">OT Multiplier</label>
                <input
                  type="number" min={1} step={0.1}
                  value={addForm.overtimeMultiplier}
                  onChange={e => setAddForm(p => ({ ...p, overtimeMultiplier: Number(e.target.value) }))}
                  className={INP}
                />
                <p className="text-[11px] text-slate-400 mt-0.5">1.5 = time-and-a-half</p>
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="text-green-500">+</span> Bonuses
                </label>
                <input
                  type="number" min={0} step={0.01}
                  value={addForm.bonuses}
                  onChange={e => setAddForm(p => ({ ...p, bonuses: Number(e.target.value) }))}
                  className={INP}
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="text-red-500">−</span> Deductions
                </label>
                <input
                  type="number" min={0} step={0.01}
                  value={addForm.deductions}
                  onChange={e => setAddForm(p => ({ ...p, deductions: Number(e.target.value) }))}
                  className={INP}
                />
              </div>
            </div>

            {/* Live net pay preview */}
            <div className={`rounded-xl p-4 border ${liveNet >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between gap-8">
                    <span>Base pay</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      ${addForm.baseSalary.toFixed(2)}
                    </span>
                  </div>
                  {addForm.overtimeHours > 0 && (
                    <div className="flex justify-between gap-8">
                      <span>Overtime ({addForm.overtimeHours}h × {addForm.overtimeMultiplier}×)</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        +${((addTarget.salaryType === 'hourly' ? addForm.baseSalary : addForm.baseSalary / 8 / 30) * addForm.overtimeHours * addForm.overtimeMultiplier).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {addForm.bonuses > 0 && (
                    <div className="flex justify-between gap-8">
                      <span>Bonuses</span>
                      <span className="font-medium text-green-600 dark:text-green-400">+${addForm.bonuses.toFixed(2)}</span>
                    </div>
                  )}
                  {addForm.deductions > 0 && (
                    <div className="flex justify-between gap-8">
                      <span>Deductions</span>
                      <span className="font-medium text-red-500">−${addForm.deductions.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-0.5">Net Pay</p>
                  <p className={`text-3xl font-black tabular-nums ${netColor}`}>
                    ${liveNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
              <textarea
                rows={2}
                value={addForm.notes}
                onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Reason for bonus, overtime project, etc."
                className={INP + ' resize-none'}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setAddTarget(null); setEditRecord(null) }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 btn-primary"
              >
                {saving
                  ? <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                  : <><CheckCircle size={14} /> {editRecord ? 'Update Payroll' : 'Create & Confirm'}</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
