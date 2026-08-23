export type LocationType = 'zone' | 'aisle' | 'shelf' | 'bin' | string

export interface LocationParentRef {
  id: string
  name: string
  code: string
}

export interface LocationCountRef {
  stockEntries: number
  children: number
}

export interface LocationItem {
  id: string
  name: string
  code: string
  type: LocationType
  parentId: string | null
  isActive: boolean
  notes?: string | null
  parent?: LocationParentRef | null
  _count?: LocationCountRef
  children?: LocationItem[]
}

export interface LocationFormData {
  name: string
  code: string
  type: LocationType
  parentId: string
  notes?: string
}

export interface LocationProfileData {
  location: LocationItem
  stocks: Array<{
    id: string
    productName: string
    sku?: string | null
    quantity: number
    unit: string
    minQuantity?: number
    lotNumber?: string | null
    batchNumber?: string | null
    serialNumber?: string | null
    binCode?: string | null
    isQuarantine?: boolean
    isDamaged?: boolean
  }>
  movements: Array<{
    id: string
    movementType: string
    productName: string
    quantity: number
    unit: string
    actedBy?: string | null
    createdAt: string
    notes?: string | null
  }>
  orders: Array<{
    id: string
    orderNumber: string
    orderType: string
    status: string
    workflowStage?: string | null
    partnerName?: string | null
    createdAt: string
    lines: Array<{ productName: string; requestedQty: number; unit: string }>
  }>
  children: LocationItem[]
}