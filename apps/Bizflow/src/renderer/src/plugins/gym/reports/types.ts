export type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month'

export type SessionType = 'subscription' | 'walkin' | 'pt' | 'group'

export interface TraineeRef {
  id: string
  name: string
  avatar?: string
  phone?: string
}

export interface CoachRef {
  id: string
  name: string
}

export interface GymSessionRecord {
  id: string
  date: string | Date
  type: SessionType
  amount: number
  trainee?: TraineeRef | null
  coach?: CoachRef | null
  status?: 'completed' | 'ongoing' | 'cancelled'
  notes?: string
}

export interface GymReportStats {
  activeMembers: number
  expiringSoon: number
  todayCheckIns: number
  revenue: number
  subRevenue: number
  walkRevenue: number
  totalExpenses: number
  netIncome: number
  newSignups?: number
}

export interface SessionFilterOptions {
  type: 'all' | SessionType
  searchQuery: string
}