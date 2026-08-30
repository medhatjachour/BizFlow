export type StoreStatus = 'active' | 'inactive'
export type ViewMode = 'grid' | 'table'
export type StoreSortField = 'name' | 'location' | 'manager' | 'status'

export interface Store {
  id: string
  name: string
  location: string
  phone: string
  hours: string
  manager: string
  status: StoreStatus | string
  registersCount?: number
  activeCashiersCount?: number
  createdAt?: string
}

export interface StoreFormData {
  name: string
  location: string
  phone: string
  hours: string
  manager: string
  status: StoreStatus
}

export interface StoreFilters {
  search: string
  status: 'all' | StoreStatus
  sortBy: StoreSortField
  sortDirection: 'asc' | 'desc'
}

export interface StoreMetrics {
  totalStores: number
  activeStores: number
  inactiveStores: number
  totalManagers: number
}