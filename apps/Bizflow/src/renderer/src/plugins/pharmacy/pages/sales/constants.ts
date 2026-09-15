import { SegOption } from '../components/ui'

export const SALES_PAGE_SIZE = 20

export const PAYMENT_STATUS_OPTIONS: SegOption[] = [
  { value: 'all', labelKey: 'phAllPayments' },
  { value: 'paid', labelKey: 'salesUiPaid', tone: 'emerald' },
  { value: 'partial', labelKey: 'partialPayment', tone: 'amber' },
  { value: 'unpaid', labelKey: 'unpaidPayment', tone: 'red' },
]

export const SALE_STATUS_OPTIONS: SegOption[] = [
  { value: 'all', labelKey: 'allStatus' },
  { value: 'completed', labelKey: 'bakeryStatusCompleted', tone: 'emerald' },
  { value: 'refunded', labelKey: 'phSaRefunded', tone: 'slate' },
]