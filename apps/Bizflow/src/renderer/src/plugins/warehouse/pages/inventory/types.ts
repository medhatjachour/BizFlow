export type StockFilterMode = 'all' | 'low_stock' | 'out_of_stock' | 'quarantine'
export type ViewLayout = 'table' | 'grid'
export type SortOption = 'risk' | 'name' | 'qty_desc' | 'qty_asc' | 'expiry'

export interface LocationRef {
  id: string
  name: string
  code: string
  type?: string
  parentId?: string | null
}

export interface StockEntry {
  id: string
  locationId: string
  productName: string
  productId?: string | null
  sku?: string | null
  barcode?: string | null
  quantity: number
  unit: string
  minQuantity: number
  itemType?: string | null
  lotNumber?: string | null
  batchNumber?: string | null
  serialNumber?: string | null
  expiryDate?: string | null
  binCode?: string | null
  aisleCode?: string | null
  shelfCode?: string | null
  palletCode?: string | null
  isQuarantine?: boolean
  isDamaged?: boolean
  notes?: string | null
  location?: LocationRef
}

export interface StockUpsertFormData {
  locationId: string
  productName: string
  sku: string
  barcode: string
  quantity: string
  unit: string
  minQuantity: string
  itemType: string
  lotNumber: string
  batchNumber: string
  serialNumber: string
  expiryDate: string
  binCode: string
  aisleCode: string
  shelfCode: string
  isQuarantine: boolean
  isDamaged: boolean
  notes: string
}

export interface StockSummary {
  totalSKUs: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
  quarantineCount: number
  healthRate: number
}