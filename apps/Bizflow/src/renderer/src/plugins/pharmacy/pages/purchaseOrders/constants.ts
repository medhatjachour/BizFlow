import { SegOption } from '../components/ui'

export const PO_PAGE_SIZE = 20

export const PO_STATUS_OPTIONS: SegOption[] = [
  { value: 'all', labelKey: 'phPoAllOrders' },
  { value: 'draft', labelKey: 'draft', tone: 'slate' },
  { value: 'ordered', labelKey: 'ordered', tone: 'amber' },
  { value: 'received', labelKey: 'received', tone: 'emerald' },
]