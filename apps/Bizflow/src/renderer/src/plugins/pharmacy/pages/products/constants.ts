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
  { value: 'all', label: 'All Stock' },
  { value: 'low', label: 'Low Stock', tone: 'amber' },
  { value: 'out', label: 'Out of Stock', tone: 'red' },
  { value: 'expiring', label: 'Expiring Soon', tone: 'amber' },
  { value: 'expired', label: 'Expired', tone: 'red' },
]