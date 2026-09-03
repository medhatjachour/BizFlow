
import type { POStatus, StatusStyleConfig } from './types'

export const PO_STATUS_CONFIG: Record<POStatus, StatusStyleConfig> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700',
    iconClass: 'text-slate-500 dark:text-slate-400',
    dotClass: 'bg-slate-400'
  },
  ordered: {
    label: 'Ordered',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    iconClass: 'text-blue-500 dark:text-blue-400',
    dotClass: 'bg-blue-500 animate-pulse'
  },
  received: {
    label: 'Received',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    iconClass: 'text-emerald-500 dark:text-emerald-400',
    dotClass: 'bg-emerald-500'
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    iconClass: 'text-rose-500 dark:text-rose-400',
    dotClass: 'bg-rose-500'
  }
}

export const INITIAL_SUPPLIER_FORM = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  paymentTerms: '',
  notes: ''
}

export const INITIAL_PO_FORM = {
  supplierId: '',
  expectedDate: '',
  taxAmount: 0,
  shippingCost: 0,
  notes: '',
  items: []
}