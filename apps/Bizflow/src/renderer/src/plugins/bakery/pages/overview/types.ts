export type CapFilter = 'all' | 'ready' | 'limited' | 'blocked'
export type ScheduleStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface IngredientBreakdown {
  name: string
  unit: string
  neededPerBatch: number
  inStock: number | null
  canMakeBatches: number | null
  shortfall: number
  linked: boolean
}

export interface CapacityEntry {
  recipeId: string
  recipeName: string
  yieldQty: number
  yieldUnit: string
  availableBatches: number | null
  expectedUnits: number | null
  limitedBy: string | null
  ingredientBreakdown: IngredientBreakdown[]
}

export interface ScheduleItem {
  id: string
  scheduledDate: string
  plannedQuantity: number
  status: ScheduleStatus | string
  recipe: {
    id: string
    name: string
    yieldQty: number
    yieldUnit: string
  }
}

export interface ExpiringBatch {
  id: string
  unitsProduced: number
  expiresAt: string
  recipe: {
    id: string
    name: string
  }
}

export interface PantryItem {
  id: string
  name: string
  currentStock: number
  unit: string
  reorderPoint?: number | null
}

export interface TodayBatch {
  id: string
  recipeName: string
  yieldUnit: string
  quantityProduced: number
  totalCost: number
}

export interface DailyOverviewData {
  scheduled: ScheduleItem[]
  expiringBatches: ExpiringBatch[]
  lowStock: PantryItem[]
  reorderNeeded: PantryItem[]
  capacity: CapacityEntry[]
  todayBatches: TodayBatch[]
  todayRevenue: number
  todayUnitsSold: number
  todayProductionCost: number
}

export interface EODEntry {
  recipeId: string
  recipeName: string
  yieldUnit: string
  unitsProduced: number
  unitsSold: number
  estimatedWaste: number
  batches: string[]
}

export interface PLRow {
  recipeId: string
  recipeName: string
  costPerBatch: number
  totalProductionCost: number
  unitsProduced: number
  totalRevenue: number
  unitsSold: number
  grossProfit: number
  marginPercent: number
  wasteCost?: number
}

export interface PLTotals {
  totalProductionCost: number
  totalRevenue: number
  grossProfit: number
  wasteCost?: number
}

export interface PLData {
  rows: PLRow[]
  totals: PLTotals
}

export interface TrendPoint {
  week: string
  cost: number
  revenue: number
  profit: number
}

export interface TrendSeries {
  recipeId: string
  recipeName: string
  data: TrendPoint[]
}

export interface WasteLogPayload {
  recipeId: string
  itemName: string
  quantity: number
  unit: string
  cost: number
  reason: string
  wasteDate: string
  notes?: string
}