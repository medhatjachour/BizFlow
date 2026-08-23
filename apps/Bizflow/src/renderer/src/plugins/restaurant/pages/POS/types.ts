export type OrderStatus = 'open' | 'billing' | 'paid' | 'voided'
export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'voided'
export type CourseType = 'beverage' | 'starter' | 'main' | 'dessert'
export type OrderType = 'dine_in' | 'takeout' | 'bar'
export type DiscountType = 'percentage' | 'fixed'

export interface ModifierOptionChoice {
  id: string
  name: string
  priceDelta: number
}

export interface ModifierGroupConfig {
  id: string
  title: string
  minSelect: number
  maxSelect: number
  options: ModifierOptionChoice[]
}

export interface PosMenuItem {
  id: string
  name: string
  category: string
  description?: string | null
  price: number
  cost: number
  preparationTime: number
  station: string
  isAvailable: boolean
  displayOrder: number
  colorTag?: string | null
  modifierGroups?: ModifierGroupConfig[]
}

export interface PosOrderItem {
  id: string
  orderId: string
  menuItemId?: string | null
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  course: CourseType
  notes?: string | null
  modifiers?: string | null // JSON string of selected modifiers
  status: ItemStatus
  station: string
  firedAt?: string | null
}

export interface OrderPaymentRecord {
  id: string
  amount: number
  paymentMethod: string
  reference?: string | null
  createdAt: string
}

export interface PosOrder {
  id: string
  orderNumber?: number | null
  tableId: string
  orderType: OrderType
  status: OrderStatus
  guestCount: number
  serverName?: string | null
  serverId?: string | null
  notes?: string | null
  subtotal: number
  discountType?: DiscountType | null
  discountAmount: number
  taxRate: number
  tax: number
  serviceCharge: number
  tipAmount: number
  total: number
  paymentMethod?: string | null
  openedAt: string
  closedAt?: string | null
  items: PosOrderItem[]
  payments: OrderPaymentRecord[]
  table?: {
    id: string
    number: number
    name?: string | null
    section: string
    capacity: number
  }
}