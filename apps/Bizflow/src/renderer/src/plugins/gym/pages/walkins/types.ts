export type SessionPeriod = 'today' | 'week' | 'month' | 'year'
export type SessionType = 'walkin' | 'subscription_visit'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'
export type SessionViewMode = 'table' | 'cards'

export interface TraineeSummary {
  id: string
  name: string
  phone?: string
  photoUrl?: string
}

export interface CoachSummary {
  id: string
  name: string
  specialty?: string
}

export interface GymSession {
  id: string
  date: string
  type: SessionType
  amount?: number
  paymentMethod?: PaymentMethod | string
  notes?: string
  traineeId?: string
  trainee?: TraineeSummary
  coachId?: string
  coach?: CoachSummary
  createdAt?: string
}

export interface WalkInFormData {
  traineeSearch: string
  traineeId: string
  coachId: string
  date: string
  type: SessionType
  amount: string
  paymentMethod: PaymentMethod | string
  notes: string
}

export interface SessionFilterState {
  period: SessionPeriod
  typeFilter: string
  searchQuery: string
}