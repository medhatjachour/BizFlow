export interface AtRiskMember {
  traineeId: string
  name: string
  planName?: string
  daysSince: number
  phone?: string
  avatar?: string
}

export interface ExpiringSubscription {
  id: string
  trainee?: {
    id: string
    name: string
  }
  plan?: {
    id: string
    name: string
  }
  endDate: string | Date
}

export interface VisitTrendPoint {
  date: string
  count: number
}

export interface GymDashboardOverview {
  activeMembers: number
  expiringSoon: number
  todayCheckIns: number
  revenue: number
  subRevenue: number
  walkRevenue: number
  totalExpenses: number
  netIncome: number
  newMembersThisMonth?: number
  activePrograms?: number
  occupiedLockers?: number
  totalLockers?: number
  visitTrend?: VisitTrendPoint[]
}