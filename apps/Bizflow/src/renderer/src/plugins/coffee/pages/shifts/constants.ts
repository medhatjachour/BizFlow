import {
  Banknote, CreditCard, Smartphone, Wallet,
  Coffee, ShoppingBag, Bike, 
} from 'lucide-react'

export const PRESETS: { value: 'today' | 'week' | 'month' | 'all'; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all',   label: 'All Time' },
]

export const PAGE_SIZE = 12

export const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash',          icon: Banknote,    color: '#16a34a' },
  { value: 'card',          label: 'Card',          icon: CreditCard,  color: '#7c3aed' },
  { value: 'vodafone_cash', label: 'Vodafone Cash', icon: Smartphone,  color: '#ea580c' },
] as const

export function payMeta(value: string) {
  return PAYMENT_METHODS.find(p => p.value === value) ?? {
    value,
    label: value.replace('_', ' '),
    icon: Wallet,
    color: '#64748b',
  }
}

export const ORDER_TYPES = [
  { value: 'dine_in',  label: 'Dine In',  icon: Coffee },
  { value: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
  { value: 'delivery', label: 'Delivery', icon: Bike },
] as const

export function orderTypeMeta(value: string) {
  return ORDER_TYPES.find(t => t.value === value) ?? {
    value,
    label: value.replace('_', ' '),
    icon: ShoppingBag,
  }
}

export const QUICK_OPEN_AMOUNTS = [0, 50, 100, 200, 500]

export const EMPTY_OPEN_FORM  = { openingCash: '0',  notes: '' }
export const EMPTY_CLOSE_FORM = { closingCash: '',   notes: '' }
