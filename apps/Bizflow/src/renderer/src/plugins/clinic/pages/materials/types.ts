export interface Material {
  id: string
  name: string
  category?: string | null
  description?: string | null
  unit: string
  quantity: number
  minQuantity: number
  costPerUnit: number
  supplier?: string | null
  expiryDate?: string | null
  isActive: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  sortOrder?: number
}

export interface Batch {
  id: string
  materialId: string
  batchNumber?: string | null
  quantity: number
  expiryDate?: string | null
  receivedAt: string
  costPerUnit?: number | null
  supplier?: string | null
  notes?: string | null
  isActive: boolean
}

export interface MaterialStats {
  total: number
  lowStock: number
  expired: number
  expiringSoon: number
}

export type StockFilter = 'all' | 'in_stock' | 'out_of_stock' | 'low_stock'
export type ExpiryFilter = 'all' | 'expired' | 'expiring_soon' | 'valid' | 'no_expiry'
export type SortField = 'name' | 'quantity' | 'expiryDate' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'
export type ExpiryState = 'expired' | 'soon' | 'ok' | 'none'

export interface MaterialFormData {
  name: string
  category: string
  description: string
  unit: string
  quantity: string
  minQuantity: string
  costPerUnit: string
  supplier: string
  notes: string
  isActive: boolean
}

export interface BatchFormData {
  batchNumber: string
  quantity: string
  expiryDate: string
  costPerUnit: string
  supplier: string
  notes: string
  isActive: boolean
}