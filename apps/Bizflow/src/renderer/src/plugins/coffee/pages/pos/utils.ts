import type { ReceiptSettings } from './types'
import {
  readPrinterSettings,
  getStoreLogo,
  getReceiptFooter,
  getAutoPrintSale,
  setAutoPrintSale,
} from '../../../../lib/thermalPrint'

export { getStoreLogo, getReceiptFooter, getAutoPrintSale, setAutoPrintSale }

// ── Color helpers ───────────────────────────────────────────────────────────
export function hexToRgba(hex: string, alpha = 0.15): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function paymentLabel(pm: string): string {
  if (pm === 'cash') return 'Cash'
  if (pm === 'card') return 'Card'
  if (pm === 'vodafone_cash') return 'Vodafone Cash'
  return pm.replace('_', ' ')
}

// ── Receipt settings ────────────────────────────────────────────────────────
export function readReceiptSettings(): ReceiptSettings {
  const shared = readPrinterSettings()
  return {
    storeName:           localStorage.getItem('storeName')           || 'BizFlow Coffee',
    storeAddress:        localStorage.getItem('storeAddress')        || '',
    storePhone:          localStorage.getItem('storePhone')          || '',
    storeEmail:          localStorage.getItem('storeEmail')          || '',
    taxNumber:           localStorage.getItem('taxNumber')           || '',
    commercialRegister:  localStorage.getItem('commercialRegister')  || '',
    printerType:         shared.printerType,
    printerName:         shared.printerName,
    printerIP:           shared.printerIP,
    paperWidth:          shared.paperWidth,
    receiptBottomSpacing: shared.receiptBottomSpacing,
    printLogo:           shared.printLogo,
    includeLogo:         shared.printLogo,
    receiptLogo:         getStoreLogo() || undefined,
    printQRCode:         shared.printQRCode,
    printBarcode:        shared.printBarcode,
    receiptLanguage:     shared.receiptLanguage === 'both' ? 'ar' : shared.receiptLanguage,
    receiptArabicMode:   shared.receiptArabicMode,
    receiptHeader:       shared.receiptHeader,
    receiptFooter:       shared.receiptFooter,
    openCashDrawer:      shared.openCashDrawer,
  }
}

// ── Store logo / footer ─────────────────────────────────────────────────────
/** Arabic footer for the receipt preview; the print path uses `ReceiptLabels`. */
export function getReceiptFooterAr(): string {
  return localStorage.getItem('receiptFooterAr') || 'شكراً لزيارتكم!'
}

// ── Paper width config ──────────────────────────────────────────────────────
export const PAPER_CONFIG = {
  '58mm': { chars: 32, dots: 384, previewWidth: 240 },
  '80mm': { chars: 48, dots: 576, previewWidth: 360 },
} as const

export type PaperWidth = keyof typeof PAPER_CONFIG

// ── Date formatting ─────────────────────────────────────────────────────────
export function formatReceiptDate(d: Date): string {
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// ── Labels (EN + AR) ────────────────────────────────────────────────────────
export const RECEIPT_LABELS = {
  en: {
    receipt:        'RECEIPT',
    date:           'Date',
    cashier:        'Cashier',
    orderType:      'Order Type',
    table:          'Table',
    customer:       'CUSTOMER',
    deliveryTo:     'DELIVERY TO',
    qty:            'Qty',
    item:           'Item',
    amount:         'Amount',
    subtotal:       'Subtotal',
    discount:       'Discount',
    tax:            'Tax',
    total:          'TOTAL',
    paidVia:        'PAID VIA',
    notes:          'Notes',
    thankYou:       'Thank you for your visit!',
    poweredBy:      'Powered by BizFlow',
    tel:            'Tel',
    taxLabel:       'Tax',
    crLabel:        'CR',
    printReceipt:   'Print Receipt',
    receiptPreview: 'Receipt Preview',
    cancel:         'Cancel',
    printing:       'Printing…',
    dineIn:         'DINE IN',
    takeaway:       'TAKEAWAY',
    delivery:       'DELIVERY',
    cash:           'CASH',
    card:           'CARD',
    vodafoneCash:   'VODAFONE CASH',
  },
  ar: {
    receipt:        'إيصال',
    date:           'التاريخ',
    cashier:        'الكاشير',
    orderType:      'نوع الطلب',
    table:          'طاولة',
    customer:       'العميل',
    deliveryTo:     'توصيل إلى',
    qty:            'الكمية',
    item:           'الصنف',
    amount:         'المبلغ',
    subtotal:       'المجموع الفرعي',
    discount:       'الخصم',
    tax:            'الضريبة',
    total:          'الإجمالي',
    paidVia:        'تم الدفع بواسطة',
    notes:          'ملاحظات',
    thankYou:       'شكراً لزيارتكم!',
    poweredBy:      'مدعوم من BizFlow',
    tel:            'هاتف',
    taxLabel:       'ضريبة',
    crLabel:        'سجل تجاري',
    printReceipt:   'طباعة الإيصال',
    receiptPreview: 'معاينة الإيصال',
    cancel:         'إلغاء',
    printing:       'جاري الطباعة…',
    dineIn:         'صالة',
    takeaway:       'تيك أووي',
    delivery:       'توصيل',
    cash:           'نقداً',
    card:           'بطاقة',
    vodafoneCash:   'فودافون كاش',
  },
} as const

export function getLabels(lang: 'en' | 'ar') {
  return RECEIPT_LABELS[lang] ?? RECEIPT_LABELS.en
}

export function orderTypeLabelLocalized(type: string, lang: 'en' | 'ar'): string {
  const labels = getLabels(lang)
  if (type === 'dine_in')  return labels.dineIn
  if (type === 'takeaway') return labels.takeaway
  if (type === 'delivery') return labels.delivery
  return type.replace('_', ' ')
}

export function paymentLabelLocalized(pm: string, lang: 'en' | 'ar'): string {
  const labels = getLabels(lang)
  if (pm === 'cash')          return labels.cash
  if (pm === 'card')          return labels.card
  if (pm === 'vodafone_cash') return labels.vodafoneCash
  return pm.replace('_', ' ')
}

// ── String width (handles Arabic) ───────────────────────────────────────────
export function getStringWidth(str: string): number {
  let width = 0
  for (const char of str) {
    const code = char.charCodeAt(0)
    if (code >= 0x0600 && code <= 0x06ff) {
      width += 1.2
    } else {
      width += 1
    }
  }
  return Math.ceil(width)
}

// ── Truncate text to fit column ─────────────────────────────────────────────
export function truncateText(text: string, maxChars: number): string {
  const width = getStringWidth(text)
  if (width <= maxChars) return text

  let result = ''
  let currentWidth = 0
  const ellipsis = '…'
  const ellipsisWidth = 1

  for (const char of text) {
    const code = char.charCodeAt(0)
    const charWidth = (code >= 0x0600 && code <= 0x06ff) ? 1.2 : 1
    if (currentWidth + charWidth + ellipsisWidth > maxChars) break
    result += char
    currentWidth += charWidth
  }
  return result + ellipsis
}

// ── Pad line for monospace alignment ────────────────────────────────────────
export function padLine(
  left: string,
  right: string,
  totalChars: number,
  lang: 'en' | 'ar' = 'en'
): string {
  const isRtl = lang === 'ar'
  const leftLen = getStringWidth(left)
  const rightLen = getStringWidth(right)
  const spaceBetween = Math.max(1, totalChars - leftLen - rightLen)
  const spaces = ' '.repeat(spaceBetween)

  if (isRtl) {
    return right + spaces + left
  }
  return left + spaces + right
}

// ── Receipt data types ──────────────────────────────────────────────────────
export interface ReceiptItem {
  name:     string
  quantity: number
  price:    number
  total:    number
}

export interface ReceiptData {
  storeName:           string
  storeAddress:        string
  storePhone:          string
  storeEmail?:         string
  taxNumber:           string
  commercialRegister?: string
  storeLogo?:          string | null

  receiptNumber: string
  date:           Date
  cashier:        string

  orderType:      string
  tableName?:     string

  customerName?:    string
  customerPhone?:   string
  deliveryAddress?: string

  items: ReceiptItem[]

  subtotal: number
  discount: number
  tax:      number
  taxRate:  number
  total:    number

  paymentMethod: string

  notes?:      string
  footer?:     string
  footerAr?:   string
  receiptHeader?: string

  printLogo:       boolean
  printQRCode:     boolean
  printBarcode:    boolean
  receiptLanguage: 'en' | 'ar'
  paperWidth:      '58mm' | '80mm'
  receiptBottomSpacing?: number
  autoPrint:       boolean
}

// ── Build receipt data ──────────────────────────────────────────────────────
export function buildReceiptData(params: {
  orderNumber:      string
  closedAt:         Date
  cashierName:      string
  orderType:        string
  tableLabel?:      string
  customerName?:    string
  customerPhone?:   string
  customerAddress?: string
  cart:             Array<{ productName: string; quantity: number; salePrice: number }>
  subtotal:         number
  discount:         number
  total:            number
  paymentMethod:    string
  notes?:           string
}): ReceiptData {
  const settings = readReceiptSettings()
  const logo = getStoreLogo()

  return {
    storeName:           settings.storeName,
    storeAddress:        settings.storeAddress,
    storePhone:          settings.storePhone,
    storeEmail:          settings.storeEmail,
    taxNumber:           settings.taxNumber,
    commercialRegister:  settings.commercialRegister,
    storeLogo:           settings.printLogo ? logo : undefined,

    receiptNumber: params.orderNumber,
    date:          params.closedAt,
    cashier:       params.cashierName,

    orderType:  params.orderType,
    tableName:  params.tableLabel,

    customerName:    params.customerName,
    customerPhone:   params.customerPhone,
    deliveryAddress: params.orderType === 'delivery' ? params.customerAddress : undefined,

    items: params.cart.map(i => ({
      name:     i.productName,
      quantity: i.quantity,
      price:    i.salePrice,
      total:    i.salePrice * i.quantity,
    })),

    subtotal: params.subtotal,
    discount: params.discount,
    tax:      0,
    taxRate:  parseFloat(localStorage.getItem('taxRate') || '0'),
    total:    params.total,

    paymentMethod: params.paymentMethod,

    notes:      params.notes,
    footer:     getReceiptFooter(),
    footerAr:   getReceiptFooterAr(),
    receiptHeader:       settings.receiptHeader,
    printLogo:           settings.printLogo       ?? false,
    printQRCode:         settings.printQRCode     ?? false,
    printBarcode:        settings.printBarcode    ?? false,
    receiptLanguage:     settings.receiptLanguage || 'en',
    paperWidth:          settings.paperWidth,
    receiptBottomSpacing: settings.receiptBottomSpacing,
    autoPrint:           getAutoPrintSale(),
  }
}
