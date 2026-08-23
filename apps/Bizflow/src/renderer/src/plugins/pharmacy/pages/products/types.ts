export type StockFilterType = 'all' | 'low' | 'out' | 'expiring' | 'expired'

export interface ProductBatch {
  id: string
  productId: string
  batchNumber?: string
  quantity: number
  initialQty?: number
  costPerUnit: number
  sellingPrice?: number | null
  expiryDate: string
  status: 'active' | 'depleted' | 'disposed' | 'expired'
  supplierId?: string
  supplier?: { id: string; name: string }
}

export interface PharmacyProductItem {
  id: string
  name: string
  genericName?: string
  category: string
  unit: string
  subUnit?: string | null
  subUnitsPerContainer?: number | null
  subUnitPrice?: number | null
  barcode?: string
  sellingPrice: number
  minimumStock: number
  description?: string
  isActive: boolean
  totalStock: number
  stockValue: number
  nearestExpiry?: string | null
  isLowStock?: boolean
  isOutOfStock?: boolean
  hasExpired?: boolean
  salesCount?: number
}

export interface ProductFormData {
  name: string
  genericName: string
  category: string
  unit: string
  subUnit: string
  subUnitsPerContainer: string
  subUnitPrice: string
  barcode: string
  sellingPrice: string
  minimumStock: string
  description: string
  isActive: boolean
}

export interface ProductStats {
  currentStock: number
  stockValue: number
  soldUnits: number
  saleCount: number
  revenue: number
  profit: number
  margin: number
  activeBatches: number
  batchCount: number
}

export interface ProductHistoryEvent {
  type: 'received' | 'sold' | 'disposed' | 'edited'
  action?: string
  date: string
  qty?: number
  value?: number
  userName?: string
  batchNumber?: string
  saleNumber?: string
  customer?: string
  reason?: string
  note?: string
  changes?: { label: string; from: any; to: any }[]
}

export interface ProductDetailData {
  product: PharmacyProductItem
  stats: ProductStats
  events: ProductHistoryEvent[]
  batches: ProductBatch[]
}

export interface ProductsMetrics {
  totalSkus: number
  totalValue: number
  lowStockCount: number
  expiringCount: number
}