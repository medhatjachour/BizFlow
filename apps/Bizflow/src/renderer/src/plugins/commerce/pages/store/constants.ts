import type { StoreFormData } from './types'

export const DEFAULT_STORE_FORM: StoreFormData = {
  name: '',
  location: '',
  phone: '',
  hours: '',
  manager: '',
  status: 'active',
}

export const STORE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const