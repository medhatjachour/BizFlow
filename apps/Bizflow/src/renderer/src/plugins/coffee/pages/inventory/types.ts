export interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

export interface Product {
  id: string
  name: string
  stock: number
  reorderPoint: number
  price: number
  cost: number
  isAvailable: boolean
  categoryId?: string
  category?: Category
  image?: string
  unit: string        // ← ADDED THIS
}

export interface StockMovement {
  id: string
  type: string
  quantity: number
  previousStock: number
  newStock: number
  reason?: string
  notes?: string
  createdAt: string
}

export type FilterMode = 'all' | 'low' | 'out'

export type AdjustType = 'restock' | 'adjustment' | 'waste' | 'write_off'

export interface AdjustForm {
  type: AdjustType
  quantity: string
  reason: string
}

export interface CategoryGroup {
  category: Category | null
  products: Product[]
  totalUnits: number
  totalValue: number
  expRevenue: number
}
