/**
 * Inventory Page Types
 * Page-specific types that extend shared types
 */

import type {
  SortDirection,
  StockStatus,
} from '@/shared/types'



// Page-specific types
export interface InventoryFilters {
  search: string
  categories: string[]
  stockStatus: StockStatus[]
  storeId?: string
  priceRange: { min: number; max: number }
  stockRange: { min: number; max: number }
}

export type SortField = 'name' | 'baseSKU' | 'category' | 'totalStock' | 'basePrice' | 'stockValue' | 'updatedAt'

export interface InventorySortOptions {
  field: SortField
  direction: SortDirection
}
