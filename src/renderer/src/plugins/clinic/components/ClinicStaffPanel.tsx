/**
 * ClinicStaffPanel
 *
 * Self-contained panel for managing clinic-specific staff (doctors, nurses,
 * receptionists, etc.) and their monthly salary records.
 *
 * Rendered as a "Clinic Staff" tab inside the kernel Employees page so that
 * clinic payroll is accessible from the shared HR area rather than buried
 * inside the Clinic Finance section.
 *
 * Clinic-exclusive data — ClinicStaff and ClinicSalaryRecord live in the
 * clinic plugin schema and are separate from the kernel Employee / Payroll tables.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Loader2, X, ChevronLeft, ChevronRight, Users, DollarSign,
  CheckCircle2, Pencil, Trash2, Link2, Unlink2, ExternalLink, Search, Stethoscope,
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAFF_ROLES = ['doctor', 'nurse', 'receptionist', 'technician', 'pharmacist', 'other']
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const EMP_BADGE: Record<string, string> = {
  full_time: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  part_time: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  contract:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
}
const INP = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Staff {
  id: string; name: string; role: string; phone?: string | null; email?: string | null
  employmentType: string; status: string; baseSalary: number; salaryType: string
  hourlyRate?: number | null; overtimeRate: number; doubleShiftRate: number
  hireDate: string; notes?: string | null; employeeId?: string | null
  linkedEmployee?: { id: string; name: string; department?: string | null; role: string; status: string } | null
}
interface GlobalEmployee { id: string; name: string; role: string; department?: string | null; status: string }
interface SalaryRecord {
  id: string; staffId: string; month: number; year: number
  baseSalary: number; regularHours: number; overtimeHours: number
  overtimeMultiplier: number; doubleShiftCount: number; doubleShiftBonus: number
  bonuses: number; deductions: number; netPay: number
  status: string; paidDate?: string | null; notes?: string | null
  staff?: { name: string; role: string; employmentType: string; salaryType: string }
}

// ─── StaffFormModal ───────────────────────────────────────────────────────────

function StaffFormModal({ staff, onClose, onSaved }: {
  staff?: Staff | null; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [globalEmps, setGlobalEmps] = useState<GlobalEmployee[]>([])
  const [empSearch, setEmpSearch] = useState('')
  const [f, setF] = useState({
    name:            staff?.name           ?? '',
    role:            staff?.role           ?? 'nurse',
    phone:           staff?.phone          ?? '',
    email:           staff?.email          ?? '',
    employmentType:  staff?.employmentType ?? 'full_time',
    status:          staff?.status         ?? 'active',
    baseSalary:      staff?.baseSalary?.toString()     ?? '0',
    salaryType:      staff?.salaryType     ?? 'monthly',
    hourlyRate:      staff?.hourlyRate?.toString()     ?? '',
    overtimeRate:    staff?.overtimeRate?.toString()   ?? '1.5',
    doubleShiftRate: staff?.doubleShiftRate?.toString() ?? '0',
    hireDate:        staff ? new Date(staff.hireDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    notes:           staff?.notes ?? '',
    employeeId:      staff?.employeeId ?? '',
  })
  const up = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    window.api.employees.getAll()
      .then((emps: any[]) => setGlobalEmps(emps.filter((e: any) => e.status !== 'terminated')))
      .catch(() => {})
  }, [])

  const filteredEmps = empSearch.trim()
    ? globalEmps.filter(e =>
        e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        (e.department ?? '').toLowerCase().includes(empSearch.toLowerCase()) ||
        e.role.toLowerCase().includes(empSearch.toLowerCase())
      )
    : globalEmps
  const linkedEmp = globalEmps.find(e => e.id === f.employeeId) ?? null

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
        employeeId: f.employeeId || null,
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
              {staff ? 'Edit Clinic Staff' : 'Add Clinic Staff'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Clinic-exclusive employee profile</p>
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

          {/* ── Link to global employee ──────────────────────────────── */}
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-3.5 w-3.5 text-teal-500" />
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Link to Global Employee (optional)</label>
            </div>
            {linkedEmp ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{linkedEmp.name}</p>
                  <p className="text-xs text-slate-500">{linkedEmp.role}{linkedEmp.department ? ` · ${linkedEmp.department}` : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { up('employeeId', ''); setEmpSearch('') }}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                >
                  <Unlink2 className="h-3.5 w-3.5" /> Unlink
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    placeholder="Search employees by name, role, or department…"
                    className={INP + ' pl-9'}
                  />
                </div>
                {empSearch.trim() && filteredEmps.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-600 divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-700 shadow-sm">
                    {filteredEmps.map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => { up('employeeId', e.id); setEmpSearch('') }}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{e.name}</p>
                          <p className="text-xs text-slate-400">{e.role}{e.department ? ` · ${e.department}` : ''}</p>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          e.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500'
                        }`}>{e.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {empSearch.trim() && filteredEmps.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No employees found</p>
                )}
              </div>
            )}
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

function SalaryModal({ allStaff, record, defaultStaffId, onClose, onSaved }: {
  allStaff: Staff[]; record?: SalaryRecord | null; defaultStaffId?: string
  onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [computing, setComputing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const now = new Date()

  const [f, setF] = useState({
    staffId:            record?.staffId ?? defaultStaffId ?? (allStaff[0]?.id ?? ''),
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

  useEffect(() => {
    if (!f.staffId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setComputing(true)
      try {
        const result = await window.api.clinic.staff.salary.compute(f.staffId, {
          regularHours:       parseFloat(f.regularHours) || 0,
          overtimeHours:      parseFloat(f.overtimeHours) || 0,
          overtimeMultiplier: parseFloat(f.overtimeMultiplier) || 1.5,
          doubleShiftCount:   parseInt(f.doubleShiftCount) || 0,
          doubleShiftBonus:   parseFloat(f.doubleShiftBonus) || 0,
          bonuses:            parseFloat(f.bonuses) || 0,
          deductions:         parseFloat(f.deductions) || 0,
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
            <p className="text-xs text-slate-400 mt-0.5">Monthly payroll calculation · Clinic staff</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[62vh] overflow-y-auto">
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
                  { label: 'Base Pay',      val: bd.basePay,        show: true,                 color: 'text-slate-700 dark:text-slate-300' },
                  { label: 'Overtime Pay',  val: bd.overtimePay,    show: bd.overtimePay > 0,   color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Double Shifts', val: bd.doubleShiftPay, show: bd.doubleShiftPay > 0, color: 'text-violet-600 dark:text-violet-400' },
                  { label: 'Bonuses',       val: bd.bonuses,        show: bd.bonuses > 0,        color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Deductions',    val: -bd.deductions,    show: bd.deductions > 0,     color: 'text-red-500 dark:text-red-400' },
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

// ─── ClinicStaffPanel ─────────────────────────────────────────────────────────

export default function ClinicStaffPanel() {
  const { showToast } = useToast()

  const [staff,         setStaff]         = useState<Staff[]>([])
  const [loadingStaff,  setLoadingStaff]  = useState(true)
  const [editStaff,     setEditStaff]     = useState<Staff | null | undefined>(undefined)
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [loadingSalary, setLoadingSalary] = useState(true)
  const [editSalary,    setEditSalary]    = useState<SalaryRecord | null | undefined>(undefined)
  const [selectedStaffId,         setSelectedStaffId]         = useState<string | null>(null)
  const [salaryModalDefaultStaff, setSalaryModalDefaultStaff] = useState<string | undefined>(undefined)
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear())

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true)
    try { setStaff(await window.api.clinic.staff.getAll()) }
    catch (e) { logger.error('ClinicStaffPanel: loadStaff failed', e); showToast('error', 'Failed to load clinic staff') }
    finally { setLoadingStaff(false) }
  }, [showToast])

  const loadSalary = useCallback(async () => {
    setLoadingSalary(true)
    try { setSalaryRecords(await window.api.clinic.staff.salary.getAll({ year: salaryYear })) }
    catch { showToast('error', 'Failed to load salary records') }
    finally { setLoadingSalary(false) }
  }, [salaryYear, showToast])

  useEffect(() => { loadStaff() }, [loadStaff])
  useEffect(() => { loadSalary() }, [loadSalary])

  async function deleteStaff(id: string) {
    if (!confirm('Remove this clinic staff member? Their salary records will also be deleted.')) return
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

  const visibleSalaryRecords = selectedStaffId
    ? salaryRecords.filter(r => r.staffId === selectedStaffId)
    : salaryRecords
  const selectedStaffMember = selectedStaffId
    ? (staff.find(s => s.id === selectedStaffId) ?? null)
    : null

  return (
    <div className="space-y-6">

      {/* ── Section header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/40">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex-shrink-0">
          <Stethoscope size={18} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Clinic Staff</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Doctors, nurses and clinic-specific roles — managed separately from main business employees</p>
        </div>
        <span className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-teal-600 text-white font-bold shadow-sm">
          Clinic-exclusive
        </span>
      </div>

      {/* ── Staff grid ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Staff Members</h3>
            <p className="text-xs text-slate-400 mt-0.5">{staff.length} employee{staff.length !== 1 ? 's' : ''} · {staff.filter(s => s.status === 'active').length} active</p>
          </div>
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
          <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No clinic staff yet</p>
            <button onClick={() => setEditStaff(null)} className="mt-2 text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold">Add first clinic employee →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {staff.map(s => {
              const ytdRecords = salaryRecords.filter(r => r.staffId === s.id)
              const ytdTotal   = ytdRecords.reduce((acc, r) => acc + r.netPay, 0)
              const ytdPending = ytdRecords.filter(r => r.status === 'pending').length
              const isSelected = selectedStaffId === s.id
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStaffId(isSelected ? null : s.id)}
                  className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer shadow-sm hover:shadow-md transition-all group ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-300 dark:border-teal-600 ring-1 ring-teal-400/30'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700/60'
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white">
                      {s.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{s.name}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${EMP_BADGE[s.employmentType] ?? 'bg-slate-100 text-slate-600'}`}>
                        {s.employmentType.replace('_', ' ')}
                      </span>
                      {s.status === 'inactive' && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700 font-semibold">inactive</span>
                      )}
                      {s.linkedEmployee && (
                        <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 font-semibold border border-teal-200 dark:border-teal-700/40">
                          <Link2 className="h-2.5 w-2.5" />Linked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      <span className="capitalize">{s.role}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{fmt(s.baseSalary)}/{s.salaryType.slice(0,2)}</span>
                      {ytdRecords.length > 0 && (
                        <>
                          <span>·</span>
                          <span className={`font-semibold tabular-nums ${ytdPending > 0 ? 'text-amber-500' : 'text-violet-500 dark:text-violet-400'}`}>
                            YTD {fmt(ytdTotal)}
                          </span>
                          {ytdPending > 0 && <span className="text-amber-500">({ytdPending} pending)</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    {s.linkedEmployee && (
                      <a
                        href={`#/employees/${s.linkedEmployee.id}`}
                        onClick={e => { e.preventDefault(); window.location.hash = `/employees/${s.linkedEmployee!.id}` }}
                        className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        title="View employee profile"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => { setSalaryModalDefaultStaff(s.id); setEditSalary(null) }}
                      className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Log salary"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditStaff(s)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteStaff(s.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Salary Records ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Salary Records</h3>
                {selectedStaffMember && (
                  <button
                    onClick={() => setSelectedStaffId(null)}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-semibold hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                  >
                    {selectedStaffMember.name.split(' ')[0]} <X className="h-3 w-3 ml-0.5" />
                  </button>
                )}
              </div>
              {visibleSalaryRecords.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {visibleSalaryRecords.filter(r => r.status === 'pending').length} pending · Total{' '}
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {fmt(visibleSalaryRecords.reduce((s, r) => s + r.netPay, 0))}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg px-1 py-0.5">
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
            <button onClick={() => { setSalaryModalDefaultStaff(undefined); setEditSalary(null) }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/25">
              <Plus className="h-4 w-4" />Generate Salary
            </button>
          )}
        </div>

        {loadingSalary ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
          </div>
        ) : visibleSalaryRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mb-3">
              <DollarSign className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {selectedStaffMember
                ? `No records for ${selectedStaffMember.name.split(' ')[0]} in ${salaryYear}`
                : `No salary records for ${salaryYear}`}
            </p>
            {selectedStaffMember && (
              <button
                onClick={() => { setSalaryModalDefaultStaff(selectedStaffMember.id); setEditSalary(null) }}
                className="mt-2 text-xs text-violet-600 dark:text-violet-400 hover:underline font-semibold"
              >
                Generate salary for {selectedStaffMember.name.split(' ')[0]} →
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-700/60">
            {visibleSalaryRecords.map(rec => (
              <div key={rec.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-[10px] font-bold text-white">
                    {(rec.staff?.name ?? '?').split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{rec.staff?.name}</span>
                    <span className="text-xs text-slate-400 font-medium flex-shrink-0">{MONTHS[(rec.month ?? 1) - 1]} {rec.year}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                      rec.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {rec.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-400">
                    <span>Base: <strong className="text-slate-600 dark:text-slate-300">{fmt(rec.baseSalary)}</strong></span>
                    {rec.overtimeHours > 0    && <span className="text-blue-500">OT: {rec.overtimeHours}h</span>}
                    {rec.doubleShiftCount > 0  && <span className="text-violet-500">×{rec.doubleShiftCount} DS</span>}
                    {rec.bonuses > 0           && <span className="text-emerald-500">+{fmt(rec.bonuses)}</span>}
                    {rec.deductions > 0        && <span className="text-red-400">−{fmt(rec.deductions)}</span>}
                    {rec.paidDate              && <span>· {new Date(rec.paidDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-base font-black text-violet-600 dark:text-violet-400 tabular-nums">{fmt(rec.netPay)}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* ── Modals ──────────────────────────────────────────────────────── */}
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
          defaultStaffId={salaryModalDefaultStaff}
          onClose={() => setEditSalary(undefined)}
          onSaved={() => { setEditSalary(undefined); loadSalary() }}
        />
      )}
    </div>
  )
}
