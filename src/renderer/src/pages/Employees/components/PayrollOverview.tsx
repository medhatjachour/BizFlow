/**
 * PayrollOverview
 *
 * A payroll management table shown as a top-level tab on the Employees page.
 * Displays all employees' payroll records for a selected year/month with
 * actions: Add Payroll and Mark as Paid.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle, ChevronLeft, ChevronRight, DollarSign, Clock, AlertCircle } from 'lucide-react'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import type { Employee, EmployeePayroll } from '../types'
import Modal from '../../../components/ui/Modal'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface PayrollRow {
  employee: Employee
  record: EmployeePayroll | null
}

export default function PayrollOverview() {
  const navigate = useNavigate()
  const toast = useToast()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-based
  const [rows, setRows] = useState<PayrollRow[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)

  // ── Add-payroll modal ──────────────────────────────────────────────────────
  const [addTarget, setAddTarget] = useState<Employee | null>(null)
  const [addForm, setAddForm] = useState({ baseSalary: 0, bonuses: 0, deductions: 0, notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [employees, allPayroll]: [Employee[], EmployeePayroll[]] = await Promise.all([
        ipc.employees.getAll(),
        ipc.employees.payroll.getAll(year),
      ])
      const monthRecords = (allPayroll || []).filter(p => p.month === month && p.year === year)
      const byEmployee: Record<string, EmployeePayroll> = {}
      for (const r of monthRecords) byEmployee[r.employeeId] = r

      setRows((employees || []).map(emp => ({
        employee: emp,
        record: byEmployee[emp.id] ?? null,
      })))
    } catch {
      toast.error?.('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { load() }, [load])

  const handleMarkPaid = async (recordId: string) => {
    setMarkingId(recordId)
    try {
      const res = await ipc.employees.payroll.markPaid(recordId)
      if (res?.success || res === undefined) {
        toast.success?.('Salary marked as paid')
        load()
      } else {
        toast.error?.(res?.message || 'Failed to mark as paid')
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setMarkingId(null)
    }
  }

  const openAdd = (emp: Employee) => {
    setAddForm({ baseSalary: emp.salary ?? 0, bonuses: 0, deductions: 0, notes: '' })
    setAddTarget(emp)
  }

  const handleAdd = async () => {
    if (!addTarget) return
    setSaving(true)
    try {
      const res = await ipc.employees.payroll.upsert({
        employeeId: addTarget.id,
        month,
        year,
        ...addForm,
        status: 'pending',
      })
      if (res?.success || res?.id) {
        toast.success?.('Payroll added')
        setAddTarget(null)
        load()
      } else {
        toast.error?.(res?.message || 'Failed to add payroll')
      }
    } catch (err: any) {
      toast.error?.(err.message)
    } finally {
      setSaving(false)
    }
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const paid = rows.filter(r => r.record?.status === 'paid').length
  const pending = rows.filter(r => r.record?.status === 'pending').length
  const noRecord = rows.filter(r => !r.record).length
  const totalPaid = rows.reduce((sum, r) => sum + (r.record?.status === 'paid' ? r.record.netPay : 0), 0)
  const totalPending = rows.reduce((sum, r) => sum + (r.record?.status === 'pending' ? r.record.netPay : 0), 0)

  return (
    <div className="space-y-6">
      {/* Header + Month navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-slate-900 dark:text-white text-lg min-w-[160px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
            <CheckCircle size={13} /> {paid} paid · ${totalPaid.toFixed(0)}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium">
            <Clock size={13} /> {pending} pending · ${totalPending.toFixed(0)}
          </span>
          {noRecord > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium">
              <AlertCircle size={13} /> {noRecord} no record
            </span>
          )}
        </div>
      </div>

      {/* Table */}
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
                  {['Employee', 'Role / Dept', 'Base Salary', 'Net Pay', 'Bonuses', 'Deductions', 'Status', 'Actions'].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rows.map(({ employee: emp, record }) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="font-medium text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors text-left"
                      >
                        {emp.name}
                      </button>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      <div>{emp.role}</div>
                      {emp.department && <div className="text-slate-400">{emp.department}</div>}
                    </td>

                    {/* Base salary (from employee record, not payroll row) */}
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      ${(record?.baseSalary ?? emp.salary ?? 0).toFixed(2)}
                    </td>

                    {/* Net pay */}
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {record ? `$${record.netPay.toFixed(2)}` : '—'}
                    </td>

                    {/* Bonuses */}
                    <td className="px-4 py-3 text-green-600">
                      {record ? `+$${record.bonuses.toFixed(2)}` : '—'}
                    </td>

                    {/* Deductions */}
                    <td className="px-4 py-3 text-red-500">
                      {record ? `-$${record.deductions.toFixed(2)}` : '—'}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      {record ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'paid'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {record.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          No record
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
                            {markingId === record.id ? 'Saving…' : 'Mark Paid'}
                          </button>
                        )}
                        {!record && (
                          <button
                            onClick={() => openAdd(emp)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <Plus size={12} /> Add Payroll
                          </button>
                        )}
                        {record && (
                          <button
                            onClick={() => openAdd(emp)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <DollarSign size={12} /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Payroll Modal */}
      <Modal
        isOpen={!!addTarget}
        onClose={() => setAddTarget(null)}
        title={`Payroll — ${addTarget?.name ?? ''} · ${MONTH_NAMES[month - 1]} ${year}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Base Salary</label>
              <input type="number" min={0} value={addForm.baseSalary}
                onChange={e => setAddForm(p => ({ ...p, baseSalary: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bonuses</label>
              <input type="number" min={0} value={addForm.bonuses}
                onChange={e => setAddForm(p => ({ ...p, bonuses: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Deductions</label>
              <input type="number" min={0} value={addForm.deductions}
                onChange={e => setAddForm(p => ({ ...p, deductions: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div className="flex flex-col justify-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <span className="text-xs text-slate-500 mb-0.5">Net Pay</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                ${(addForm.baseSalary + addForm.bonuses - addForm.deductions).toFixed(2)}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
            <textarea rows={2} value={addForm.notes}
              onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button onClick={() => setAddTarget(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Payroll'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
