import { COLORS, CATEGORIES } from './constants'
import { Plan, PlanFormData } from './types'

export function getPlanColor(colorKey?: string) {
  return COLORS.find(c => c.value === colorKey) ?? COLORS[0]
}

export function getPlanCategory(categoryKey?: string) {
  return CATEGORIES.find(c => c.value === categoryKey) ?? CATEGORIES[0]
}

export function formatDurationLabel(days: number): string {
  if (days >= 365) return `${Math.round(days / 365)} Year${days >= 730 ? 's' : ''}`
  if (days >= 30) return `${Math.round(days / 30)} Month${days >= 60 ? 's' : ''}`
  if (days >= 7) return `${Math.round(days / 7)} Week${days >= 14 ? 's' : ''}`
  return `${days} Days`
}

export function getDefaultPlanForm(): PlanFormData {
  return {
    name: '',
    description: '',
    category: 'general',
    durationDays: '30',
    price: '',
    maxFreezeDays: '0',
    sessionsPerWeek: '',
    sessionsTotal: '',
    coachSessions: '0',
    hasSauna: false,
    hasJacuzzi: false,
    hasPool: false,
    hasLocker: false,
    hasTowel: false,
    hasNutritionPlan: false,
    hasBodyAnalysis: false,
    hasFitnessTest: false,
    hasGroupClass: false,
    guestPasses: '0',
    color: 'orange',
    isPopular: false,
    features: '',
    isActive: true
  }
}

export function mapPlanToForm(p: Plan): PlanFormData {
  return {
    name: p.name,
    description: p.description ?? '',
    category: p.category ?? 'general',
    durationDays: String(p.durationDays || 30),
    price: String(p.price || 0),
    maxFreezeDays: String(p.maxFreezeDays || 0),
    sessionsPerWeek: p.sessionsPerWeek != null ? String(p.sessionsPerWeek) : '',
    sessionsTotal: p.sessionsTotal != null ? String(p.sessionsTotal) : '',
    coachSessions: String(p.coachSessions ?? 0),
    hasSauna: Boolean(p.hasSauna),
    hasJacuzzi: Boolean(p.hasJacuzzi),
    hasPool: Boolean(p.hasPool),
    hasLocker: Boolean(p.hasLocker),
    hasTowel: Boolean(p.hasTowel),
    hasNutritionPlan: Boolean(p.hasNutritionPlan),
    hasBodyAnalysis: Boolean(p.hasBodyAnalysis),
    hasFitnessTest: Boolean(p.hasFitnessTest),
    hasGroupClass: Boolean(p.hasGroupClass),
    guestPasses: String(p.guestPasses ?? 0),
    color: p.color ?? 'orange',
    isPopular: Boolean(p.isPopular),
    features: p.features ?? '',
    isActive: p.isActive !== false
  }
}

export function buildPlanPayload(form: PlanFormData) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    category: form.category,
    durationDays: parseInt(form.durationDays) || 30,
    price: parseFloat(form.price) || 0,
    maxFreezeDays: parseInt(form.maxFreezeDays) || 0,
    sessionsPerWeek: form.sessionsPerWeek !== '' ? parseInt(form.sessionsPerWeek) : null,
    sessionsTotal: form.sessionsTotal !== '' ? parseInt(form.sessionsTotal) : null,
    coachSessions: parseInt(form.coachSessions) || 0,
    hasSauna: form.hasSauna,
    hasJacuzzi: form.hasJacuzzi,
    hasPool: form.hasPool,
    hasLocker: form.hasLocker,
    hasTowel: form.hasTowel,
    hasNutritionPlan: form.hasNutritionPlan,
    hasBodyAnalysis: form.hasBodyAnalysis,
    hasFitnessTest: form.hasFitnessTest,
    hasGroupClass: form.hasGroupClass,
    guestPasses: parseInt(form.guestPasses) || 0,
    color: form.color,
    isPopular: form.isPopular,
    features: form.features.trim() || null,
    isActive: form.isActive
  }
}