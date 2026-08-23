export type TransferStatus = 'draft' | 'in_transit' | 'completed' | 'cancelled'

export interface LocationRef {
  id: string
  name: string
  code: string
  type?: string
}

export interface TransferItem {
  id?: string
  productName: string
  sku?: string | null
  quantity: number
  unit: string
  notes?: string | null
}

export interface Transfer {
  id: string
  fromLocationId: string
  toLocationId: string
  fromLocation?: LocationRef
  toLocation?: LocationRef
  status: TransferStatus | string
  transferDate: string
  completedAt?: string | null
  completedBy?: string | null
  createdBy?: string | null
  notes?: string | null
  items: TransferItem[]
  _count?: {
    items: number
  }
}

export interface CreateTransferFormLine {
  productName: string
  sku: string
  quantity: string
  unit: string
  notes?: string
}

export interface CreateTransferFormData {
  fromLocationId: string
  toLocationId: string
  notes: string
  items: CreateTransferFormLine[]
}

export interface TransferMetrics {
  total: number
  draft: number
  inTransit: number
  completed: number
  cancelled: number
  totalItemsMoved: number
}