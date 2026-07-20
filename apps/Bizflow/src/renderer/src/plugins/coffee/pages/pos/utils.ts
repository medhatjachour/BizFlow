import type { OrderType, PaymentMethod } from './type'
import { UtensilsCrossed, Package, Truck, Banknote, CreditCard, Smartphone } from 'lucide-react'
export const ORDER_TYPES: { value: OrderType; label: string; icon: typeof UtensilsCrossed }[] = [
  { value: 'dine_in',  label: 'Dine In',  icon: UtensilsCrossed },
  { value: 'takeaway', label: 'Takeaway',  icon: Package },
  { value: 'delivery', label: 'Delivery',  icon: Truck }
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'cash',          label: 'Cash',          icon: Banknote   },
  { value: 'card',          label: 'Card',           icon: CreditCard },
  { value: 'vodafone_cash', label: 'Vodafone Cash',  icon: Smartphone }
]

export const CAT_COLORS: Record<string, string> = {
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  green:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}
export const catCls = (c?: string) => CAT_COLORS[c ?? 'default'] ?? CAT_COLORS.default
