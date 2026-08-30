import type { StoreFormData, StoreStatus } from './types'

export const STORE_STATUS: Record<string, StoreStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const

export const DEFAULT_STORE_FORM: StoreFormData = {
  name: '',
  location: '',
  phone: '',
  hours: '09:00 AM - 10:00 PM',
  manager: '',
  status: 'active'
}

export const STORE_HOURS_PRESETS = [
  '09:00 AM - 10:00 PM',
  '08:00 AM - 12:00 AM',
  '10:00 AM - 11:00 PM',
  '24 / 7 Operating',
  '10:00 AM - 06:00 PM'
]