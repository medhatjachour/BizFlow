import { SegOption } from '../components/ui'

export const PRODUCTS_PAGE_SIZE = 24

export const DEFAULT_SELLING_UNITS = [
  'box', 'bottle', 'strip', 'pack', 'tablet', 'capsule',
  'vial', 'ampoule', 'sachet', 'tube', 'piece', 'unit', 'ml', 'g', 'mg', 'kg', 'L'
]

export const DEFAULT_SUBUNITS = [
  'tablet', 'capsule', 'piece', 'strip', 'ml', 'g', 'mg', 'drop', 'dose'
]

export const STOCK_FILTER_OPTIONS: SegOption[] = [
  { value: 'all', labelKey: 'allStock' },
  { value: 'low', labelKey: 'inventoryUiLowStock', tone: 'amber' },
  { value: 'out', labelKey: 'inventoryUiOutOfStock', tone: 'red' },
  { value: 'expiring', labelKey: 'bakeryExpiringSoon', tone: 'amber' },
  { value: 'expired', labelKey: 'salesUiExpired', tone: 'red' },
]