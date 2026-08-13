/**
 * Pure helper functions for the HR / Employees module.
 *
 * Everything here is side-effect free (or only touches the DOM for downloads)
 * so it can be shared by hooks, page components and tests.
 */

import type { Employee } from './types'
import { AVATAR_COLORS, SALARY_TYPE_COLORS, STANDARD_MONTHLY_HOURS } from './constants'

// ─── Dates ──────────────────────────────────────────────────────────────────

/** Date-only key (YYYY-MM-DD, UTC) for a date value. */
export function toDateKey(d: string | Date): string {
  return (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0]
}

export function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

/** Local HH:MM for a timestamp. Returns '' for missing/invalid values. */
export function formatTime(value?: string | Date | null): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Local date label. Falls back to '—'. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

/** Currency formatter with configurable precision. */
export function formatMoney(n?: number | null, fractionDigits = 0): string {
  return `$${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`
}

/** Days from today until a date (negative = already past). null when no date. */
export function daysUntil(date?: string | null): number | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

export type ExpiryState = 'none' | 'ok' | 'soon' | 'expired'

/** Classify an expiry date: expired (past), soon (≤ threshold days), ok, or none. */
export function expiryState(date?: string | null, thresholdDays = 30): ExpiryState {
  const n = daysUntil(date)
  if (n === null) return 'none'
  if (n < 0) return 'expired'
  if (n <= thresholdDays) return 'soon'
  return 'ok'
}

// ─── Payroll period encoding ────────────────────────────────────────────────
// See the original payrollPeriod.ts for the encoding rationale.

export type PayrollPeriodType = 'monthly' | 'weekly' | 'daily'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Encode the active UI period into the integer stored in `EmployeePayroll.month`. */
export function encodePayrollPeriodKey(
  periodType: PayrollPeriodType,
  month: number,
  week: number,
  day: number,
): number {
  if (periodType === 'weekly') return 1000 + week
  if (periodType === 'daily') return 2000 + month * 100 + day
  return month
}

/** Human-readable label for a stored payroll `month` field. Robust to all three encodings. */
export function describePayrollPeriod(monthField: number, year: number): string {
  if (monthField >= 2000) {
    const m = Math.floor((monthField - 2000) / 100)
    const d = (monthField - 2000) % 100
    const name = MONTH_SHORT[m - 1] ?? '?'
    return `${d} ${name} ${year}`
  }
  if (monthField >= 1000) {
    return `Week ${monthField - 1000} · ${year}`
  }
  return `${MONTH_SHORT[monthField - 1] ?? '?'} ${year}`
}

/** ISO week number (1–53) for a date. */
export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** Approximate label for an ISO week (e.g. "Week 12 · Mar 17–23"). */
export function getWeekLabel(week: number, year: number): string {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const start = new Date(simple)
  start.setDate(simple.getDate() - dow + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `Week ${week} · ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ─── Presentation helpers ───────────────────────────────────────────────────

/** Initials (max 2 chars) for an avatar. */
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Deterministic gradient class for an avatar, derived from the name. */
export function avatarColor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/** Badge classes for a salary / pay period type. */
export function salaryTypeColor(type: string): string {
  return SALARY_TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
}

// ─── Finance helpers ────────────────────────────────────────────────────────

/** Effective hourly rate from a salary + salary type (used for overtime estimates). */
export function hourlyRate(salary: number, salaryType: string): number {
  if (salary <= 0) return 0
  switch (salaryType) {
    case 'hourly': return salary
    case 'weekly': return salary / 40
    case 'daily': return salary / 8
    default: return salary / STANDARD_MONTHLY_HOURS
  }
}

// ─── Org chart ──────────────────────────────────────────────────────────────

export interface OrgNode extends Pick<Employee, 'id' | 'name' | 'role' | 'status' | 'avatarUrl'> {
  children: OrgNode[]
}

/**
 * Build a forest of org trees from a flat employee list (linked via managerId).
 * Roots are employees with no manager (or a manager not present in the list).
 */
export function buildOrgForest(employees: Employee[]): OrgNode[] {
  const byId = new Map<string, OrgNode>()
  for (const e of employees) {
    byId.set(e.id, { id: e.id, name: e.name, role: e.role, status: e.status, avatarUrl: e.avatarUrl, children: [] })
  }
  const roots: OrgNode[] = []
  for (const e of employees) {
    const node = byId.get(e.id)!
    const manager = e.managerId ? byId.get(e.managerId) : undefined
    if (manager) manager.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** Flatten an org forest into depth-first list (for counting / search). */
export function flattenOrgForest(forest: OrgNode[]): OrgNode[] {
  const out: OrgNode[] = []
  const walk = (nodes: OrgNode[]) => {
    for (const n of nodes) {
      out.push(n)
      walk(n.children)
    }
  }
  walk(forest)
  return out
}

// ─── CSV export ─────────────────────────────────────────────────────────────

function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

/** Build a CSV string from the current employee list (respects sort order). */
export function buildEmployeesCsv(employees: Employee[]): string {
  const cols: [string, (e: Employee) => string][] = [
    ['Name', e => e.name],
    ['Role', e => e.role],
    ['Department', e => e.department ?? ''],
    ['Status', e => e.status],
    ['Employment', e => e.employmentType],
    ['Email', e => e.email ?? ''],
    ['Phone', e => e.phone],
    ['Salary', e => String(e.salary ?? 0)],
    ['Salary type', e => e.salaryType],
    ['Hire date', e => e.hireDate ? toDateKey(e.hireDate) : ''],
    ['Performance', e => e.performanceScore != null ? String(e.performanceScore) : ''],
    ['Manager', e => e.manager?.name ?? ''],
    ['Contract end', e => e.contractEndDate ? toDateKey(e.contractEndDate) : ''],
    ['ID expiry', e => e.idExpiryDate ? toDateKey(e.idExpiryDate) : ''],
  ]
  const rows = [cols.map(c => c[0]).join(',')]
  for (const e of employees) rows.push(cols.map(c => csvEscape(c[1](e))).join(','))
  return rows.join('\r\n')
}

/** Trigger a client-side CSV download. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Leave balance (client-side mirror of the server computation) ───────────

export interface LeaveBalance {
  allowance: number
  taken: number
  pending: number
  remaining: number
}

/** Annual paid-leave balance for the current year. */
export function computeLeaveBalance(annualAllowance: number, leaveRecords: { type: string; startDate: string; days: number; status: string }[]): LeaveBalance {
  const allowance = annualAllowance || 21
  const year = new Date().getFullYear()
  const annual = (leaveRecords ?? []).filter(
    l => l.type === 'annual' && new Date(l.startDate).getFullYear() === year,
  )
  const taken = annual.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days ?? 0), 0)
  const pending = annual.filter(l => l.status === 'pending').reduce((s, l) => s + (l.days ?? 0), 0)
  return { allowance, taken, pending, remaining: Math.max(0, allowance - taken) }
}

// ─── Attendance summary (client-side mirror) ────────────────────────────────

export interface AttendanceSummary {
  total: number
  present: number
  absent: number
  late: number
  onLeave: number
  rate: number
}

export function computeAttendanceSummary(attendance: { status: string }[]): AttendanceSummary {
  const total = attendance.length
  const present = attendance.filter(a => a.status === 'present').length
  const absent = attendance.filter(a => a.status === 'absent').length
  const late = attendance.filter(a => a.status === 'late').length
  const onLeave = attendance.filter(a => a.status === 'leave').length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  return { total, present, absent, late, onLeave, rate }
}
