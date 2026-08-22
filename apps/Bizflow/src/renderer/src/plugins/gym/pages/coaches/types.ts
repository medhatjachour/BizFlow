export type SalaryType = 'monthly' | 'hourly' | 'per_session'
export type CoachFilter = 'all' | 'active' | 'inactive'
export type CoachViewMode = 'grid' | 'table'
export type CoachProfileTab = 'info' | 'trainees' | 'activity' | 'shifts' | 'qr'

export interface TraineeSummary {
  id: string
  name: string
  phone?: string
  photoUrl?: string
}

export interface CoachSubscription {
  id: string
  traineeId: string
  trainee?: TraineeSummary
  plan?: {
    id: string
    name: string
  }
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'frozen' | 'cancelled'
  amountPaid?: number
}

export interface CoachShift {
  id: string
  coachId: string
  date: string
  startTime: string
  endTime: string
  notes?: string
  createdAt?: string
}

export interface CoachStats {
  sessionsToday: number
  sessionsWeek: number
  sessionsMonth: number
  activeTrainees: number
  uniqueTrainees: number
  totalRevenue: number
  expiringSoon: number
  subscriptions: CoachSubscription[]
}

export interface Coach {
  id: string
  name: string
  specialty?: string
  phone?: string
  email?: string
  nationalId?: string
  salary?: number
  salaryType?: SalaryType
  hireDate?: string
  isActive: boolean
  notes?: string
  _count?: {
    subscriptions?: number
    shifts?: number
  }
}

export interface CoachFormData {
  name: string
  specialty: string
  phone: string
  email: string
  nationalId: string
  salary: string
  salaryType: SalaryType
  hireDate: string
  isActive: boolean
  notes: string
}

export interface ShiftFormData {
  date: string
  startTime: string
  endTime: string
  notes: string
}