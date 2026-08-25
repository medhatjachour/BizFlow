export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'billing'
export type TableShape = 'square' | 'circle' | 'rectangle'

export interface TableItemOrder {
  id: string
  orderNumber?: number
  guestCount: number
  serverName?: string | null
  subtotal: number
  total: number
  status: string
  openedAt: string
  items: Array<{
    id: string
    itemName: string
    quantity: number
    unitPrice: number
    status: string
  }>
}

export interface TableReservationBrief {
  id: string
  customerName: string
  customerPhone?: string | null
  partySize: number
  date: string
  notes?: string | null
  guestTags?: string | null
  status: string
}

export interface RestaurantTableData {
  id: string
  number: number
  name?: string | null
  capacity: number
  status: TableStatus
  section: string
  posX: number
  posY: number
  shape: TableShape
  isActive: boolean
  orders?: TableItemOrder[]
  reservations?: TableReservationBrief[]
  _count?: {
    orders: number
    reservations: number
  }
}

export interface TableFormData {
  number: string
  name: string
  capacity: string
  section: string
  shape: TableShape
  status?: TableStatus
}

export interface QuickSeatFormData {
  tableId: string
  guestCount: number
  serverName: string
  notes: string
}

export interface TransferFormData {
  fromTableId: string
  toTableId: string
}

export interface MergeFormData {
  sourceTableId: string
  targetTableId: string
}