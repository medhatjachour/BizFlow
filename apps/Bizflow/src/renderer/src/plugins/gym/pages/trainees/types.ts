export type Gender = 'male' | 'female' | 'other'
export type TraineeSubStatus = 'active' | 'frozen' | 'expired' | 'cancelled' | 'none'
export type GoalType = 'weight' | 'sessions' | 'measurement' | 'custom'
export type GoalStatus = 'active' | 'achieved'
export type ProfileTab = 'info' | 'measurements' | 'goals' | 'history' | 'qr'
export type TraineeFilter = 'all' | 'active' | 'expiring' | 'expired' | 'no_sub'
export type ViewMode = 'table' | 'cards'

export interface Plan {
  id: string
  name: string
  price?: number
  durationDays?: number
}

export interface Coach {
  id: string
  name: string
}

export interface TraineeSubscription {
  id: string
  planId?: string
  plan?: Plan
  coachId?: string
  coach?: Coach
  startDate: string
  endDate: string
  status: TraineeSubStatus
  amountPaid?: number
}

export interface TraineeSession {
  id: string
  date: string
  type: 'subscription_visit' | 'walkin'
  amount?: number
  paymentMethod?: string
  notes?: string
}

export interface Measurement {
  id: string
  traineeId: string
  date: string
  weight?: number
  bodyFat?: number
  muscle?: number
  waist?: number
  chest?: number
  arms?: number
  legs?: number
  notes?: string
  createdAt?: string
}

export interface TraineeGoal {
  id: string
  traineeId: string
  title: string
  type: GoalType
  targetValue?: number
  unit?: string
  deadline?: string
  status: GoalStatus
  notes?: string
}

export interface Trainee {
  id: string
  name: string
  phone?: string
  email?: string
  dateOfBirth?: string
  gender?: Gender
  nationalId?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  notes?: string
  subscriptions?: TraineeSubscription[]
  sessions?: TraineeSession[]
  _count?: {
    sessions?: number
    subscriptions?: number
  }
}

export interface TraineeFormData {
  name: string
  phone: string
  email: string
  age: string
  gender: string
  nationalId: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  notes: string
}

export interface MeasurementFormData {
  date: string
  weight: string
  bodyFat: string
  muscle: string
  waist: string
  chest: string
  arms: string
  legs: string
  notes: string
}

export interface GoalFormData {
  title: string
  type: GoalType
  targetValue: string
  unit: string
  deadline: string
  notes: string
}