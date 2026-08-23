export type KdsStation = 'All' | 'Kitchen' | 'Grill' | 'Bar' | 'Pastry' | 'Cold Station'
export type KdsItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'voided'
export type KdsUrgency = 'fresh' | 'warning' | 'critical'

export interface KdsItem {
  id: string
  orderId: string
  itemName: string
  quantity: number
  course: string
  notes?: string | null
  modifiers?: string | null
  status: KdsItemStatus
  station: string
  firedAt?: string | null
}

export interface KdsTicket {
  id: string
  orderNumber?: number | null
  tableId: string
  guestCount: number
  serverName?: string | null
  notes?: string | null
  openedAt: string
  table?: {
    id: string
    number: number
    name?: string | null
    section: string
  }
  items: KdsItem[]
}

export interface OverviewMetrics {
  totalTables: number
  available: number
  occupied: number
  reserved: number
  cleaning: number
  billing: number
  todayRevenue: number
  todayGuests: number
  todayReservations: number
  availableMenuItems: number
  activeKdsTickets: number
}