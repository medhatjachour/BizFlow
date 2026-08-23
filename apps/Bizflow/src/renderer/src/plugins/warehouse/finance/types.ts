export type FinanceTabType = 'overview' | 'valuation' | 'critical'

export interface LocationQtyMetric {
  [key: string]: any // Required by Recharts ChartDataInput
  name: string
  code?: string
  quantity: number
  percentage: number
  skuCount: number
  estimatedValue?: number
}

export interface FinanceStockItem {
  id: string
  locationId: string
  productName: string
  sku?: string | null
  quantity: number
  unit: string
  minQuantity: number
  unitCost?: number
  product?: {
    name?: string
    baseCost?: number
  }
  location?: {
    id?: string
    name: string
    code?: string
  }
}

export interface FinanceOverviewData {
  totalLocations: number
  totalSKUs: number
  lowStockCount: number
  pendingTransfers: number
}

export interface CriticalImpactItem {
  id: string
  productName: string
  sku?: string | null
  quantity: number
  minQuantity: number
  unit: string
  locationName: string
  deficitQty: number
  estimatedReplenishmentCost?: number
}