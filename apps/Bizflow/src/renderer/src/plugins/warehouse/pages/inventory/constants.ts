import { StockFilterMode, StockUpsertFormData } from './types'

export const FILTER_MODES: Array<{ id: StockFilterMode; label: string; badgeColor?: string }> = [
  { id: 'all', label: 'All Inventory' },
  { id: 'low_stock', label: 'Low Stock Risk', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { id: 'out_of_stock', label: 'Out of Stock', badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { id: 'quarantine', label: 'Quarantine / Damaged', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' }
]

export const ITEM_TYPES = [
  { value: 'finished_goods', label: 'Finished Goods' },
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'spare_parts', label: 'Spare Parts' }
]

export const DEFAULT_UPSERT_FORM: StockUpsertFormData = {
  locationId: '',
  productName: '',
  sku: '',
  barcode: '',
  quantity: '1',
  unit: 'pcs',
  minQuantity: '5',
  itemType: 'finished_goods',
  lotNumber: '',
  batchNumber: '',
  serialNumber: '',
  expiryDate: '',
  binCode: '',
  aisleCode: '',
  shelfCode: '',
  isQuarantine: false,
  isDamaged: false,
  notes: ''
}