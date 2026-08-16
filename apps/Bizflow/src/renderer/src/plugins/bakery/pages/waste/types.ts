import React from 'react'

export type WasteType = 'ingredient' | 'finished_product' | 'production_batch' | 'other'

export interface Recipe {
  id: string
  name: string
  outputProductId?: string | null
  outputProduct?: { id: string; name: string } | null
}

export interface PantryItem {
  id: string
  name: string
  unit: string
  currentStock: number
  costPerUnit?: number | null
}

export interface WasteLog {
  id: string
  wasteType: WasteType | string
  itemName: string
  quantity: number
  unit: string
  cost: number
  reason: string | null
  wasteDate: string
  notes: string | null
  recipe?: { id: string; name: string } | null
  product?: { id: string; name: string } | null
  pantryIngredient?: { id: string; name: string; unit: string } | null
}

export interface WasteSummaryItem {
  reason?: string | null
  wasteType?: string
  _sum: {
    cost: number | null
    quantity: number | null
  }
  _count: number
}

export interface WasteSummary {
  totalCost: number
  totalQuantity: number
  totalEntries: number
  byReason: WasteSummaryItem[]
  byWasteType: WasteSummaryItem[]
}

export interface WasteTypeMeta {
  value: WasteType
  labelKey: string
  defaultLabel: string
  descKey: string
  defaultDesc: string
  icon: React.ElementType
  color: string
  badge: string
  barColor: string
}

export interface WasteFormData {
  wasteType: WasteType
  pantryIngredientId: string
  recipeId: string
  productId: string
  itemName: string
  quantity: string
  unit: string
  cost: string // Represents unit cost
  reason: string
  wasteDate: string
  notes: string
}