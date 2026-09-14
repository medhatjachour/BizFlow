export type EmployeeStatus = 'active' | 'on-leave' | 'terminated'
export type EmploymentType = 'full-time' | 'part-time' | 'contract'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'leave'
export type PayrollStatus = 'pending' | 'paid'
export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface Employee {
  id: string
  name: string
  role: string
  department?: string
  email?: string | null
  phone: string
  address?: string
  nationalId?: string
  avatarUrl?: string
  employmentType: EmploymentType
  status: EmployeeStatus
  hireDate: string
  terminationDate?: string
  terminationNote?: string
  salary: number
  salaryType: string
  emergencyName?: string
  emergencyPhone?: string
  notes?: string
  performanceScore?: number | null
  createdAt: string
  updatedAt: string
  annualLeaveDays?: number
  taxId?: string
  socialInsuranceNo?: string
  bankName?: string
  iban?: string
  contractEndDate?: string | null
  idExpiryDate?: string | null
  /** End of probation / trial period. */
  probationEndDate?: string | null
  /** Final day actually worked — may differ from terminationDate. */
  lastWorkingDate?: string | null
  /** resignation | end-of-contract | dismissal | redundancy | retirement */
  exitReason?: string | null
  rehireEligible?: boolean | null
  exitInterviewNotes?: string | null
  managerId?: string | null
  manager?: { id: string; name: string; role?: string; avatarUrl?: string | null } | null
  todayAttendance?: { checkIn?: string | null; checkOut?: string | null; status?: string } | null
  _count?: { attendance: number; activityLogs: number; reports?: number; /** Open required onboarding tasks. */ checklistItems?: number }
}

export interface EmployeeAttendance {
  id: string
  employeeId: string
  date: string
  checkIn?: string
  checkOut?: string
  status: AttendanceStatus
  notes?: string
}

export interface AttendanceSummary {
  total: number
  present: number
  absent: number
  late: number
  onLeave: number
  rate: number
}

export interface EmployeeDocument {
  id: string
  employeeId: string
  title: string
  type: string
  filename: string
  /** Number printed on the document itself (licence, policy, national ID). */
  reference?: string | null
  issuedAt?: string | null
  /** null means the document never expires. */
  expiresAt?: string | null
  uploadedAt: string
}

export interface EmployeeActivityLog {
  id: string
  employeeId: string
  action: string
  details?: string
  performedBy?: string
  createdAt: string
}

export interface EmployeePayroll {
  id: string
  employeeId: string
  month: number
  year: number
  baseSalary: number
  regularHours?: number
  overtimeHours?: number
  overtimePay?: number
  extraShifts?: number
  extraShiftPay?: number
  bonuses: number
  deductions: number
  grossPay?: number
  netPay: number
  status: PayrollStatus
  paidDate?: string
  notes?: string
  employee?: { id: string; name: string; role: string; department?: string }
}

export interface EmployeeShift {
  id: string
  employeeId: string
  date: string
  shiftType: string // morning | evening | night | custom
  startTime: string // HH:MM
  endTime: string   // HH:MM
  breakMins: number
  notes?: string
  createdAt: string
}

export interface EmployeeOvertime {
  id: string
  employeeId: string
  date: string
  hours: number
  reason?: string
  approved: boolean
  approvedBy?: string
  multiplier: number
  createdAt: string
}

export interface EmployeeLeave {
  id: string
  employeeId: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: LeaveStatus
  approvedBy?: string
  reviewedAt?: string
  createdAt: string
}

export interface LeaveBalance {
  allowance: number   // annual paid-leave allowance
  taken: number       // approved annual-leave days used this year
  pending: number     // pending annual-leave days awaiting approval
  remaining: number   // allowance − taken
}

export type ChecklistPhase = 'onboarding' | 'offboarding'
export type ChecklistCategory =
  | 'documents' | 'access' | 'equipment' | 'payroll' | 'handover' | 'compliance' | 'other'

/**
 * One task on an onboarding or offboarding list.
 *
 * `required` is what makes the list load-bearing: an offboarding cannot be
 * completed while a required task is still open.
 */
export interface EmployeeChecklistItem {
  id: string
  employeeId: string
  phase: ChecklistPhase
  title: string
  category: ChecklistCategory
  required: boolean
  dueDate?: string | null
  completed: boolean
  completedAt?: string | null
  completedBy?: string | null
  notes?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** Progress through one phase of a checklist. */
export interface ChecklistProgress {
  total: number
  done: number
  requiredOpen: number
  percent: number
  complete: boolean
}

/**
 * How far through a phase an employee is.
 * `complete` needs every *required* task done — optional tasks never block.
 */
export function checklistProgress(items: EmployeeChecklistItem[]): ChecklistProgress {
  const total = items.length
  const done = items.filter((item) => item.completed).length
  const requiredOpen = items.filter((item) => item.required && !item.completed).length
  return {
    total,
    done,
    requiredOpen,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && requiredOpen === 0,
  }
}

export interface EmployeeProfile extends Employee {
  attendance: EmployeeAttendance[]
  documents: EmployeeDocument[]
  activityLogs: EmployeeActivityLog[]
  payrollRecords: EmployeePayroll[]
  shifts: EmployeeShift[]
  overtimeRecords: EmployeeOvertime[]
  leaveRecords: EmployeeLeave[]
  checklistItems: EmployeeChecklistItem[]
  attendanceSummary: AttendanceSummary
  leaveBalance: LeaveBalance
  reports?: { id: string; name: string; role?: string; status?: EmployeeStatus; avatarUrl?: string | null }[]
}

export interface EmployeeStats {
  total: number
  active: number
  onLeave: number
  terminated: number
  presentToday: number
  attendanceRate: number
  payrollThisMonth: number
}
