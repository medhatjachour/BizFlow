import {
  Coffee, Milk, Package, Home, Zap, Wrench,
  Megaphone, Users, Truck, MoreHorizontal,
  Banknote, CreditCard, Smartphone, Building2, Wallet,
  Calendar, CalendarDays, CalendarRange, Infinity as InfinityIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'

// ── Categories with metadata ───────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { value: 'beans',      label: 'Beans',      icon: Coffee,         color: '#92400e' },
  { value: 'milk',       label: 'Milk',       icon: Milk,           color: '#0369a1' },
  { value: 'packaging',  label: 'Packaging',  icon: Package,        color: '#7c3aed' },
  { value: 'rent',       label: 'Rent',       icon: Home,           color: '#dc2626' },
  { value: 'utilities',  label: 'Utilities',  icon: Zap,            color: '#ca8a04' },
  { value: 'maintenance',label: 'Maintenance',icon: Wrench,         color: '#0891b2' },
  { value: 'marketing',  label: 'Marketing',  icon: Megaphone,      color: '#db2777' },
  { value: 'wages',      label: 'Wages',      icon: Users,          color: '#16a34a' },
  { value: 'delivery',   label: 'Delivery',   icon: Truck,          color: '#ea580c' },
  { value: 'other',      label: 'Other',      icon: MoreHorizontal, color: '#64748b' },
] as const

// ── Payment methods ────────────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'cash',           label: 'Cash',           icon: Banknote },
  { value: 'card',           label: 'Card',           icon: CreditCard },
  { value: 'vodafone_cash',  label: 'Vodafone Cash',  icon: Smartphone },
  { value: 'bank_transfer',  label: 'Bank Transfer',  icon: Building2 },
  { value: 'other',          label: 'Other',          icon: Wallet },
] as const

// ── Recurrences ────────────────────────────────────────────────────────────
export const RECURRENCES = [
  { value: 'one_time', label: 'One Time', icon: Calendar },
  { value: 'weekly',   label: 'Weekly',   icon: CalendarDays },
  { value: 'monthly',  label: 'Monthly',  icon: CalendarRange },
  { value: 'yearly',   label: 'Yearly',   icon: InfinityIcon },
] as const

// ── Periods ────────────────────────────────────────────────────────────────
export const PERIODS: { value: 'today' | 'week' | 'month' | 'all'; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all',   label: 'All Time' },
]

// ── Lookup helpers ─────────────────────────────────────────────────────────
export function catMeta(value: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
}

export function payMeta(value: string) {
  return PAYMENT_METHODS.find(p => p.value === value) ?? PAYMENT_METHODS[PAYMENT_METHODS.length - 1]
}

export function recMeta(value: string) {
  return RECURRENCES.find(r => r.value === value) ?? RECURRENCES[0]
}

// ── Initial form ───────────────────────────────────────────────────────────
export const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  category: 'other',
  description: '',
  amount: '',
  vendor: '',
  paymentMethod: 'cash',
  recurrence: 'one_time',
  shiftId: '',
  notes: '',
}
