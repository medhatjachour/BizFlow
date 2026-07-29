import type { Store } from './types'
import { STORE_STATUS } from './constants'

export function isStoreActive(store: Store): boolean {
  return store.status === STORE_STATUS.ACTIVE
}

export function getToggledStatus(store: Store): string {
  return isStoreActive(store) ? STORE_STATUS.INACTIVE : STORE_STATUS.ACTIVE
}

export function getStatusBadgeClass(status: string): string {
  return status === STORE_STATUS.ACTIVE
    ? 'bg-success/10 text-success'
    : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
}