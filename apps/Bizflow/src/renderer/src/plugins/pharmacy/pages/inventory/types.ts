export type ExpiryWindowDays = 7 | 30 | 60 | 90 | 180

export interface InventoryStats {
  stockValue: number
  retailValue: number
  expiredBatches: number
  expiredValue: number
  expiringSoon: number
  expiringValue: number
  lowStock: number
  outOfStock: number
}

export interface ExpiringBatchItem {
  id: string
  batchNumber?: string
  quantity: number
  costPerUnit: number
  sellingPrice?: number
  expiryDate: string
  daysToExpiry: number
  isExpired: boolean
  value: number
  retailValue?: number
  product?: {
    id: string
    name: string
    genericName?: string
    unit: string
    category?: string
    barcode?: string
  }
  supplier?: {
    id: string
    name: string
  }
}

export type DisposalReason =
  | 'Expired'
  | 'Damaged / Broken'
  | 'Manufacturer Recall'
  | 'Storage Temperature Violation'
  | 'Other'