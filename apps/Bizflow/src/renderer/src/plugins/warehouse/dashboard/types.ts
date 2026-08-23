export interface LocationMetric {
  id: string
  name: string
  code?: string
  utilization: number
  value: number
  qty: number
  hasLowStock?: boolean
}

export interface StockRawItem {
  id?: string
  productName?: string
  name?: string
  sku?: string
  quantity?: number
  qty?: number
  unitCost?: number
  cost?: number
  capacity?: number
  locationId?: string
  locationName?: string
  location?: { name?: string; code?: string }
}

export interface CriticalRawItem {
  id: string
  productName?: string
  name?: string
  sku?: string
  quantity?: number
  qty?: number
  minQuantity?: number
  minThreshold?: number
  locationName?: string
  location?: { name?: string; code?: string }
}

export interface TransferRawItem {
  id: string
  fromLocationId?: string
  toLocationId?: string
  fromLocationName?: string
  toLocationName?: string
  from?: string
  to?: string
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled' | string
  quantity?: number
  createdAt?: string
  transferDate?: string
  date?: string
}

export interface WarehouseRawData {
  locations: Array<{ id: string; name: string; code: string; hasLowStock?: boolean }>
  todayTransfers: TransferRawItem[]
  weekTransfers: TransferRawItem[]
  stockItems: StockRawItem[]
  criticalItems: CriticalRawItem[]
}

export interface DailyBucketPoint {
  [key: string]: any
  label: string
  count: number
  v?: number
}

export interface DashboardKPIData {
  totalLocations: number
  lowStockLocations: number
  stockValue: number
  totalSKUs: number
  utilizationPct: number
  totalCapacity: number
  totalUnits: number
  todayTransfersCount: number
  pendingTransfersCount: number
  criticalItemsCount: number
}