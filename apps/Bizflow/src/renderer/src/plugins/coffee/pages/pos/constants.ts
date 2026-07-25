import {
  UtensilsCrossed, Package, Truck, Banknote, CreditCard, Smartphone,
} from 'lucide-react'
import type { OrderType, PaymentMethod, CheckoutForm, NewCustomerForm, SelectOption } from './types'

export const ORDER_TYPES: {
  value: OrderType
  label: string
  icon: typeof UtensilsCrossed
  color: string
}[] = [
  { value: 'dine_in',  label: 'Dine In',  icon: UtensilsCrossed, color: '#7c3aed' },
  { value: 'takeaway', label: 'Takeaway', icon: Package,         color: '#0891b2' },
  { value: 'delivery', label: 'Delivery', icon: Truck,           color: '#ea580c' },
]

export const PAYMENT_METHODS: {
  value: PaymentMethod
  label: string
  icon: typeof Banknote
  color: string
}[] = [
  { value: 'cash',          label: 'Cash',          icon: Banknote,   color: '#16a34a' },
  { value: 'card',          label: 'Card',          icon: CreditCard, color: '#7c3aed' },
  { value: 'vodafone_cash', label: 'Vodafone Cash', icon: Smartphone, color: '#ea580c' },
]

export function payMeta(value: string) {
  return PAYMENT_METHODS.find(p => p.value === value) ?? PAYMENT_METHODS[0]
}

export function orderTypeMeta(value: string) {
  return ORDER_TYPES.find(t => t.value === value) ?? ORDER_TYPES[0]
}

// ── Category color classes (for named colors) ──────────────────────────────
const CAT_COLORS: Record<string, string> = {
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  green:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export function catCls(c?: string): string {
  return CAT_COLORS[c ?? 'default'] ?? CAT_COLORS.default
}

// ── Empty forms ─────────────────────────────────────────────────────────────
export const EMPTY_CHECKOUT: CheckoutForm = {
  orderType:       'dine_in',
  selectedTable:   '',
  customerName:    '',
  customerPhone:   '',
  customerAddress: '',
  paymentMethod:   'cash',
  discount:        0,
  notes:           '',
}

export const EMPTY_NEW_CUSTOMER: NewCustomerForm = {
  name:  '',
  phone: '',
  address: '',
}