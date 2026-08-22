export type SubscriptionStatus = 'active' | 'frozen' | 'expired' | 'cancelled'
export type SubscriptionFilter = 'all' | 'active' | 'expiring' | 'frozen' | 'expired' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'
export type SubscriptionViewMode = 'cards' | 'table'

export interface Plan {
  id: string
  name: string
  price: number
  durationDays: number
  maxFreezeDays?: number
  features?: string
  isActive?: boolean
}

export interface Coach {
  id: string
  name: string
  specialty?: string
}

export interface TraineeLite {
  id: string
  name: string
  phone?: string
  email?: string
}

export interface Subscription {
  id: string
  traineeId: string
  trainee?: TraineeLite
  planId: string
  plan?: Plan
  coachId?: string
  coach?: Coach
  startDate: string
  endDate: string
  status: SubscriptionStatus
  amountPaid?: number
  paymentMethod?: PaymentMethod | string
  notes?: string
  createdAt?: string
}

export interface SubscriptionFormData {
  traineeSearch: string
  traineeId: string
  traineeName: string
  planId: string
  coachId: string
  startDate: string
  amountPaid: string
  paymentMethod: PaymentMethod | string
  notes: string
}

export interface SubscriptionProgress {
  totalDays: number
  daysRemaining: number
  elapsedDays: number
  percent: number
  isExpiringSoon: boolean
  isExpired: boolean
  progressColorClass: string
}