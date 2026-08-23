import { SegOption } from '../components/ui'

export const PO_PAGE_SIZE = 20

export const PO_STATUS_OPTIONS: SegOption[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'draft', label: 'Draft', tone: 'slate' },
  { value: 'ordered', label: 'Ordered', tone: 'amber' },
  { value: 'received', label: 'Received', tone: 'emerald' },
]