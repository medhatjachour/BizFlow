export type EmployeeStatus = 'active' | 'on-leave' | 'terminated'
export type EmploymentType = 'full-time' | 'part-time' | 'contract'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'leave'
export type PayrollStatus = 'pending' | 'paid'

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
  _count?: { attendance: number; activityLogs: number }
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
  bonuses: number
  deductions: number
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

export interface EmployeeProfile extends Employee {
  attendance: EmployeeAttendance[]
  documents: EmployeeDocument[]
  activityLogs: EmployeeActivityLog[]
  payrollRecords: EmployeePayroll[]
  shifts: EmployeeShift[]
  overtimeRecords: EmployeeOvertime[]
  attendanceSummary: AttendanceSummary
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
