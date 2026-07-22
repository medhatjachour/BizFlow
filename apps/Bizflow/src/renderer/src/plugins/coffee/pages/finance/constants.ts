import {
  Banknote, CreditCard, Smartphone,
  UtensilsCrossed, Package, Truck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Preset, OrderTypeFilter, PaymentFilter, Filters } from './types'

// ── Presets ─────────────────────────────────────────────────────────────────
export const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all',   label: 'All Time' },
]

// ── Pagination ──────────────────────────────────────────────────────────────
export const PAGE_SIZE = 25

// ── Payment methods ─────────────────────────────────────────────────────────
export interface PaymentMethodMeta {
  value: PaymentFilter
  label: string
  icon: LucideIcon
  color: string
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { value: 'cash',          label: 'Cash',          icon: Banknote,   color: '#16a34a' },
  { value: 'card',          label: 'Card',          icon: CreditCard, color: '#7c3aed' },
  { value: 'vodafone_cash', label: 'Vodafone Cash', icon: Smartphone, color: '#ea580c' },
]

export function payMeta(value: string): {
  value: string
  label: string
  icon: LucideIcon
  color: string
} {
  const found = PAYMENT_METHODS.find(p => p.value === value)
  if (found) return found
  return {
    value,
    label: value.replace('_', ' '),
    icon: Banknote,
    color: '#64748b',
  }
}

// ── Order types ─────────────────────────────────────────────────────────────
export interface OrderTypeMeta {
  value: OrderTypeFilter
  label: string
  icon: LucideIcon
  color: string
}

export const ORDER_TYPES: OrderTypeMeta[] = [
  { value: 'dine_in',  label: 'Dine In',  icon: UtensilsCrossed, color: '#7c3aed' },
  { value: 'takeaway', label: 'Takeaway', icon: Package,         color: '#0891b2' },
  { value: 'delivery', label: 'Delivery', icon: Truck,           color: '#ea580c' },
]

export function orderTypeMeta(value: string): {
  value: string
  label: string
  icon: LucideIcon
  color: string
} {
  const found = ORDER_TYPES.find(t => t.value === value)
  if (found) return found
  return {
    value,
    label: value.replace('_', ' '),
    icon: Package,
    color: '#64748b',
  }
}

// ── Empty filters ───────────────────────────────────────────────────────────
export const EMPTY_FILTERS: Filters = {
  preset: 'month',
  from: '',
  to: '',
  paymentMethod: 'all',
  type: 'all',
  search: '',
  page: 1,
}
// ── Preset → date range helper ──────────────────────────────────────────────
export function applyPreset(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const to   = now.toISOString().slice(0, 10) // today (YYYY-MM-DD)

  let from: string

  switch (preset) {
    case 'today': {
      from = to
      break
    }
    case 'week': {
      const start = new Date(now)
      const day = start.getDay() // 0 = Sun
      const diff = (day === 0 ? 6 : day - 1) // make Monday the start
      start.setDate(start.getDate() - diff)
      from = start.toISOString().slice(0, 10)
      break
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      from = start.toISOString().slice(0, 10)
      break
    }
    case 'all':
    default: {
      from = '' // no lower bound
      break
    }
  }

  return { from, to }
}