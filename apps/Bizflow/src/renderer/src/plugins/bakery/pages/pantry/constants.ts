import { PantryFilterStatus, PantryFormData } from './types'

export const QUICK_UNITS = [
  'kg',
  'g',
  'L',
  'ml',
  'pcs',
  'bag',
  'box',
  'can',
  'bottle',
  'bunch',
  'tsp',
  'tbsp',
  'cup',
]

export const ADJUST_PRESETS = [1, 5, 10, 25, 50, 100]

export const PANTRY_FILTER_OPTIONS: {
  key: PantryFilterStatus
  labelKey: string
  defaultLabel: string
}[] = [
  { key: 'all', labelKey: 'bakeryPantryFilterAll', defaultLabel: 'All Items' },
  { key: 'low', labelKey: 'bakeryPantryFilterLow', defaultLabel: '⚠️ Low Stock' },
  { key: 'reorder', labelKey: 'bakeryPantryFilterReorder', defaultLabel: '🛒 Needs Reorder' },
  { key: 'healthy', labelKey: 'bakeryPantryFilterHealthy', defaultLabel: '✅ In Stock' },
]

export const EMPTY_PANTRY_FORM: PantryFormData = {
  id: undefined,
  name: '',
  currentStock: 0,
  unit: 'kg',
  costPerUnit: 0,
  lowStockThreshold: '',
  reorderPoint: '',
  reorderQuantity: '',
  supplierName: '',
  notes: '',
}