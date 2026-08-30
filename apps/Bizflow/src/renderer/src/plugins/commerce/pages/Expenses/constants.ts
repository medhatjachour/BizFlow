import {
  Building2,
  Zap,
  Package,
  ShoppingBag,
  Megaphone,
  Wrench,
  CreditCard,
  Briefcase,
  Plane,
  Scale,
  MoreHorizontal,
  Banknote,
  Smartphone,
  CheckCircle2,
  Layers
} from 'lucide-react'
import type { ExpenseCategory, PaymentMethod, RecurrenceType } from './types'

export const EXPENSE_CATEGORIES: {
  id: ExpenseCategory
  nameKey: string
  color: string
  badgeBg: string
  badgeText: string
  icon: React.ElementType
}[] = [
  { id: 'rent', nameKey: 'rentLease', color: 'bg-blue-500', badgeBg: 'bg-blue-50 dark:bg-blue-950/40', badgeText: 'text-blue-700 dark:text-blue-300', icon: Building2 },
  { id: 'utilities', nameKey: 'utilities', color: 'bg-amber-500', badgeBg: 'bg-amber-50 dark:bg-amber-950/40', badgeText: 'text-amber-700 dark:text-amber-300', icon: Zap },
  { id: 'supplies', nameKey: 'officeSupplies', color: 'bg-violet-500', badgeBg: 'bg-violet-50 dark:bg-violet-950/40', badgeText: 'text-violet-700 dark:text-violet-300', icon: Package },
  { id: 'inventory', nameKey: 'inventoryStock', color: 'bg-emerald-500', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40', badgeText: 'text-emerald-700 dark:text-emerald-300', icon: ShoppingBag },
  { id: 'marketing', nameKey: 'marketing', color: 'bg-pink-500', badgeBg: 'bg-pink-50 dark:bg-pink-950/40', badgeText: 'text-pink-700 dark:text-pink-300', icon: Megaphone },
  { id: 'maintenance', nameKey: 'maintenance', color: 'bg-orange-500', badgeBg: 'bg-orange-50 dark:bg-orange-950/40', badgeText: 'text-orange-700 dark:text-orange-300', icon: Wrench },
  { id: 'fees', nameKey: 'feesCharges', color: 'bg-rose-500', badgeBg: 'bg-rose-50 dark:bg-rose-950/40', badgeText: 'text-rose-700 dark:text-rose-300', icon: CreditCard },
  { id: 'insurance', nameKey: 'insurance', color: 'bg-indigo-500', badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40', badgeText: 'text-indigo-700 dark:text-indigo-300', icon: Briefcase },
  { id: 'travel', nameKey: 'travelLogistics', color: 'bg-cyan-500', badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40', badgeText: 'text-cyan-700 dark:text-cyan-300', icon: Plane },
  { id: 'taxes', nameKey: 'taxesDuties', color: 'bg-teal-500', badgeBg: 'bg-teal-50 dark:bg-teal-950/40', badgeText: 'text-teal-700 dark:text-teal-300', icon: Scale },
  { id: 'other', nameKey: 'other', color: 'bg-slate-500', badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-700 dark:text-slate-300', icon: MoreHorizontal },
]

export const PAYMENT_METHODS: { id: PaymentMethod; labelKey: string; icon: React.ElementType }[] = [
  { id: 'cash', labelKey: 'cash', icon: Banknote },
  { id: 'card', labelKey: 'card', icon: CreditCard },
  { id: 'bank_transfer', labelKey: 'bankTransfer', icon: Layers },
  { id: 'digital_wallet', labelKey: 'digitalWallet', icon: Smartphone },
  { id: 'cheque', labelKey: 'cheque', icon: CheckCircle2 },
]

export const RECURRENCE_OPTIONS: { id: RecurrenceType; labelKey: string }[] = [
  { id: 'one_time', labelKey: 'oneTime' },
  { id: 'daily', labelKey: 'daily' },
  { id: 'weekly', labelKey: 'weekly' },
  { id: 'monthly', labelKey: 'monthly' },
  { id: 'yearly', labelKey: 'yearly' },
]

export const EMPTY_EXPENSE_FORM = {
  amount: 0,
  description: '',
  category: 'other' as ExpenseCategory,
  vendor: '',
  paymentMethod: 'cash' as PaymentMethod,
  recurrence: 'one_time' as RecurrenceType,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  referenceNumber: '',
  isTaxDeductible: false,
}