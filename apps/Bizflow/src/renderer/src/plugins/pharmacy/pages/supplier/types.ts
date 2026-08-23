export interface PharmacySupplierItem {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  orderCount?: number
  batchCount?: number
  createdAt?: string
}

export interface SupplierFormData {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

export interface SuppliersMetrics {
  totalSuppliers: number
  activeOrdersCount: number
  totalBatchesSourced: number
  directContactCount: number
}