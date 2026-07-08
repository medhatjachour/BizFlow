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
  managerId?: string | null
  manager?: { id: string; name: string; role?: string; avatarUrl?: string | null } | null
  todayAttendance?: { checkIn?: string | null; checkOut?: string | null; status?: string } | null
  _count?: { attendance: number; activityLogs: number; reports?: number }
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

export interface EmployeeProfile extends Employee {
  attendance: EmployeeAttendance[]
  documents: EmployeeDocument[]
  activityLogs: EmployeeActivityLog[]
  payrollRecords: EmployeePayroll[]
  shifts: EmployeeShift[]
  overtimeRecords: EmployeeOvertime[]
  leaveRecords: EmployeeLeave[]
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
