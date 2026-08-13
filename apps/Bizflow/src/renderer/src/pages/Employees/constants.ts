/**
 * Shared constants for the HR / Employees module.
 *
 * Central place for enumerations, option lists, colour maps and form defaults
 * so the page components and hooks stay lean and consistent.
 */

// ─── Employment & lifecycle ────────────────────────────────────────────────

export const EMPLOYEE_STATUSES = ['active', 'on-leave', 'terminated'] as const
export type EmployeeStatusValue = (typeof EMPLOYEE_STATUSES)[number]

export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract'] as const
export type EmploymentTypeValue = (typeof EMPLOYMENT_TYPES)[number]

export const SALARY_TYPES = ['monthly', 'weekly', 'daily', 'hourly'] as const
export type SalaryTypeValue = (typeof SALARY_TYPES)[number]

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half-day', 'leave'] as const
export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number]

export const PAYROLL_STATUSES = ['pending', 'paid'] as const

export const LEAVE_TYPES = ['annual', 'sick', 'unpaid', 'other'] as const
export type LeaveTypeValue = (typeof LEAVE_TYPES)[number]

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const

export const SHIFT_TYPES = ['morning', 'evening', 'night', 'custom', 'extra'] as const

export const DOCUMENT_TYPES = ['contract', 'id_copy', 'certificate', 'other'] as const

export const OVERTIME_MULTIPLIERS = [1.0, 1.5, 2.0] as const

// ─── Role / department catalogue (fallback lists) ───────────────────────────

export const ROLES = [
  // General
  'Cashier', 'Manager', 'Supervisor', 'Accountant', 'HR', 'IT',
  'Warehouse', 'Delivery', 'Security', 'Other',
  // Clinic / Medical
  'Doctor', 'Nurse', 'Receptionist', 'Technician', 'Pharmacist',
  'Lab Technician', 'Physiotherapist', 'Radiologist',
]

export const DEPARTMENTS = ['Sales', 'Operations', 'Finance', 'Logistics', 'Management', 'IT', 'HR', 'Clinic', 'Medical', 'Administration']

// ─── Shift presets ──────────────────────────────────────────────────────────

export const SHIFT_PRESETS: Record<string, { startTime: string; endTime: string; breakMins: number }> = {
  morning: { startTime: '08:00', endTime: '16:00', breakMins: 30 },
  evening: { startTime: '16:00', endTime: '00:00', breakMins: 30 },
  night: { startTime: '00:00', endTime: '08:00', breakMins: 30 },
}

// ─── Colours ────────────────────────────────────────────────────────────────

/** Badge classes for the three lifecycle statuses. */
export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'on-leave': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

/** Solid background colours used for the attendance calendar / boards. */
export const ATTENDANCE_DOT_COLORS: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-400',
  late: 'bg-amber-400',
  'half-day': 'bg-yellow-300',
  leave: 'bg-blue-400',
}

/** Avatar gradient palette, keyed by name hash (see utils.avatarColor). */
export const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
]

/** Badge classes for salary / pay period type. */
export const SALARY_TYPE_COLORS: Record<string, string> = {
  monthly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  weekly: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  daily: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hourly: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

// ─── Payroll ────────────────────────────────────────────────────────────────

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const DEFAULT_ANNUAL_LEAVE_DAYS = 21

/** Standard monthly working hours used to derive an hourly rate from salary. */
export const STANDARD_MONTHLY_HOURS = 160

// ─── Page defaults ──────────────────────────────────────────────────────────

export const SORT_OPTIONS = ['name', 'hire', 'performance', 'department'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const SEARCH_DEBOUNCE_MS = 200

/** Shared input class strings (tailwind needs full literal classes). */
export const INPUT_CLS = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors placeholder:text-slate-400'
export const SELECT_CLS = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary cursor-pointer'

// ─── Empty form model for add / edit ────────────────────────────────────────

export const EMPTY_FORM = {
  name: '', role: '', department: '', email: '', phone: '',
  address: '', nationalId: '', employmentType: 'full-time' as const,
  status: 'active' as const, salary: 0, salaryType: 'monthly',
  emergencyName: '', emergencyPhone: '', notes: '',
  hireDate: new Date().toISOString().split('T')[0],
  performanceScore: 0,
  annualLeaveDays: DEFAULT_ANNUAL_LEAVE_DAYS,
  taxId: '', socialInsuranceNo: '', bankName: '', iban: '',
  contractEndDate: '', idExpiryDate: '',
  managerId: ''
}

export type EmployeeFormData = typeof EMPTY_FORM
