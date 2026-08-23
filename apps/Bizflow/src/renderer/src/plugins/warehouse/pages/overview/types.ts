export type Tab = 'overview' | 'operations' | 'locations' | 'inventory' | 'transfers'

export type TransferStatus = 'draft' | 'in_transit' | 'completed' | 'cancelled'

export interface LocationRef {
  name: string
  code: string
}

export interface RecentTransfer {
  id: string
  fromLocation: LocationRef
  toLocation: LocationRef
  status: TransferStatus | string
  transferDate: string
  _count?: {
    items: number
  }
}

export interface RecentMovement {
  id: string
  movementType: string
  productName: string
  quantity: number
  unit: string
  actedBy?: string | null
  createdAt?: string
  location?: LocationRef
}

export interface OverviewData {
  totalLocations: number
  totalSKUs: number
  lowStockCount: number
  pendingTransfers: number
  activeOrders: number
  inboundPending: number
  outboundPending: number
  recentTransfers: RecentTransfer[]
  recentMovements?: RecentMovement[]
}

export type StatColor = 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate'

export interface StatItemConfig {
  id: string
  labelKey: string
  hintKey: string
  value: number
  targetTab: Tab
  icon: React.ComponentType<{ className?: string }>
  color: StatColor
  badge?: string
}