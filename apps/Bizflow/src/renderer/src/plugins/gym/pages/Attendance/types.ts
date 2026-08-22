export type SubscriptionStatus = 'active' | 'expiring' | 'none'
export type PaymentMethod = 'cash' | 'card' | 'transfer'
export type SessionType = 'subscription_visit' | 'walkin'

export interface TraineeSubscription {
  id: string
  planName?: string
  startDate: string
  endDate: string
  status?: string
}

export interface Trainee {
  id: string
  name: string
  phone?: string
  photoUrl?: string
  subscriptions?: TraineeSubscription[]
}

export interface Session {
  id: string
  date: string
  type: SessionType
  amount?: number
  paymentMethod?: PaymentMethod | string
  notes?: string
  traineeId?: string
  trainee?: Trainee
}

export interface CalendarDaySummary {
  total: number
  walkin: number
  sub: number
  revenue: number
}

export type CalendarData = Record<string, CalendarDaySummary>

export interface AtRiskMember {
  traineeId: string
  name: string
  phone?: string
  planName?: string
  lastVisit?: string
  daysSince: number
}