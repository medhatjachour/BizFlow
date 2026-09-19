/**
 * Sample receipt used by the Settings live preview.
 *
 * It is not real data and never touches the database: it exists so the receipt
 * designer can show exactly what the printer will put on paper while the user
 * picks a template, a font size or a logo.
 */

import type { TaxReceiptSettings } from '../types'

export interface SampleReceiptData {
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
  customerName?: string
  notes?: string
}

const SAMPLE_ITEMS: Record<'en' | 'ar', Array<{ name: string; quantity: number; price: number }>> = {
  en: [
    { name: 'Filter Coffee 250g', quantity: 2, price: 85 },
    { name: 'Butter Croissant', quantity: 3, price: 25 },
    { name: 'Orange Juice 1L', quantity: 1, price: 40 }
  ],
  ar: [
    { name: 'قهوة فلتر ٢٥٠ جم', quantity: 2, price: 85 },
    { name: 'كرواسون بالزبدة', quantity: 3, price: 25 },
    { name: 'عصير برتقال ١ لتر', quantity: 1, price: 40 }
  ]
}

const round = (value: number): number => Math.round(value * 100) / 100

/** Build the receipt the designer previews, from the real store settings. */
export function buildSampleReceipt(
  settings: TaxReceiptSettings,
  language: 'en' | 'ar'
): SampleReceiptData {
  const items = SAMPLE_ITEMS[language].map((item) => ({
    ...item,
    total: round(item.quantity * item.price)
  }))
  const subtotal = round(items.reduce((sum, item) => sum + item.total, 0))
  const taxRate = Number(settings.taxRate) || 0
  const tax = round((subtotal * taxRate) / 100)

  return {
    storeName: settings.storeName || '',
    storeAddress: settings.storeAddress || '',
    storePhone: settings.storePhone || '',
    storeEmail: settings.storeEmail || '',
    taxNumber: settings.taxNumber || '',
    commercialRegister: settings.commercialRegister || '',
    receiptNumber: 'PREVIEW-0001',
    date: new Date(),
    paymentMethod: language === 'ar' ? 'نقدي' : 'Cash',
    items,
    subtotal,
    tax,
    taxRate,
    total: round(subtotal + tax),
    customerName: language === 'ar' ? 'عميل تجريبي' : 'Sample customer',
    notes: language === 'ar' ? 'معاينة تصميم الإيصال' : 'Receipt design preview'
  }
}
