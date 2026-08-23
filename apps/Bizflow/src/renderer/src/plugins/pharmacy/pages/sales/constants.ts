import { SegOption } from '../components/ui'

export const SALES_PAGE_SIZE = 20

export const PAYMENT_STATUS_OPTIONS: SegOption[] = [
  { value: 'all', label: 'All Payments' },
  { value: 'paid', label: 'Paid', tone: 'emerald' },
  { value: 'partial', label: 'Partial', tone: 'amber' },
  { value: 'unpaid', label: 'Unpaid', tone: 'red' },
]

export const SALE_STATUS_OPTIONS: SegOption[] = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed', tone: 'emerald' },
  { value: 'refunded', label: 'Refunded', tone: 'slate' },
]