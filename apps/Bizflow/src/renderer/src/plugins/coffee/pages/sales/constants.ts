import {
  Banknote, CreditCard, Smartphone,
  UtensilsCrossed, Package, Truck,
  TrendingUp, Receipt, ShoppingBag, Coins,
  Clock, Users, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PaymentMethod, OrderType } from './types'

export const PAGE_SIZE = 20

export const PAYMENT_METHODS = [
  { value: 'all', label: 'All Payments', icon: Receipt },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'vodafone_cash', label: 'Vodafone Cash', icon: Smartphone }
] as const

export const ORDER_TYPES = [
  { value: 'all', label: 'All Types', icon: Receipt },
  { value: 'dine_in', label: 'Dine In', icon: UtensilsCrossed },
  { value: 'takeaway', label: 'Takeaway', icon: Package },
  { value: 'delivery', label: 'Delivery', icon: Truck }
] as const

export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'total_desc', label: 'Highest Total' },
  { value: 'total_asc', label: 'Lowest Total' },
  { value: 'items_desc', label: 'Most Items' }
] as const

export const PAYMENT_ICON: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  vodafone_cash: Smartphone
}

export const TYPE_ICON: Record<OrderType, LucideIcon> = {
  dine_in: UtensilsCrossed,
  takeaway: Package,
  delivery: Truck
}

export const SUMMARY_CARD_CONFIG = [
  {
    key: 'revenue',
    label: 'Total Revenue',
    icon: TrendingUp,
    color: 'emerald',
    getValue: (s: any) => s?.totalRevenue?.toFixed(2) ?? '0.00',
    trend: true
  },
  {
    key: 'orders',
    label: 'Total Orders',
    icon: Receipt,
    color: 'amber',
    getValue: (s: any) => String(s?.totalOrders ?? 0)
  },
  {
    key: 'avg',
    label: 'Avg. Order Value',
    icon: ShoppingBag,
    color: 'teal',
    getValue: (s: any) => s?.avgOrderValue?.toFixed(2) ?? '0.00'
  },
  {
    key: 'items',
    label: 'Items Sold',
    icon: Package,
    color: 'violet',
    getValue: (s: any) => String(s?.totalItems ?? 0)
  }
] as const

export const PAYMENT_BREAKDOWN_CONFIG = [
  { key: 'cash', label: 'Cash', icon: Banknote, color: 'amber', field: 'cash' },
  { key: 'card', label: 'Card', icon: CreditCard, color: 'blue', field: 'card' },
  { key: 'vodafone', label: 'Vodafone', icon: Smartphone, color: 'rose', field: 'vodafoneCash' }
] as const

export const ORDER_TYPE_CONFIG = [
  { key: 'dineIn', label: 'Dine In', icon: UtensilsCrossed, color: 'emerald', field: 'dineIn' },
  { key: 'takeaway', label: 'Takeaway', icon: Package, color: 'amber', field: 'takeaway' },
  { key: 'delivery', label: 'Delivery', icon: Truck, color: 'violet', field: 'delivery' }
] as const

export const COLOR_STYLES: Record<string, any> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', gradient: 'from-emerald-500 to-teal-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', gradient: 'from-amber-500 to-orange-500' },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-500/20', gradient: 'from-teal-500 to-cyan-500' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', gradient: 'from-violet-500 to-purple-500' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', gradient: 'from-blue-500 to-indigo-500' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20', gradient: 'from-rose-500 to-pink-500' },
  green:   { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-500/20', gradient: 'from-green-500 to-emerald-500' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', gradient: 'from-slate-500 to-gray-500' }
}
