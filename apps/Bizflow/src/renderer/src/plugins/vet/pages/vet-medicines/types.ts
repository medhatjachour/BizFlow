export interface Medicine {
  id: string
  name: string
  category: string
  unit: string
  subUnit?: string | null
  subUnitsPerContainer?: number | null
  description?: string | null
  minimumStock: number
  totalStock: number
  nearestExpiry: string | null
  hasExpired: boolean
  expiresWithin30Days: boolean
  isLowStock: boolean
  batchCount: number
  activeBatchCount: number
  batches: Batch[]
}

export interface Batch {
  id: string
  batchNumber?: string | null
  supplier?: string | null
  expiryDate: string
  quantity: number
  initialQty: number
  costPerUnit: number
  sellingPrice?: number | null
  receivedDate: string
  notes?: string | null
  status?: string
  disposedAt?: string | null
}

export interface CategoryItem {
  id: string
  name: string
  color?: string
  isDefault?: boolean
}

export interface UnitItem {
  id: string
  name: string
  isDefault?: boolean
}

export interface HistoryAuditChange {
  field: string
  label: string
  from: any
  to: any
}

export interface HistoryEvent {
  id: string
  type: 'received' | 'sold' | 'disposed' | 'edited'
  date: string
  batchNumber?: string | null
  quantity: number
  unit: string
  subUnit?: string | null
  saleUnit?: string
  costPerUnit?: number
  totalCost?: number
  totalPrice?: number
  unitPrice?: number
  discount?: number
  grossProfit?: number
  lossAmount?: number
  supplier?: string | null
  expiryDate?: string
  reason?: string | null
  ownerName?: string | null
  paymentStatus?: string
  notes?: string | null
  action?: string
  userName?: string | null
  note?: string | null
  changes?: HistoryAuditChange[]
}

export interface HistorySummary {
  totalReceived?: number
  salesRevenue?: number
  salesProfit?: number
  disposalLoss?: number
}

export type BatchFilterKey = 'expired' | 'expiring' | 'low_stock' | null
export type SortOption = 'name-asc' | 'name-desc' | 'stock-desc' | 'stock-asc' | 'expiry-asc'