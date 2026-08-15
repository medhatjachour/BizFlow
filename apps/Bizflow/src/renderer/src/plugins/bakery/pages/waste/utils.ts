import { WASTE_TYPES } from './constants'
import { WasteTypeMeta } from './types'

export function getWasteTypeMeta(type: string): WasteTypeMeta {
  return WASTE_TYPES.find(t => t.value === type) ?? WASTE_TYPES[3]
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatQuantity(quantity: number, unit?: string): string {
  const formattedQty = Number(quantity).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })
  return unit ? `${formattedQty} ${unit}` : formattedQty
}