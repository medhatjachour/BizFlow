import { TraineeFilter, GoalType, Gender } from './types'

export const PAGE_SIZE = 15

export const FILTER_OPTIONS: { id: TraineeFilter; labelKey: string; defaultLabel: string }[] = [
  { id: 'all', labelKey: 'gymFilterAll', defaultLabel: 'All Members' },
  { id: 'active', labelKey: 'gymFilterActive', defaultLabel: 'Active Plans' },
  { id: 'expiring', labelKey: 'gymFilterExpiring', defaultLabel: 'Expiring Soon' },
  { id: 'expired', labelKey: 'gymFilterExpired', defaultLabel: 'Expired / Frozen' },
  { id: 'no_sub', labelKey: 'gymFilterNoSub', defaultLabel: 'No Plan' }
]

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
]

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'weight', label: 'Weight Target' },
  { value: 'sessions', label: 'Attendance Target' },
  { value: 'measurement', label: 'Body Measurement' },
  { value: 'custom', label: 'Custom Goal' }
]

export const MEASUREMENT_FIELDS: { key: string; label: string; unit: string; step: string }[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', step: '0.1' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', step: '0.1' },
  { key: 'muscle', label: 'Muscle Mass', unit: 'kg', step: '0.1' },
  { key: 'waist', label: 'Waist', unit: 'cm', step: '0.5' },
  { key: 'chest', label: 'Chest', unit: 'cm', step: '0.5' },
  { key: 'arms', label: 'Arms', unit: 'cm', step: '0.5' },
  { key: 'legs', label: 'Legs', unit: 'cm', step: '0.5' }
]