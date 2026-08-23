export type ReportType = 'stock' | 'transfers' | 'critical' | 'valuation'

export interface LocationReportRef {
  id: string
  name: string
  code: string
}

export interface StockReportItem {
  id: string
  locationId: string
  productName: string
  sku?: string | null
  quantity: number
  unitCost?: number
  product?: {
    name?: string
    baseCost?: number
  }
}

export interface CriticalReportItem {
  id: string
  productName: string
  quantity: number
  minQuantity: number
  product?: {
    name?: string
  }
  location?: {
    name?: string
  }
}

export interface TransferReportItem {
  id: string
  fromLocationId: string
  toLocationId: string
  status: string
  createdAt: string
  fromLocation?: { name: string }
  toLocation?: { name: string }
  items?: Array<{ productName: string; quantity: number }>
}

export interface WarehouseReportData {
  locations: LocationReportRef[]
  todayTransfers: TransferReportItem[]
  allStockItems: StockReportItem[]
  criticalItems: CriticalReportItem[]
}

export interface LocationValueChartItem {
  name: string
  value: number
}