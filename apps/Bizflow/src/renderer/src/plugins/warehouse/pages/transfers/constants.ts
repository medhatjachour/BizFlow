import { TransferStatus } from './types'

export const TRANSFER_STATUS_STEPS: TransferStatus[] = ['draft', 'in_transit', 'completed']

export const STATUS_CONFIG: Record<
  string,
  {
    badge: string
    border: string
    dot: string
    label: string
    description: string
  }
> = {
  draft: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    label: 'Draft Staging',
    description: 'Manifest being prepared; inventory remains allocated at origin.'
  },
  in_transit: {
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40',
    border: 'border-sky-300 dark:border-sky-800',
    dot: 'bg-sky-500 animate-pulse',
    label: 'In Transit',
    description: 'Dispatched from origin; actively en route to destination facility.'
  },
  completed: {
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    border: 'border-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    label: 'Completed & Received',
    description: 'Received at destination; physical inventory balances updated.'
  },
  cancelled: {
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40',
    border: 'border-rose-300 dark:border-rose-800',
    dot: 'bg-rose-500',
    label: 'Cancelled',
    description: 'Transfer aborted; no inventory reconciled.'
  }
}

export const DEFAULT_CREATE_FORM: {
  fromLocationId: string
  toLocationId: string
  notes: string
  items: Array<{ productName: string; sku: string; quantity: string; unit: string; notes: string }>
} = {
  fromLocationId: '',
  toLocationId: '',
  notes: '',
  items: [{ productName: '', sku: '', quantity: '1', unit: 'pcs', notes: '' }]
}