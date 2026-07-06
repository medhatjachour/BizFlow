// Shared domain types for the clinic Materials tab and its modals.

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
  sortOrder: number
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

export interface FormModalProps {
  existing?: Material | null
  onClose: () => void
  onSaved: () => void
}

export interface BatchFormValues {
  batchNumber: string
  quantity: string
  expiryDate: string
  costPerUnit: string
  supplier: string
  notes: string
  isActive: boolean
}
