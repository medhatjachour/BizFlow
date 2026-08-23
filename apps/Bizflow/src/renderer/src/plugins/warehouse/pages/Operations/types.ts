export type OrderType = 'inbound' | 'outbound'
export type Stage = 'created' | 'receiving' | 'qc' | 'putaway' | 'picking' | 'packing' | 'shipping' | 'done'
export type ViewMode = 'control' | 'receiving' | 'outbound' | 'activity'
export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface LocationItem {
  id: string
  name: string
  code: string
}

export interface WarehouseOrderLine {
  id?: string
  productName: string
  sku?: string | null
  requestedQty: number
  processedQty?: number
  unit: string
}

export interface WarehouseOrder {
  id: string
  orderNumber: string
  orderType: OrderType
  status: string
  workflowStage?: Stage | null
  sourceRef?: string | null
  partnerName?: string | null
  locationId?: string | null
  priority?: OrderPriority | string
  createdBy?: string | null
  processedBy?: string | null
  createdAt: string
  lines: WarehouseOrderLine[]
}

export interface Movement {
  id: string
  movementType: string
  productName: string
  quantity: number
  unit: string
  actedBy?: string | null
  createdAt: string
  location?: { name: string; code: string }
}

export interface AuditLog {
  id: string
  entityType: string
  action: string
  actor?: string | null
  details?: string | null
  createdAt: string
}

export interface JourneyBoard {
  activeOrders: number
  receiving: number
  qc: number
  putaway: number
  picking: number
  packing: number
  shipping: number
}

export interface CreateOrderFormLine {
  productName: string
  sku: string
  requestedQty: string
  unit: string
}

export interface CreateOrderFormData {
  orderType: OrderType
  sourceRef: string
  partnerName: string
  locationId: string
  createdBy: string
  priority: OrderPriority
  lines: CreateOrderFormLine[]
}