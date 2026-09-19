/**
 * Restaurant order → shared thermal receipt payload.
 *
 * The restaurant plugin stores its own order shape (`PosOrder`), which differs
 * from the store/checkout shape the shared receipt renderer expects. This module
 * is the only translation point, so the POS preview and the sales-history reprint
 * always print the same ticket.
 */

/** Minimal order shape this mapper needs; the sales page hands over untyped rows. */
export interface ReceiptOrderItem {
  itemName: string
  quantity: number
  unitPrice: number
  /** Line total as stored by the plugin — includes modifiers, unlike qty × price. */
  totalPrice?: number | null
  status?: string | null
}

export interface ReceiptOrder {
  id: string
  orderNumber?: number | null
  orderType?: string | null
  guestCount?: number | null
  serverName?: string | null
  notes?: string | null
  subtotal: number
  discountType?: string | null
  discountAmount?: number | null
  taxRate?: number | null
  tax?: number | null
  serviceCharge?: number | null
  tipAmount?: number | null
  total: number
  paymentMethod?: string | null
  payments?: Array<{ paymentMethod?: string | null }> | null
  openedAt: string
  closedAt?: string | null
  items: ReceiptOrderItem[]
  table?: { number: number } | null
}

/** The receipt contract rendered by the main process. */
export interface RestaurantReceiptData {
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail?: string
  taxNumber: string
  commercialRegister?: string

  receiptNumber: string
  date: Date
  paymentMethod: string

  items: Array<{ name: string; quantity: number; price: number; total: number }>

  subtotal: number
  tax: number
  taxRate: number
  total: number
  discount?: number
  discountType?: string
  discountRate?: number
  serviceCharge?: number
  tipAmount?: number

  username?: string
  orderType?: string
  tableName?: string
  guestCount?: number
  openedAt?: Date
  closedAt?: Date
  notes?: string
}

/** Human wording for the receipt; the printer never shows the raw enum. */
const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  takeout: 'Takeaway',
  delivery: 'Delivery',
  bar_tab: 'Bar Tab',
}

/** Same labels in Arabic, matching the wording the plugin's screens use. */
const ORDER_TYPE_LABELS_AR: Record<string, string> = {
  dine_in: 'داخل الصالة',
  takeout: 'طلبات خارجية',
  delivery: 'توصيل',
  bar_tab: 'حساب البار',
}

/** The receipt is Arabic whenever the printer settings say so. */
const isArabicReceipt = (): boolean => localStorage.getItem('receiptLanguage') === 'ar'

const orderTypeLabel = (type: string): string => {
  const table = isArabicReceipt() ? ORDER_TYPE_LABELS_AR : ORDER_TYPE_LABELS
  return table[type] || type
}

/** `discountType` is stored lowercase in this plugin, uppercase in the renderer. */
const isPercentageDiscount = (value?: string | null): boolean =>
  String(value || '').toUpperCase() === 'PERCENTAGE'

const round2 = (value: number): number => Math.round(value * 100) / 100

function savedTaxRatePercent(): number {
  const parsed = parseFloat(localStorage.getItem('taxRate') || '')
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * The plugin keeps both rates as fractions (0.08 = 8%), while the shared receipt
 * contract takes a percentage and an already-resolved amount, because that is
 * what the printer prints.
 */
const rateToPercent = (rate: number | null | undefined): number => {
  const value = Number(rate)
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round((value <= 1 ? value * 100 : value) * 100) / 100
}

export function buildOrderReceiptData(order: ReceiptOrder, storeNameFallback = ''): RestaurantReceiptData {
  const lineItems = (order.items || []).filter((item) => item.status !== 'voided')

  const subtotal = Number(order.subtotal) || 0
  const storedDiscount = Number(order.discountAmount) || 0
  const tax = Number(order.tax) || 0
  const hasOrderTaxRate = Number.isFinite(Number(order.taxRate)) && Number(order.taxRate) > 0
  const taxRate = hasOrderTaxRate
    ? rateToPercent(order.taxRate)
    : savedTaxRatePercent()

  // A percentage discount is stored as the rate itself, a fixed one as money.
  const isPercent = isPercentageDiscount(order.discountType)
  const discount = isPercent
    ? round2((subtotal * storedDiscount) / 100)
    : Math.min(subtotal, storedDiscount)
  const discountedSubtotal = Math.max(0, round2(subtotal - discount))
  // The service charge is stored as a rate on the discounted subtotal, exactly
  // as the plugin's own totals engine applies it.
  const serviceCharge = round2(discountedSubtotal * (Number(order.serviceCharge) || 0))

  const paidAt = order.closedAt || order.openedAt

  return {
    storeName: localStorage.getItem('storeName') || storeNameFallback,
    storeAddress: localStorage.getItem('storeAddress') || '',
    storePhone: localStorage.getItem('storePhone') || '',
    storeEmail: localStorage.getItem('storeEmail') || undefined,
    taxNumber: localStorage.getItem('taxNumber') || '',
    commercialRegister: localStorage.getItem('commercialRegister') || undefined,

    receiptNumber: String(order.orderNumber ?? order.id.slice(0, 8)),
    date: new Date(paidAt),
    paymentMethod: order.paymentMethod || order.payments?.[0]?.paymentMethod || 'CASH',

    items: lineItems.map((item) => {
      const quantity = Number(item.quantity) || 0
      const price = Number(item.unitPrice) || 0
      return {
        name: item.itemName,
        quantity,
        price,
        total: Number.isFinite(Number(item.totalPrice)) ? Number(item.totalPrice) : quantity * price,
      }
    }),

    subtotal,
    tax,
    taxRate,
    total: Number(order.total) || 0,
    discount: discount > 0 ? discount : undefined,
    discountType: discount > 0 ? (isPercent ? 'PERCENTAGE' : 'FIXED') : undefined,
    discountRate: discount > 0 && isPercent ? storedDiscount : undefined,
    serviceCharge: serviceCharge > 0 ? serviceCharge : undefined,
    tipAmount: Number(order.tipAmount) > 0 ? Number(order.tipAmount) : undefined,

    username: order.serverName || undefined,
    orderType: order.orderType ? orderTypeLabel(order.orderType) : undefined,
    tableName: order.table?.number ? String(order.table.number) : undefined,
    guestCount: Number(order.guestCount) > 0 ? Number(order.guestCount) : undefined,
    openedAt: order.openedAt ? new Date(order.openedAt) : undefined,
    closedAt: order.closedAt ? new Date(order.closedAt) : undefined,
    notes: order.notes || undefined,
  }
}
