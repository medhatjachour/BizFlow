/**
 * ClinicFinanceSection
 *
 * Full clinic financial management shown at /finance → Clinic.
 * Tabs: Overview · Expenses · Payroll · Analytics
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, Receipt, Users,
  Plus, Loader2, X, ChevronLeft, ChevronRight, RefreshCcw,
  Stethoscope, Activity, BarChart3, ClipboardList, DollarSign,
  CheckCircle2, Pencil, Trash2, Heart, Calendar,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, Cell,
} from 'recharts'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'

// ─── Constants ────────────────────────────────────────────────────────────────

type Period  = 'today' | 'week' | 'month' | 'year'
type MainTab = 'overview' | 'expenses' | 'payroll' | 'analytics'

const EXPENSE_CATEGORIES = [
  { value: 'rent',             label: 'Rent / Lease',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'utilities',        label: 'Utilities',        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'medical_supplies', label: 'Medical Supplies', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'medications',      label: 'Medications',      badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  { value: 'equipment',        label: 'Equipment',        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { value: 'maintenance',      label: 'Maintenance',      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'lab_fees',         label: 'Lab Fees',         badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  { value: 'insurance',        label: 'Insurance',        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'marketing',        label: 'Marketing',        badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  { value: 'cleaning',         label: 'Cleaning',         badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'salaries',         label: 'Salaries',         badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'other',            label: 'Other',            badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
]

const STAFF_ROLES = ['doctor', 'nurse', 'receptionist', 'technician', 'pharmacist', 'other']
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CHART_COLORS = ['#14b8a6','#0ea5e9','#8b5cf6','#10b981','#f59e0b','#f43f5e','#06b6d4','#84cc16']

const EMP_BADGE: Record<string, string> = {
  full_time: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  part_time: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  contract:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function getCat(val: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === val) ?? { label: val, badge: 'bg-slate-100 text-slate-600' }
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
  revenue: number; totalExpenses: number; totalSalaries: number
  netIncome: number; outstanding: number
  byCategory: Array<{ category: string; total: number }>
}

// ─── Shared input classes ─────────────────────────────────────────────────────
const INP = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none'

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
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {expense ? 'Edit Expense' : 'New Expense'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Clinic operating cost</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
              <input type="date" value={f.date} onChange={e => up('date', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select value={f.category} onChange={e => up('category', e.target.value)} className={INP}>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description *</label>
            <input type="text" value={f.description} onChange={e => up('description', e.target.value)} placeholder="e.g. Monthly rent payment" className={INP} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount *</label>
              <input type="number" min="0" step="0.01" value={f.amount} onChange={e => up('amount', e.target.value)} placeholder="0.00" className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment</label>
              <select value={f.paymentMethod} onChange={e => up('paymentMethod', e.target.value)} className={INP}>
                {['cash','card','transfer','cheque'].map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Vendor / Supplier</label>
              <input type="text" value={f.vendor} onChange={e => up('vendor', e.target.value)} placeholder="Optional" className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Recurrence</label>
              <select value={f.recurrence} onChange={e => up('recurrence', e.target.value)} className={INP}>
                <option value="one_time">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={f.notes} onChange={e => up('notes', e.target.value)} rows={2} placeholder="Optional…" className={INP + ' resize-none'} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-teal-500/20">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
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
    name:            staff?.name           ?? '',
    role:            staff?.role           ?? 'nurse',
    phone:           staff?.phone          ?? '',
    email:           staff?.email          ?? '',
    employmentType:  staff?.employmentType ?? 'full_time',
    status:          staff?.status         ?? 'active',
    baseSalary:      staff?.baseSalary?.toString()       ?? '0',
    salaryType:      staff?.salaryType     ?? 'monthly',
    hourlyRate:      staff?.hourlyRate?.toString()        ?? '',
    overtimeRate:    staff?.overtimeRate?.toString()      ?? '1.5',
    doubleShiftRate: staff?.doubleShiftRate?.toString()   ?? '0',
    hireDate:        staff ? new Date(staff.hireDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    notes:           staff?.notes ?? '',
  })
  const up = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

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

  const showHourly = f.employmentType === 'part_time' || f.salaryType === 'hourly'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {staff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Clinic employee profile</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name *</label>
              <input type="text" value={f.name} onChange={e => up('name', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
              <select value={f.role} onChange={e => up('role', e.target.value)} className={INP}>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Employment</label>
              <select value={f.employmentType} onChange={e => up('employmentType', e.target.value)} className={INP}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
              <select value={f.status} onChange={e => up('status', e.target.value)} className={INP}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {f.employmentType === 'contract' ? 'Contract Amount' : 'Base Salary (monthly)'}
              </label>
              <input type="number" min="0" step="0.01" value={f.baseSalary} onChange={e => up('baseSalary', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Salary Type</label>
              <select value={f.salaryType} onChange={e => up('salaryType', e.target.value)} className={INP}>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
          {showHourly && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hourly Rate</label>
              <input type="number" min="0" step="0.01" value={f.hourlyRate} onChange={e => up('hourlyRate', e.target.value)} placeholder="Rate per hour" className={INP} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Overtime ×</label>
              <input type="number" min="1" step="0.1" value={f.overtimeRate} onChange={e => up('overtimeRate', e.target.value)} className={INP} />
              <p className="text-[10px] text-slate-400 mt-0.5">1.5 = time-and-a-half</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Double-Shift Bonus</label>
              <input type="number" min="0" step="0.01" value={f.doubleShiftRate} onChange={e => up('doubleShiftRate', e.target.value)} placeholder="Flat bonus / shift" className={INP} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
              <input type="text" value={f.phone} onChange={e => up('phone', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={f.email} onChange={e => up('email', e.target.value)} className={INP} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hire Date</label>
            <input type="date" value={f.hireDate} onChange={e => up('hireDate', e.target.value)} className={INP} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-teal-500/20">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
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
  const [computing, setComputing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  interface Breakdown { basePay: number; overtimePay: number; doubleShiftPay: number; bonuses: number; deductions: number; grossPay: number; netPay: number }
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null)

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

  useEffect(() => { if (!record && f.staffId) pickStaff(f.staffId) }, [])

  // Debounced server-side compute for accurate live preview
  useEffect(() => {
    if (!f.staffId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setComputing(true)
      try {
        const result = await window.api.clinic.staff.salary.compute(f.staffId, {
          regularHours:      parseFloat(f.regularHours) || 0,
          overtimeHours:     parseFloat(f.overtimeHours) || 0,
          overtimeMultiplier:parseFloat(f.overtimeMultiplier) || 1.5,
          doubleShiftCount:  parseInt(f.doubleShiftCount) || 0,
          doubleShiftBonus:  parseFloat(f.doubleShiftBonus) || 0,
          bonuses:           parseFloat(f.bonuses) || 0,
          deductions:        parseFloat(f.deductions) || 0,
        })
        setBreakdown(result)
      } catch { /* ignore preview errors */ }
      finally { setComputing(false) }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [f.staffId, f.regularHours, f.overtimeHours, f.overtimeMultiplier, f.doubleShiftCount, f.doubleShiftBonus, f.bonuses, f.deductions])

  const selectedStaff = allStaff.find(s => s.id === f.staffId)
  const isHourly = selectedStaff?.salaryType === 'hourly' || selectedStaff?.employmentType === 'part_time'

  async function save() {
    if (!f.staffId) return showToast('error', 'Please select a staff member')
    setSaving(true)
    try {
      await window.api.clinic.staff.salary.upsert({
        staffId: f.staffId,
        month: parseInt(f.month), year: parseInt(f.year),
        baseSalary:         parseFloat(f.baseSalary)         || 0,
        regularHours:       parseFloat(f.regularHours)       || 0,
        overtimeHours:      parseFloat(f.overtimeHours)      || 0,
        overtimeMultiplier: parseFloat(f.overtimeMultiplier) || 1.5,
        doubleShiftCount:   parseInt(f.doubleShiftCount)     || 0,
        doubleShiftBonus:   parseFloat(f.doubleShiftBonus)   || 0,
        bonuses:            parseFloat(f.bonuses)            || 0,
        deductions:         parseFloat(f.deductions)         || 0,
        netPay:             breakdown?.netPay ?? null,
        notes: f.notes.trim() || null,
      })
      showToast('success', record ? 'Salary record updated' : 'Salary record created')
      onSaved()
    } catch { showToast('error', 'Failed to save salary record') }
    finally { setSaving(false) }
  }

  const bd = breakdown
  const netPositive = (bd?.netPay ?? 0) >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {record ? 'Edit Salary Record' : 'Generate Salary Record'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Monthly payroll calculation</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[62vh] overflow-y-auto">
          {/* Staff + Period */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Staff Member *</label>
            <select value={f.staffId} onChange={e => pickStaff(e.target.value)} disabled={!!record} className={INP + (record ? ' opacity-60' : '')}>
              {allStaff.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.role} ({s.employmentType.replace('_', ' ')})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Month</label>
              <select value={f.month} onChange={e => up('month', e.target.value)} disabled={!!record} className={INP + (record ? ' opacity-60' : '')}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Year</label>
              <input type="number" value={f.year} onChange={e => up('year', e.target.value)} disabled={!!record} className={INP + (record ? ' opacity-60' : '')} />
            </div>
          </div>

          {/* Base / hourly */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {isHourly ? 'Hourly Rate' : 'Base Salary'}
              </label>
              <input type="number" min="0" step="0.01" value={f.baseSalary} onChange={e => up('baseSalary', e.target.value)} className={INP} />
            </div>
            {isHourly && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Regular Hours</label>
                <input type="number" min="0" step="0.5" value={f.regularHours} onChange={e => up('regularHours', e.target.value)} className={INP} />
              </div>
            )}
          </div>

          {/* Overtime */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Overtime Hours</label>
              <input type="number" min="0" step="0.5" value={f.overtimeHours} onChange={e => up('overtimeHours', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Overtime ×</label>
              <input type="number" min="1" step="0.1" value={f.overtimeMultiplier} onChange={e => up('overtimeMultiplier', e.target.value)} className={INP} />
            </div>
          </div>

          {/* Double shifts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Double Shifts</label>
              <input type="number" min="0" step="1" value={f.doubleShiftCount} onChange={e => up('doubleShiftCount', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bonus / Shift</label>
              <input type="number" min="0" step="0.01" value={f.doubleShiftBonus} onChange={e => up('doubleShiftBonus', e.target.value)} className={INP} />
            </div>
          </div>

          {/* Bonuses / deductions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bonuses</label>
              <input type="number" min="0" step="0.01" value={f.bonuses} onChange={e => up('bonuses', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Deductions</label>
              <input type="number" min="0" step="0.01" value={f.deductions} onChange={e => up('deductions', e.target.value)} className={INP} />
            </div>
          </div>

          {/* Live pay breakdown */}
          <div className={`rounded-xl border p-4 ${netPositive ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pay Breakdown</span>
              {computing && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
            </div>
            {bd ? (
              <div className="space-y-1.5">
                {[
                  { label: 'Base Pay',       val: bd.basePay,        show: true,                color: 'text-slate-700 dark:text-slate-300' },
                  { label: 'Overtime Pay',   val: bd.overtimePay,    show: bd.overtimePay > 0,  color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Double Shifts',  val: bd.doubleShiftPay, show: bd.doubleShiftPay > 0, color: 'text-violet-600 dark:text-violet-400' },
                  { label: 'Bonuses',        val: bd.bonuses,        show: bd.bonuses > 0,      color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Deductions',     val: -bd.deductions,    show: bd.deductions > 0,   color: 'text-red-500 dark:text-red-400' },
                ].filter(r => r.show).map(row => (
                  <div key={row.label} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{row.label}</span>
                    <span className={`font-semibold tabular-nums ${row.color}`}>
                      {row.val < 0 ? '−' : '+'}{fmt(Math.abs(row.val))}
                    </span>
                  </div>
                ))}
                <div className="border-t border-current/20 pt-2 mt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Net Pay</span>
                  <span className={`text-xl font-black tabular-nums ${netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {fmt(bd.netPay)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-2">Calculating…</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <input type="text" value={f.notes} onChange={e => up('notes', e.target.value)} className={INP} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-violet-500/20">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {record ? 'Update Record' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, colorClass, bgClass, sub }: {
  label: string; value: string; icon: any; colorClass: string; bgClass: string; sub?: string
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 ${colorClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={`text-2xl font-black tabular-nums ${colorClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
const ClinicFinanceSection: React.FC = () => {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<MainTab>('overview')
  const [period, setPeriod]       = useState<Period>('month')
  const [catFilter, setCatFilter] = useState('all')
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear())

  // ── expenses state ────────────────────────────────────────────────────────
  const [expenses,    setExpenses]    = useState<Expense[]>([])
  const [summary,     setSummary]     = useState<FinanceSummary | null>(null)
  const [breakdown,   setBreakdown]   = useState<Array<{ label: string; total: number }>>([])
  const [loadingExp,  setLoadingExp]  = useState(true)
  const [editExpense, setEditExpense] = useState<Expense | null | undefined>(undefined)

  // ── staff / salary state ──────────────────────────────────────────────────
  const [staff,         setStaff]         = useState<Staff[]>([])
  const [loadingStaff,  setLoadingStaff]  = useState(true)
  const [editStaff,     setEditStaff]     = useState<Staff | null | undefined>(undefined)
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [loadingSalary, setLoadingSalary] = useState(false)
  const [editSalary,    setEditSalary]    = useState<SalaryRecord | null | undefined>(undefined)

  // ── analytics state ───────────────────────────────────────────────────────
  const [overviewStats,  setOverviewStats]  = useState<any>(null)
  const [visitTrend,     setVisitTrend]     = useState<any[]>([])
  const [topDiagnoses,   setTopDiagnoses]   = useState<any[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // ── loaders ───────────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setLoadingExp(true)
    try {
      const api = window.api.clinic
      const [exps, sum, brk] = await Promise.all([
        api.expenses.getAll({ period, category: catFilter }),
        api.expenses.summary(period),
        api.expenses.breakdown({ period }),
      ])
      setExpenses(exps)
      setSummary(sum as FinanceSummary)
      setBreakdown(brk)
    } catch (e) {
      logger.error('ClinicFinance: loadExpenses failed', e)
      showToast('error', 'Failed to load financial data')
    } finally {
      setLoadingExp(false)
    }
  }, [period, catFilter, showToast])

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true)
    try { setStaff(await window.api.clinic.staff.getAll()) }
    catch { showToast('error', 'Failed to load staff') }
    finally { setLoadingStaff(false) }
  }, [showToast])

  const loadSalary = useCallback(async () => {
    setLoadingSalary(true)
    try { setSalaryRecords(await window.api.clinic.staff.salary.getAll({ year: salaryYear })) }
    catch { showToast('error', 'Failed to load salary records') }
    finally { setLoadingSalary(false) }
  }, [salaryYear, showToast])

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true)
    try {
      const api = (window as any).api.clinic
      const [r1, r2, r3] = await Promise.allSettled([
        api.stats?.overview?.(),
        api.stats?.visitTrend?.(30),
        api.stats?.topDiagnoses?.(10),
      ])
      if (r1.status === 'fulfilled') setOverviewStats(r1.value)
      if (r2.status === 'fulfilled') setVisitTrend(Array.isArray(r2.value) ? r2.value : [])
      if (r3.status === 'fulfilled') setTopDiagnoses(Array.isArray(r3.value) ? r3.value : [])
    } catch (e) { logger.error('ClinicFinance: loadAnalytics failed', e) }
    finally { setLoadingAnalytics(false) }
  }, [])

  useEffect(() => { loadExpenses() }, [loadExpenses])
  useEffect(() => { loadStaff() },   [loadStaff])
  useEffect(() => {
    if (activeTab === 'payroll') loadSalary()
  }, [activeTab, loadSalary])
  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, loadAnalytics])

  // ── delete helpers ────────────────────────────────────────────────────────
  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    try { await window.api.clinic.expenses.delete(id); showToast('success', 'Expense deleted'); loadExpenses() }
    catch { showToast('error', 'Failed to delete expense') }
  }
  async function deleteStaff(id: string) {
    if (!confirm('Remove staff member? Salary records will also be deleted.')) return
    try { await window.api.clinic.staff.delete(id); showToast('success', 'Staff removed'); loadStaff() }
    catch { showToast('error', 'Failed to remove staff member') }
  }
  async function deleteSalary(id: string) {
    if (!confirm('Delete this salary record?')) return
    try { await window.api.clinic.staff.salary.delete(id); showToast('success', 'Deleted'); loadSalary() }
    catch { showToast('error', 'Failed to delete salary record') }
  }
  async function markPaid(id: string) {
    try { await window.api.clinic.staff.salary.markPaid(id); showToast('success', 'Marked as paid'); loadSalary() }
    catch { showToast('error', 'Failed to update salary status') }
  }

  const TAB_DEFS: { key: MainTab; icon: any; label: string }[] = [
    { key: 'overview',  icon: BarChart3,     label: 'Overview'  },
    { key: 'expenses',  icon: Receipt,       label: 'Expenses'  },
    { key: 'payroll',   icon: Users,         label: 'Payroll'   },
    { key: 'analytics', icon: Activity,      label: 'Analytics' },
  ]

  const PERIOD_DEFS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'Week'  },
    { key: 'month', label: 'Month' },
    { key: 'year',  label: 'Year'  },
  ]

  const visibleExpenses = catFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category === catFilter)

  const trendData = visitTrend.map(v => ({
    date: typeof v.date === 'string' ? v.date.slice(5) : v.date,
    visits: Number(v.count || v.visits || 0),
  }))
  const diagData = topDiagnoses.map(d => ({
    name: (d.diagnosis || d.name || 'Unknown').slice(0, 20),
    count: Number(d.count || d.total || 0),
  }))

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <Stethoscope size={22} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clinic Finance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Expenses · Payroll · Analytics</p>
          </div>
        </div>
        <button
          onClick={() => { loadExpenses(); if (activeTab === 'payroll') loadSalary() }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <RefreshCcw size={14} className={loadingExp ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl w-fit">
        {TAB_DEFS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === key
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════ OVERVIEW ═══════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Period filter */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
              {PERIOD_DEFS.map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    period === key
                      ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>{label}
                </button>
              ))}
            </div>
          </div>

          {/* KPI grid */}
          {loadingExp ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <KpiCard label="Revenue"       value={fmt(summary.revenue)}       icon={TrendingUp}   colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-900/10"  sub="collected" />
              <KpiCard label="Total Expenses" value={fmt(summary.totalExpenses)} icon={TrendingDown} colorClass="text-red-500 dark:text-red-400"         bgClass="bg-red-50 dark:bg-red-900/10"          sub="incl. payroll" />
              <KpiCard label="Payroll Cost"   value={fmt(summary.totalSalaries ?? 0)} icon={Users}  colorClass="text-violet-600 dark:text-violet-400"   bgClass="bg-violet-50 dark:bg-violet-900/10"    sub="staff salaries" />
              <KpiCard label="Net Income"     value={fmt(summary.netIncome)}     icon={Wallet}       colorClass={summary.netIncome >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500 dark:text-red-400'} bgClass={summary.netIncome >= 0 ? 'bg-teal-50 dark:bg-teal-900/10' : 'bg-red-50 dark:bg-red-900/10'} />
              <KpiCard label="Outstanding"    value={fmt(summary.outstanding)}   icon={AlertCircle}  colorClass="text-amber-600 dark:text-amber-400"     bgClass="bg-amber-50 dark:bg-amber-900/10"      sub="unpaid invoices" />
            </div>
          ) : null}

          {/* Spend breakdown bar chart */}
          {breakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Spend Over Time — {PERIOD_DEFS.find(p => p.key === period)?.label}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={breakdown} margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barSize={period === 'today' ? 10 : period === 'year' ? 28 : 18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => [fmt(v), 'Expenses']} />
                  <Bar dataKey="total" radius={[5,5,0,0]} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown */}
          {summary && summary.byCategory.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Expenses by Category</p>
              <div className="space-y-3">
                {summary.byCategory.slice(0, 8).map(({ category, total }) => {
                  const cfg = category === 'salaries_payroll'
                    ? { label: 'Payroll', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' }
                    : getCat(category)
                  const pct = Math.max(4, (total / summary.totalExpenses) * 100)
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 w-28 text-center ${cfg.badge}`}>{cfg.label}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-teal-500 dark:bg-teal-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-20 text-right tabular-nums">{fmt(total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════ EXPENSES ═══════════════════════════ */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
              {PERIOD_DEFS.map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    period === key
                      ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}>{label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditExpense(null)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-teal-500/25"
            >
              <Plus className="h-4 w-4" />Add Expense
            </button>
          </div>

          {/* Category filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCatFilter('all')}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all border ${
                catFilter === 'all'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300'
              }`}>All
            </button>
            {EXPENSE_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCatFilter(c.value)}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-all border ${
                  catFilter === c.value
                    ? `${c.badge} border-current`
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                }`}>{c.label}
              </button>
            ))}
          </div>

          {/* Expense list */}
          {loadingExp ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
            </div>
          ) : visibleExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <Receipt className="h-10 w-10 mb-3 opacity-25" />
              <p className="text-sm font-medium">No expenses recorded</p>
              <button onClick={() => setEditExpense(null)} className="mt-3 text-xs text-teal-600 dark:text-teal-400 hover:underline">
                Add the first one
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleExpenses.map(exp => {
                const cfg = getCat(exp.category)
                return (
                  <div key={exp.id}
                    className="flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700 transition-all shadow-sm group"
                  >
                    {/* left accent */}
                    <div className="w-1 h-10 rounded-full bg-teal-400 dark:bg-teal-500 flex-shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>{cfg.label}</span>
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{exp.description}</span>
                        {exp.vendor && <span className="text-xs text-slate-400 dark:text-slate-500">· {exp.vendor}</span>}
                        {exp.recurrence !== 'one_time' && (
                          <span className="text-xs font-semibold text-violet-500 dark:text-violet-400 capitalize bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-md">
                            {exp.recurrence}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                        <span>{new Date(exp.date).toLocaleDateString()}</span>
                        <span className="capitalize">· {exp.paymentMethod}</span>
                        {exp.notes && <span className="truncate max-w-[220px]">· {exp.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-lg font-black text-red-500 dark:text-red-400 tabular-nums">{fmt(exp.amount)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditExpense(exp)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteExpense(exp.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════ PAYROLL ════════════════════════════ */}
      {activeTab === 'payroll' && (
        <div className="space-y-5">
          {/* Staff section */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Staff Members</h3>
            <button onClick={() => setEditStaff(null)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-teal-500/25">
              <Plus className="h-4 w-4" />Add Staff
            </button>
          </div>

          {loadingStaff ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <Users className="h-8 w-8 mb-2 opacity-25" />
              <p className="text-sm">No staff members yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {staff.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-teal-200 dark:hover:border-teal-700 transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {s.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{s.name}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${EMP_BADGE[s.employmentType] ?? 'bg-slate-100 text-slate-600'}`}>
                        {s.employmentType.replace('_', ' ')}
                      </span>
                      {s.status === 'inactive' && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700 font-semibold">inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="capitalize">{s.role}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{fmt(s.baseSalary)} / {s.salaryType}</span>
                      {s.overtimeRate !== 1.5 && <span>· OT ×{s.overtimeRate}</span>}
                      {s.doubleShiftRate > 0 && <span>· DS +{s.doubleShiftRate}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditStaff(s)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteStaff(s.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Salary records section */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Salary Records</h3>
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg px-1 py-0.5">
                <button onClick={() => setSalaryYear(y => y - 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                </button>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 px-2 tabular-nums">{salaryYear}</span>
                <button onClick={() => setSalaryYear(y => y + 1)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors">
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            </div>
            {staff.length > 0 && (
              <button onClick={() => setEditSalary(null)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/25">
                <Plus className="h-4 w-4" />Generate Salary
              </button>
            )}
          </div>

          {loadingSalary ? (
            <div className="space-y-2 animate-pulse">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
            </div>
          ) : salaryRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <DollarSign className="h-8 w-8 mb-2 opacity-25" />
              <p className="text-sm">No salary records for {salaryYear}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {salaryRecords.map(rec => (
                <div key={rec.id}
                  className="flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-all shadow-sm group"
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-[10px] font-bold text-white">
                      {(rec.staff?.name ?? '?').split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{rec.staff?.name}</span>
                      <span className="text-xs text-slate-400 font-medium">{MONTHS[(rec.month ?? 1) - 1]} {rec.year}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        rec.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {rec.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-400">
                      <span>Base: <strong className="text-slate-600 dark:text-slate-300">{fmt(rec.baseSalary)}</strong></span>
                      {rec.overtimeHours > 0   && <span className="text-blue-500">OT: {rec.overtimeHours}h ×{rec.overtimeMultiplier}</span>}
                      {rec.doubleShiftCount > 0 && <span className="text-violet-500">×{rec.doubleShiftCount} double shifts</span>}
                      {rec.bonuses    > 0 && <span className="text-emerald-500">+{fmt(rec.bonuses)} bonus</span>}
                      {rec.deductions > 0 && <span className="text-red-400">−{fmt(rec.deductions)} deduct</span>}
                      {rec.paidDate   && <span>· Paid {new Date(rec.paidDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-black text-violet-600 dark:text-violet-400 tabular-nums">{fmt(rec.netPay)}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {rec.status !== 'paid' && (
                        <button onClick={() => markPaid(rec.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500 transition-colors" title="Mark as paid">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => setEditSalary(rec)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteSalary(rec.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════ ANALYTICS ══════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          {/* Stat bar */}
          {loadingAnalytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
            </div>
          ) : overviewStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Total Sessions" value={String(overviewStats.totalSessions ?? overviewStats.sessionCount ?? 0)} icon={Calendar}  colorClass="text-teal-600 dark:text-teal-400"   bgClass="bg-teal-50 dark:bg-teal-900/10"   sub="all time" />
              <KpiCard label="Total Patients" value={String(overviewStats.totalPatients ?? overviewStats.patientCount ?? 0)} icon={Users}    colorClass="text-sky-600 dark:text-sky-400"    bgClass="bg-sky-50 dark:bg-sky-900/10"     sub="registered" />
              <KpiCard label="Avg Daily Visits" value={String(overviewStats.avgVisitsPerDay ?? (trendData.length > 0 ? (trendData.reduce((s,v)=>s+v.visits,0)/trendData.length).toFixed(1) : 0))} icon={Activity} colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-50 dark:bg-violet-900/10" sub="30-day avg" />
              <KpiCard label="Active Doctors" value={String(overviewStats.activeDoctors ?? overviewStats.doctorCount ?? 0)} icon={Heart}    colorClass="text-pink-600 dark:text-pink-400"  bgClass="bg-pink-50 dark:bg-pink-900/10"   sub="practitioners" />
            </div>
          ) : null}

          {/* Visit trend */}
          {trendData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Visits — Last 30 Days</p>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>Peak: <strong className="text-slate-600 dark:text-slate-300">{Math.max(...trendData.map(d=>d.visits))}</strong></span>
                  <span>Total: <strong className="text-slate-600 dark:text-slate-300">{trendData.reduce((s,d)=>s+d.visits,0)}</strong></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="visits" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 2.5, fill: '#14b8a6' }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top diagnoses */}
          {diagData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top Diagnoses</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={diagData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                      {diagData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {diagData.map((diag, i) => {
                  const max = diagData[0]?.count || 1
                  const pct = ((diag.count / max) * 100).toFixed(0)
                  return (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{diag.name}</span>
                        <span className="text-sm font-black" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{diag.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!loadingAnalytics && trendData.length === 0 && diagData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <BarChart3 className="h-10 w-10 mb-3 opacity-25" />
              <p className="text-sm">No analytics data yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
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
      {editSalary !== undefined && staff.length > 0 && (
        <SalaryModal
          allStaff={staff}
          record={editSalary}
          onClose={() => setEditSalary(undefined)}
          onSaved={() => { setEditSalary(undefined); loadSalary(); loadExpenses() }}
        />
      )}
    </div>
  )
}

export default ClinicFinanceSection
