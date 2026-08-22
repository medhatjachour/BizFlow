export type PlanCategoryKey =
  | 'general'
  | 'weight-loss'
  | 'muscle-gain'
  | 'athletic'
  | 'wellness'
  | 'vip'

export type PlanColorKey =
  | 'orange'
  | 'blue'
  | 'purple'
  | 'emerald'
  | 'teal'
  | 'rose'

export type AmenityKey =
  | 'hasSauna'
  | 'hasJacuzzi'
  | 'hasPool'
  | 'hasLocker'
  | 'hasTowel'
  | 'hasNutritionPlan'
  | 'hasBodyAnalysis'
  | 'hasFitnessTest'
  | 'hasGroupClass'

export type FormSection = 'basic' | 'sessions' | 'amenities' | 'display'

export interface Plan {
  id: string
  name: string
  description: string | null
  category: PlanCategoryKey | string
  durationDays: number
  price: number
  maxFreezeDays: number
  sessionsPerWeek: number | null
  sessionsTotal: number | null
  coachSessions: number
  hasSauna: boolean
  hasJacuzzi: boolean
  hasPool: boolean
  hasLocker: boolean
  hasTowel: boolean
  hasNutritionPlan: boolean
  hasBodyAnalysis: boolean
  hasFitnessTest: boolean
  hasGroupClass: boolean
  guestPasses: number
  color: PlanColorKey | string
  isPopular: boolean
  features: string | null
  isActive: boolean
  createdAt?: string
}

export interface PlanFormData {
  name: string
  description: string
  category: PlanCategoryKey | string
  durationDays: string
  price: string
  maxFreezeDays: string
  sessionsPerWeek: string
  sessionsTotal: string
  coachSessions: string
  hasSauna: boolean
  hasJacuzzi: boolean
  hasPool: boolean
  hasLocker: boolean
  hasTowel: boolean
  hasNutritionPlan: boolean
  hasBodyAnalysis: boolean
  hasFitnessTest: boolean
  hasGroupClass: boolean
  guestPasses: string
  color: PlanColorKey | string
  isPopular: boolean
  features: string
  isActive: boolean
}