/**
 * FinanceTab – Clinic Finance Management
 *
 * Two sections:
 *   1. Expenses  — clinic operating costs (rent, utilities, medical supplies…)
 *   2. Staff & Salaries — staff profiles + monthly salary records with
 *      support for full-time, part-time, overtime and double-shift bonuses.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Plus, Loader2, X,
  CheckCircle2, AlertCircle, Receipt, Users, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

// ─── Domain constants ─────────────────────────────────────────────────────────

type Period  = 'today' | 'week' | 'month' | 'year'
type Section = 'expenses' | 'staff'

const EXPENSE_CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: 'rent',             label: 'Rent / Lease',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'utilities',        label: 'Utilities',        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'medical_supplies', label: 'Medical Supplies', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'medications',      label: 'Medications',      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  { value: 'equipment',        label: 'Equipment',        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { value: 'maintenance',      label: 'Maintenance',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'lab_fees',         label: 'Lab Fees',         color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  { value: 'insurance',        label: 'Insurance',        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'marketing',        label: 'Marketing',        color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  { value: 'cleaning',         label: 'Cleaning',         color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'salaries',         label: 'Salaries',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'other',            label: 'Other',            color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
]

const STAFF_ROLES    = ['doctor', 'nurse', 'receptionist', 'technician', 'pharmacist', 'other']
const MONTHS         = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getCatCfg(cat: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === cat) ?? { label: cat, color: 'bg-slate-100 text-slate-600' }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string; date: string; category: string; description: string
  amount: number; vendor?: string | null; paymentMethod: string
  recurrence: string; notes?: string | null
}

interface Staff {
  id: string; name: string; role: string; phone?: string | null; email?: string | null
  employmentType: string; status: string; baseSalary: number; salaryType: string
  hourlyRate?: number | null; overtimeRate: number; doubleShiftRate: number
  hireDate: string; notes?: string | null; _count?: { salaryRecords: number }
}

interface SalaryRecord {
  id: string; staffId: string; month: number; year: number
  baseSalary: number; regularHours: number; overtimeHours: number
  overtimeMultiplier: number; doubleShiftCount: number; doubleShiftBonus: number
  bonuses: number; deductions: number; netPay: number
  status: string; paidDate?: string | null; notes?: string | null
  staff?: { name: string; role: string; employmentType: string; salaryType: string }
}

interface FinanceSummary {
  revenue: number; totalExpenses: number; netIncome: number; outstanding: number
  byCategory: Array<{ category: string; total: number }>
}

// ─── Shared field classes ─────────────────────────────────────────────────────
const INPUT  = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none'
const SELECT = INPUT

// ─── ExpenseFormModal ─────────────────────────────────────────────────────────
function ExpenseFormModal({ expense, onClose, onSaved }: {
  expense?: Expense | null; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    date:          expense ? new Date(expense.date).toISOString().slice(0, 10) : today,
    category:      expense?.category      ?? 'medical_supplies',
    description:   expense?.description   ?? '',
    amount:        expense?.amount?.toString() ?? '',
    vendor:        expense?.vendor         ?? '',
    paymentMethod: expense?.paymentMethod  ?? 'cash',
    recurrence:    expense?.recurrence     ?? 'one_time',
    notes:         expense?.notes          ?? '',
  })
  const up = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    if (!f.description.trim() || !f.amount) return showToast('error', 'Description and amount are required')
    const amount = parseFloat(f.amount)
    if (isNaN(amount) || amount <= 0) return showToast('error', 'Amount must be a positive number')
    setSaving(true)
    try {
      const payload = {
        date: new Date(f.date).toISOString(), category: f.category,
        description: f.description.trim(), amount,
        vendor: f.vendor.trim() || null, paymentMethod: f.paymentMethod,
        recurrence: f.recurrence, notes: f.notes.trim() || null
      }
      if (expense) {
        await window.api.clinic.expenses.update(expense.id, payload)
        showToast('success', 'Expense updated')
      } else {
        await window.api.clinic.expenses.create(payload)
        showToast('success', 'Expense added')
      }
      onSaved()
    } catch { showToast('error', 'Failed to save expense') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{expense ? 'Edit Expense' : 'New Expense'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input type="date" value={f.date} onChange={e => up('date', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <select value={f.category} onChange={e => up('category', e.target.value)} className={SELECT}>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description *</label>
            <input type="text" value={f.description} onChange={e => up('description', e.target.value)} placeholder="e.g. Monthly rent payment" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount *</label>
              <input type="number" min="0" step="0.01" value={f.amount} onChange={e => up('amount', e.target.value)} placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Method</label>
              <select value={f.paymentMethod} onChange={e => up('paymentMethod', e.target.value)} className={SELECT}>
                {['cash','card','transfer','cheque'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Vendor / Supplier</label>
              <input type="text" value={f.vendor} onChange={e => up('vendor', e.target.value)} placeholder="Optional" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Recurrence</label>
              <select value={f.recurrence} onChange={e => up('recurrence', e.target.value)} className={SELECT}>
                <option value="one_time">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <textarea value={f.notes} onChange={e => up('notes', e.target.value)} rows={2} placeholder="Optional…" className={INPUT + ' resize-none'} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {expense ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── StaffFormModal ───────────────────────────────────────────────────────────
function StaffFormModal({ staff, onClose, onSaved }: {
  staff?: Staff | null; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    name:           staff?.name           ?? '',
    role:           staff?.role           ?? 'nurse',
    phone:          staff?.phone          ?? '',
    email:          staff?.email          ?? '',
    employmentType: staff?.employmentType ?? 'full_time',
    status:         staff?.status         ?? 'active',
    baseSalary:     staff?.baseSalary?.toString()   ?? '0',
    salaryType:     staff?.salaryType     ?? 'monthly',
    hourlyRate:     staff?.hourlyRate?.toString()    ?? '',
    overtimeRate:   staff?.overtimeRate?.toString()  ?? '1.5',
    doubleShiftRate:staff?.doubleShiftRate?.toString()   ?? '0',
    hireDate:       staff ? new Date(staff.hireDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    notes:          staff?.notes          ?? '',
  })
  const up = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))
  const isPartTime = f.employmentType === 'part_time'

  async function save() {
    if (!f.name.trim()) return showToast('error', 'Name is required')
    setSaving(true)
    try {
      const payload = {
        name: f.name.trim(), role: f.role,
        phone: f.phone.trim() || null, email: f.email.trim() || null,
        employmentType: f.employmentType, status: f.status,
        baseSalary: parseFloat(f.baseSalary) || 0, salaryType: f.salaryType,
        hourlyRate: f.hourlyRate ? parseFloat(f.hourlyRate) : null,
        overtimeRate: parseFloat(f.overtimeRate) || 1.5,
        doubleShiftRate: parseFloat(f.doubleShiftRate) || 0,
        hireDate: new Date(f.hireDate).toISOString(),
        notes: f.notes.trim() || null,
      }
      if (staff) {
        await window.api.clinic.staff.update(staff.id, payload)
        showToast('success', 'Staff member updated')
      } else {
        await window.api.clinic.staff.create(payload)
        showToast('success', 'Staff member added')
      }
      onSaved()
    } catch { showToast('error', 'Failed to save staff member') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{staff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
              <input type="text" value={f.name} onChange={e => up('name', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
              <select value={f.role} onChange={e => up('role', e.target.value)} className={SELECT}>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Employment Type</label>
              <select value={f.employmentType} onChange={e => up('employmentType', e.target.value)} className={SELECT}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={f.status} onChange={e => up('status', e.target.value)} className={SELECT}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {f.employmentType === 'contract' ? 'Contract Amount' : 'Base Salary (monthly)'}
              </label>
              <input type="number" min="0" step="0.01" value={f.baseSalary} onChange={e => up('baseSalary', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Salary Type</label>
              <select value={f.salaryType} onChange={e => up('salaryType', e.target.value)} className={SELECT}>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          {(isPartTime || f.salaryType === 'hourly') && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hourly Rate</label>
              <input type="number" min="0" step="0.01" value={f.hourlyRate} onChange={e => up('hourlyRate', e.target.value)} placeholder="Rate per hour" className={INPUT} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Overtime Multiplier</label>
              <input type="number" min="1" step="0.1" value={f.overtimeRate} onChange={e => up('overtimeRate', e.target.value)} className={INPUT} />
              <p className="text-[10px] text-slate-400 mt-0.5">1.5 = time and a half</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Double Shift Bonus</label>
              <input type="number" min="0" step="0.01" value={f.doubleShiftRate} onChange={e => up('doubleShiftRate', e.target.value)} placeholder="Extra per double shift" className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
              <input type="text" value={f.phone} onChange={e => up('phone', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input type="email" value={f.email} onChange={e => up('email', e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hire Date</label>
              <input type="date" value={f.hireDate} onChange={e => up('hireDate', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
              <input type="text" value={f.notes} onChange={e => up('notes', e.target.value)} className={INPUT} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {staff ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SalaryModal ──────────────────────────────────────────────────────────────
function SalaryModal({ allStaff, record, onClose, onSaved }: {
  allStaff: Staff[]; record?: SalaryRecord | null; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const now = new Date()

  const [f, setF] = useState({
    staffId:            record?.staffId ?? (allStaff[0]?.id ?? ''),
    month:              (record?.month  ?? (now.getMonth() + 1)).toString(),
    year:               (record?.year   ?? now.getFullYear()).toString(),
    baseSalary:         record?.baseSalary?.toString()         ?? '',
    regularHours:       record?.regularHours?.toString()       ?? '0',
    overtimeHours:      record?.overtimeHours?.toString()      ?? '0',
    overtimeMultiplier: record?.overtimeMultiplier?.toString() ?? '1.5',
    doubleShiftCount:   record?.doubleShiftCount?.toString()   ?? '0',
    doubleShiftBonus:   record?.doubleShiftBonus?.toString()   ?? '0',
    bonuses:            record?.bonuses?.toString()            ?? '0',
    deductions:         record?.deductions?.toString()         ?? '0',
    notes:              record?.notes ?? '',
  })
  const up = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  function pickStaff(staffId: string) {
    const s = allStaff.find(x => x.id === staffId)
    if (s) {
      setF(p => ({
        ...p, staffId,
        baseSalary:         s.baseSalary.toString(),
        overtimeMultiplier: s.overtimeRate.toString(),
        doubleShiftBonus:   s.doubleShiftRate.toString(),
      }))
    } else {
      setF(p => ({ ...p, staffId }))
    }
  }

  // Seed base salary from the selected staff on first open (new record only)
  useEffect(() => { if (!record && f.staffId) pickStaff(f.staffId) }, [])

  const selectedStaff = allStaff.find(s => s.id === f.staffId)
  const isPartTime    = selectedStaff?.employmentType === 'part_time'
  const isHourly      = selectedStaff?.salaryType === 'hourly'

  // Live net-pay computation — reflects on every keystroke
  const baseSalary   = parseFloat(f.baseSalary)         || 0
  const regularHours = parseFloat(f.regularHours)       || 0
  const overtimeHrs  = parseFloat(f.overtimeHours)      || 0
  const otMult       = parseFloat(f.overtimeMultiplier) || 1.5
  const dsCount      = parseInt(f.doubleShiftCount)     || 0
  const dsBonus      = parseFloat(f.doubleShiftBonus)   || 0
  const bonuses      = parseFloat(f.bonuses)            || 0
  const deductions   = parseFloat(f.deductions)         || 0

  let netPay: number
  if (isPartTime || isHourly) {
    const hourly     = selectedStaff?.hourlyRate ?? baseSalary
    const regularPay = regularHours * hourly
    const otPay      = overtimeHrs  * hourly * otMult
    const dsPay      = dsCount      * dsBonus
    netPay = regularPay + otPay + dsPay + bonuses - deductions
  } else {
    // Full-time / contract: base + overtime extras
    const dailyRate = baseSalary / 26  // 26 working days in a month
    const hourlyEq  = dailyRate  / 8
    const otPay     = overtimeHrs * hourlyEq * otMult
    const dsPay     = dsCount     * dsBonus
    netPay = baseSalary + otPay + dsPay + bonuses - deductions
  }

  async function save() {
    if (!f.staffId) return showToast('error', 'Please select a staff member')
    setSaving(true)
    try {
      await window.api.clinic.staff.salary.upsert({
        staffId: f.staffId,
        month: parseInt(f.month), year: parseInt(f.year),
        baseSalary, regularHours, overtimeHours: overtimeHrs,
        overtimeMultiplier: otMult, doubleShiftCount: dsCount, doubleShiftBonus: dsBonus,
        bonuses, deductions, netPay,
        notes: f.notes.trim() || null,
      })
      showToast('success', record ? 'Salary record updated' : 'Salary record created')
      onSaved()
    } catch { showToast('error', 'Failed to save salary record') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{record ? 'Edit Salary Record' : 'Generate Salary Record'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Staff */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Staff Member *</label>
            <select value={f.staffId} onChange={e => pickStaff(e.target.value)} disabled={!!record} className={SELECT + (record ? ' opacity-60' : '')}>
              {allStaff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.role} ({s.employmentType.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
              <select value={f.month} onChange={e => up('month', e.target.value)} disabled={!!record} className={SELECT + (record ? ' opacity-60' : '')}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
              <input type="number" value={f.year} onChange={e => up('year', e.target.value)} disabled={!!record} className={INPUT + (record ? ' opacity-60' : '')} />
            </div>
          </div>
          {/* Base salary */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {(isPartTime || isHourly) ? 'Hourly Rate' : 'Base Salary'}
            </label>
            <input type="number" min="0" step="0.01" value={f.baseSalary} onChange={e => up('baseSalary', e.target.value)} className={INPUT} />
          </div>
          {/* Regular hours (part-time only) */}
          {(isPartTime || isHourly) && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Regular Hours Worked</label>
              <input type="number" min="0" step="0.5" value={f.regularHours} onChange={e => up('regularHours', e.target.value)} className={INPUT} />
            </div>
          )}
          {/* Overtime */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Overtime Hours</label>
              <input type="number" min="0" step="0.5" value={f.overtimeHours} onChange={e => up('overtimeHours', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Overtime ×</label>
              <input type="number" min="1" step="0.1" value={f.overtimeMultiplier} onChange={e => up('overtimeMultiplier', e.target.value)} className={INPUT} />
            </div>
          </div>
          {/* Double shifts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Double Shifts</label>
              <input type="number" min="0" step="1" value={f.doubleShiftCount} onChange={e => up('doubleShiftCount', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bonus per Double Shift</label>
              <input type="number" min="0" step="0.01" value={f.doubleShiftBonus} onChange={e => up('doubleShiftBonus', e.target.value)} className={INPUT} />
            </div>
          </div>
          {/* Bonus / deductions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bonuses</label>
              <input type="number" min="0" step="0.01" value={f.bonuses} onChange={e => up('bonuses', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Deductions</label>
              <input type="number" min="0" step="0.01" value={f.deductions} onChange={e => up('deductions', e.target.value)} className={INPUT} />
            </div>
          </div>
          {/* Net pay preview */}
          <div className={`rounded-xl px-4 py-3 border ${netPay >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Pay</span>
              <span className={`text-xl font-bold tabular-nums ${netPay >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {netPay.toFixed(2)}
              </span>
            </div>
            {(overtimeHrs > 0 || dsCount > 0) && (
              <p className="text-[11px] text-slate-400 mt-1">
                {isPartTime || isHourly
                  ? `${regularHours}h × rate`
                  : `Base ${baseSalary.toFixed(0)}`}
                {overtimeHrs > 0 && ` + ${overtimeHrs}h OT ×${otMult}`}
                {dsCount     > 0 && ` + ${dsCount} double shifts`}
                {bonuses     > 0 && ` + ${bonuses} bonus`}
                {deductions  > 0 && ` − ${deductions} deduct`}
              </p>
            )}
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <input type="text" value={f.notes} onChange={e => up('notes', e.target.value)} className={INPUT} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {record ? 'Update Record' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main FinanceTab ──────────────────────────────────────────────────────────
export default function FinanceTab() {
  const { showToast } = useToast()
  const [section,    setSection]    = useState<Section>('expenses')
  const [period,     setPeriod]     = useState<Period>('month')
  const [catFilter,  setCatFilter]  = useState('all')

  const [expenses,        setExpenses]        = useState<Expense[]>([])
  const [summary,         setSummary]         = useState<FinanceSummary | null>(null)
  const [loadingExp,      setLoadingExp]      = useState(true)
  const [editExpense,     setEditExpense]     = useState<Expense | null | undefined>(undefined)

  const [staff,           setStaff]           = useState<Staff[]>([])
  const [loadingStaff,    setLoadingStaff]    = useState(true)
  const [editStaff,       setEditStaff]       = useState<Staff | null | undefined>(undefined)

  const [salaryRecords,   setSalaryRecords]   = useState<SalaryRecord[]>([])
  const [loadingSalary,   setLoadingSalary]   = useState(false)
  const [editSalary,      setEditSalary]      = useState<SalaryRecord | null | undefined>(undefined)
  const [salaryYear,      setSalaryYear]      = useState(new Date().getFullYear())

  // ── loaders ───────────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setLoadingExp(true)
    try {
      const [exps, sum] = await Promise.all([
        window.api.clinic.expenses.getAll({ period, category: catFilter }),
        window.api.clinic.expenses.summary(period),
      ])
      setExpenses(exps)
      setSummary(sum)
    } catch { showToast('error', 'Failed to load expenses') }
    finally   { setLoadingExp(false) }
  }, [period, catFilter, showToast])

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true)
    try   { setStaff(await window.api.clinic.staff.getAll()) }
    catch { showToast('error', 'Failed to load staff') }
    finally { setLoadingStaff(false) }
  }, [showToast])

  const loadSalary = useCallback(async () => {
    setLoadingSalary(true)
    try   { setSalaryRecords(await window.api.clinic.staff.salary.getAll({ year: salaryYear })) }
    catch { showToast('error', 'Failed to load salary records') }
    finally { setLoadingSalary(false) }
  }, [salaryYear, showToast])

  useEffect(() => { loadExpenses() }, [loadExpenses])
  useEffect(() => { loadStaff()   }, [loadStaff])
  useEffect(() => { if (section === 'staff') loadSalary() }, [section, loadSalary])

  // ── delete helpers ────────────────────────────────────────────────────────
  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    try   { await window.api.clinic.expenses.delete(id); showToast('success', 'Deleted'); loadExpenses() }
    catch { showToast('error', 'Failed to delete expense') }
  }

  async function deleteStaff(id: string) {
    if (!confirm('Remove this staff member? Their salary records will also be deleted.')) return
    try   { await window.api.clinic.staff.delete(id); showToast('success', 'Removed'); loadStaff() }
    catch { showToast('error', 'Failed to remove staff member') }
  }

  async function deleteSalary(id: string) {
    if (!confirm('Delete this salary record?')) return
    try   { await window.api.clinic.staff.salary.delete(id); showToast('success', 'Deleted'); loadSalary() }
    catch { showToast('error', 'Failed to delete salary record') }
  }

  async function markPaid(id: string) {
    try   { await window.api.clinic.staff.salary.markPaid(id); showToast('success', 'Marked as paid'); loadSalary() }
    catch { showToast('error', 'Failed to update salary') }
  }

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year',  label: 'This Year' },
  ]

  const visibleExpenses = catFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category === catFilter)

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Section switcher */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-fit">
        {([
          ['expenses', Receipt, 'Expenses'],
          ['staff',    Users,   'Staff & Salaries'],
        ] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              section === key
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════ EXPENSES ════════════════════════*/}
      {section === 'expenses' && (
        <>
          {/* toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
              {periods.map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    period === key
                      ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>{label}</button>
              ))}
            </div>
            <button onClick={() => setEditExpense(null)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-teal-500/20">
              <Plus className="h-4 w-4" />Add Expense
            </button>
          </div>

          {/* KPI cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { label: 'Revenue',     value: summary.revenue,       pos: true,                   Icon: TrendingUp   },
                { label: 'Expenses',    value: summary.totalExpenses,  pos: false,                  Icon: TrendingDown },
                { label: 'Net Income',  value: summary.netIncome,      pos: summary.netIncome >= 0, Icon: Wallet       },
                { label: 'Outstanding', value: summary.outstanding,    pos: false,                  Icon: AlertCircle  },
              ] as const).map(({ label, value, pos, Icon }) => {
                const col  = pos ? 'text-emerald-600 dark:text-emerald-400' : label === 'Outstanding' ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'
                const bg   = pos ? 'bg-emerald-50 dark:bg-emerald-900/20' : label === 'Outstanding' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20'
                return (
                  <div key={label} className={`rounded-xl ${bg} border border-slate-200/70 dark:border-slate-700/60 px-4 py-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${col}`} />
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
                    </div>
                    <div className={`text-xl font-bold tabular-nums ${col}`}>{(value as number).toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Category breakdown bar chart */}
          {summary && summary.byCategory.length > 0 && summary.totalExpenses > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Breakdown by Category</p>
              <div className="space-y-2.5">
                {summary.byCategory.slice(0, 7).map(({ category, total }) => {
                  const cfg = getCatCfg(category)
                  const pct = Math.max(2, (total / summary.totalExpenses) * 100)
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className="w-32 flex-shrink-0 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-teal-500 dark:bg-teal-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-16 text-right tabular-nums">{total.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Category filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCatFilter('all')}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all border ${
                catFilter === 'all'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300'
              }`}>All
            </button>
            {EXPENSE_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCatFilter(c.value)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all border ${
                  catFilter === c.value
                    ? `${c.color} border-current`
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                }`}>{c.label}
              </button>
            ))}
          </div>

          {/* Expense list */}
          {loadingExp ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>
          ) : visibleExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
              <Receipt className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No expenses recorded</p>
              <button onClick={() => setEditExpense(null)} className="mt-3 text-xs text-teal-600 dark:text-teal-400 hover:underline">Add the first one</button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleExpenses.map(exp => {
                const cfg = getCatCfg(exp.category)
                return (
                  <div key={exp.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700 transition-colors shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{exp.description}</span>
                        {exp.vendor && <span className="text-xs text-slate-400">{exp.vendor}</span>}
                        {exp.recurrence !== 'one_time' && (
                          <span className="text-xs text-violet-500 dark:text-violet-400 capitalize">{exp.recurrence}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        <span>{new Date(exp.date).toLocaleDateString()}</span>
                        <span className="capitalize">{exp.paymentMethod}</span>
                        {exp.notes && <span className="truncate max-w-[200px]">{exp.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-base font-bold text-red-500 dark:text-red-400 tabular-nums">{exp.amount.toFixed(2)}</span>
                      <button onClick={() => setEditExpense(exp)} className="text-xs text-blue-500 hover:underline">Edit</button>
                      <button onClick={() => deleteExpense(exp.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════ STAFF ═══════════════════════════*/}
      {section === 'staff' && (
        <>
          {/* Staff header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clinic Staff</h3>
            <button onClick={() => setEditStaff(null)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-teal-500/20">
              <Plus className="h-4 w-4" />Add Staff
            </button>
          </div>

          {loadingStaff ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500">
              <Users className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No staff members yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {staff.map(s => {
                const empColors: Record<string, string> = {
                  full_time: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  part_time: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  contract:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
                }
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-teal-200 dark:hover:border-teal-700 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-xs font-bold text-white">
                        {s.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${empColors[s.employmentType] ?? 'bg-slate-100 text-slate-600'}`}>
                          {s.employmentType.replace('_', ' ')}
                        </span>
                        {s.status === 'inactive' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700">inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="capitalize">{s.role}</span>
                        <span>·</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums">{s.baseSalary.toFixed(0)} / {s.salaryType}</span>
                        {s.overtimeRate !== 1.5 && <span>· OT ×{s.overtimeRate}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditStaff(s)} className="text-xs text-blue-500 hover:underline px-1">Edit</button>
                      <button onClick={() => deleteStaff(s.id)} className="text-xs text-red-400 hover:underline px-1">Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Salary records header */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Salary Records</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setSalaryYear(y => y - 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                </button>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-12 text-center">{salaryYear}</span>
                <button onClick={() => setSalaryYear(y => y + 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            </div>
            {staff.length > 0 && (
              <button onClick={() => setEditSalary(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-medium transition-colors">
                <Plus className="h-3.5 w-3.5" />Generate Salary
              </button>
            )}
          </div>

          {loadingSalary ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-7 w-7 animate-spin text-teal-500" /></div>
          ) : salaryRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500">
              <DollarSign className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No salary records for {salaryYear}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {salaryRecords.map(rec => (
                <div key={rec.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{rec.staff?.name}</span>
                      <span className="text-xs text-slate-400">{MONTHS[(rec.month ?? 1) - 1]} {rec.year}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rec.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {rec.status === 'paid' ? '✓ Paid' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span>Base: {rec.baseSalary.toFixed(0)}</span>
                      {rec.overtimeHours > 0   && <span>OT: {rec.overtimeHours}h ×{rec.overtimeMultiplier}</span>}
                      {rec.doubleShiftCount > 0 && <span>Double: ×{rec.doubleShiftCount}</span>}
                      {rec.bonuses    > 0 && <span className="text-emerald-500">+{rec.bonuses.toFixed(0)} bonus</span>}
                      {rec.deductions > 0 && <span className="text-red-400">−{rec.deductions.toFixed(0)} deduct</span>}
                      {rec.paidDate && <span className="text-slate-300">Paid {new Date(rec.paidDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-base font-bold text-violet-600 dark:text-violet-400 tabular-nums">{rec.netPay.toFixed(2)}</span>
                    {rec.status !== 'paid' && (
                      <button onClick={() => markPaid(rec.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg hover:opacity-80 transition-opacity">
                        <CheckCircle2 className="h-3 w-3" />Pay
                      </button>
                    )}
                    <button onClick={() => setEditSalary(rec)} className="text-xs text-blue-500 hover:underline">Edit</button>
                    <button onClick={() => deleteSalary(rec.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {editExpense !== undefined && (
        <ExpenseFormModal
          expense={editExpense}
          onClose={() => setEditExpense(undefined)}
          onSaved={() => { setEditExpense(undefined); loadExpenses() }}
        />
      )}
      {editStaff !== undefined && (
        <StaffFormModal
          staff={editStaff}
          onClose={() => setEditStaff(undefined)}
          onSaved={() => { setEditStaff(undefined); loadStaff() }}
        />
      )}
      {editSalary !== undefined && (
        <SalaryModal
          allStaff={staff}
          record={editSalary}
          onClose={() => setEditSalary(undefined)}
          onSaved={() => { setEditSalary(undefined); loadSalary() }}
        />
      )}
    </div>
  )
}
