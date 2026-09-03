import type { Store, StoreStatus } from './types'
import { STORE_STATUS } from './constants'

export function isStoreActive(store: Store): boolean {
  return store.status?.toLowerCase() === STORE_STATUS.ACTIVE
}

export function getToggledStatus(store: Store): StoreStatus {
  return isStoreActive(store) ? 'inactive' : 'active'
}

export function getStatusBadgeConfig(status?: string): {
  label: string
  badgeClass: string
  dotClass: string
} {
  const isActive = status?.toLowerCase() === STORE_STATUS.ACTIVE
  if (isActive) {
    return {
      label: 'Active Branch',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      dotClass: 'bg-emerald-500'
    }
  }
  return {
    label: 'Inactive',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400'
  }
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+()\-\s]/g, '')
}