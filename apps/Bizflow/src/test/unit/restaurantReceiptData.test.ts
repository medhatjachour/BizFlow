/**
 * Restaurant check → shared receipt payload.
 *
 * The plugin stores its rates as fractions and a percentage discount as the rate
 * itself, while the printer contract wants a percentage and resolved amounts.
 * Getting this translation wrong prints a receipt whose figures do not add up to
 * the total, which is exactly what this file guards.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildOrderReceiptData,
  type ReceiptOrder,
} from '../../renderer/src/plugins/restaurant/pages/utils/receiptData'

const order = (overrides: Partial<ReceiptOrder> = {}): ReceiptOrder => ({
  id: 'clx0order0',
  orderNumber: 1042,
  orderType: 'dine_in',
  guestCount: 4,
  serverName: 'Mona',
  notes: 'No nuts',
  subtotal: 200,
  discountType: null,
  discountAmount: 0,
  taxRate: 0,
  tax: 0,
  serviceCharge: 0,
  tipAmount: 0,
  total: 200,
  paymentMethod: 'card',
  openedAt: '2024-06-10T18:05:00.000Z',
  closedAt: '2024-06-10T19:40:00.000Z',
  items: [
    { itemName: 'Grilled sea bass', quantity: 2, unitPrice: 70, totalPrice: 140 },
    { itemName: 'Karkade', quantity: 2, unitPrice: 20, totalPrice: 60 },
  ],
  table: { number: 7 },
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('store identity', () => {
  it('takes the header details from Settings', () => {
    localStorage.setItem('storeName', 'Nile View')
    localStorage.setItem('storeAddress', '5 Corniche Rd')
    localStorage.setItem('storePhone', '0100 000 0000')
    localStorage.setItem('taxNumber', '100-200-300')

    const data = buildOrderReceiptData(order())

    expect(data.storeName).toBe('Nile View')
    expect(data.storeAddress).toBe('5 Corniche Rd')
    expect(data.storePhone).toBe('0100 000 0000')
    expect(data.taxNumber).toBe('100-200-300')
  })

  it('falls back to the plugin name until the store is configured', () => {
    expect(buildOrderReceiptData(order(), 'BizFlow Restaurant').storeName).toBe('BizFlow Restaurant')
  })
})

describe('check metadata', () => {
  it('uses the check number, the server name and the table', () => {
    const data = buildOrderReceiptData(order())

    expect(data.receiptNumber).toBe('1042')
    expect(data.username).toBe('Mona')
    expect(data.tableName).toBe('7')
    expect(data.guestCount).toBe(4)
    expect(data.orderType).toBe('Dine In')
    expect(data.notes).toBe('No nuts')
    expect(data.date).toEqual(new Date('2024-06-10T19:40:00.000Z'))
  })

  it('falls back to the shortened id when a check was never numbered', () => {
    expect(buildOrderReceiptData(order({ orderNumber: null })).receiptNumber).toBe('clx0orde')
  })

  it('reads the tender from the check, then its first payment', () => {
    expect(buildOrderReceiptData(order({ paymentMethod: null, payments: [] })).paymentMethod).toBe(
      'CASH'
    )
    expect(
      buildOrderReceiptData(order({ paymentMethod: null, payments: [{ paymentMethod: 'instapay' }] }))
        .paymentMethod
    ).toBe('instapay')
  })

  it('spells the order type out for the guest', () => {
    expect(buildOrderReceiptData(order({ orderType: 'takeout' })).orderType).toBe('Takeaway')
    expect(buildOrderReceiptData(order({ orderType: 'bar_tab' })).orderType).toBe('Bar Tab')
    expect(buildOrderReceiptData(order({ orderType: 'delivery' })).orderType).toBe('Delivery')
  })

  it('speaks Arabic on an Arabic receipt, and keeps the code when it is unknown', () => {
    localStorage.setItem('receiptLanguage', 'ar')

    expect(buildOrderReceiptData(order({ orderType: 'dine_in' })).orderType).toBe('داخل الصالة')
    expect(buildOrderReceiptData(order({ orderType: 'takeout' })).orderType).toBe('طلبات خارجية')
    expect(buildOrderReceiptData(order({ orderType: 'bar_tab' })).orderType).toBe('حساب البار')
    expect(buildOrderReceiptData(order({ orderType: 'drive_in' })).orderType).toBe('drive_in')
  })

  it('hides the table, the guests and the server when they are unknown', () => {
    const data = buildOrderReceiptData(
      order({ table: null, guestCount: 0, serverName: null, notes: '' })
    )

    expect(data.tableName).toBeUndefined()
    expect(data.guestCount).toBeUndefined()
    expect(data.username).toBeUndefined()
    expect(data.notes).toBeUndefined()
  })
})

describe('lines', () => {
  it('keeps the stored line total, which already carries the modifiers', () => {
    const data = buildOrderReceiptData(
      order({ items: [{ itemName: 'Sea bass', quantity: 2, unitPrice: 70, totalPrice: 154 }] })
    )

    expect(data.items).toEqual([{ name: 'Sea bass', quantity: 2, price: 70, total: 154 }])
  })

  it('drops voided lines so the receipt matches what the guest was served', () => {
    const data = buildOrderReceiptData(
      order({
        items: [
          { itemName: 'Sea bass', quantity: 2, unitPrice: 70, totalPrice: 140 },
          { itemName: 'Cancelled soup', quantity: 1, unitPrice: 40, totalPrice: 40, status: 'voided' },
        ],
      })
    )

    expect(data.items.map((item) => item.name)).toEqual(['Sea bass'])
  })
})

describe('discounts and charges', () => {
  it('resolves a percentage discount into money and keeps the rate for the label', () => {
    const data = buildOrderReceiptData(
      order({ discountType: 'percentage', discountAmount: 10, taxRate: 0.14, tax: 25.2, total: 205.2 })
    )

    expect(data.discount).toBe(20)
    expect(data.discountType).toBe('PERCENTAGE')
    expect(data.discountRate).toBe(10)
    expect(data.taxRate).toBe(14)
  })

  it('keeps a fixed discount as money and never prints a percentage', () => {
    const data = buildOrderReceiptData(
      order({ discountType: 'fixed', discountAmount: 35, total: 165 })
    )

    expect(data.discount).toBe(35)
    expect(data.discountType).toBe('FIXED')
    expect(data.discountRate).toBeUndefined()
  })

  it('caps a fixed discount at the subtotal instead of printing a negative total', () => {
    expect(buildOrderReceiptData(order({ discountType: 'fixed', discountAmount: 900 })).discount).toBe(
      200
    )
  })

  it('charges the service rate on the discounted subtotal, as the till does', () => {
    const data = buildOrderReceiptData(
      order({ discountType: 'fixed', discountAmount: 40, serviceCharge: 0.12 })
    )

    expect(data.serviceCharge).toBe(19.2)
  })

  it('prints no discount, service or tip row when none was applied', () => {
    const data = buildOrderReceiptData(order())

    expect(data.discount).toBeUndefined()
    expect(data.discountType).toBeUndefined()
    expect(data.serviceCharge).toBeUndefined()
    expect(data.tipAmount).toBeUndefined()
  })

  it('takes the tip as the money it is, and only once it was paid', () => {
    expect(buildOrderReceiptData(order({ tipAmount: 25 })).tipAmount).toBe(25)
    expect(buildOrderReceiptData(order({ tipAmount: 0 })).tipAmount).toBeUndefined()
  })

  it('falls back to the tax rate saved in Settings when the check has none', () => {
    localStorage.setItem('taxRate', '14')

    expect(buildOrderReceiptData(order({ taxRate: 0 })).taxRate).toBe(14)
    expect(buildOrderReceiptData(order({ taxRate: 0.14 })).taxRate).toBe(14)
  })
})
