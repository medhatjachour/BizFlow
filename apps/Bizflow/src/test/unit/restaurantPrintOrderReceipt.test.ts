/**
 * Which path a restaurant check takes: the thermal printer, or the browser.
 *
 * Getting this branch wrong is how a cashier ends up with a silent failure, so the
 * contract is pinned here: a configured printer sends the payload and reports the
 * printer's own words on failure, and no printer asks the caller to browser-print.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: { printerType: 'usb' }, printReceipt: vi.fn() }))

vi.mock('@renderer/lib/thermalPrint', () => ({
  readPrinterSettings: () => state.settings,
  printReceipt: (...args: unknown[]) => state.printReceipt(...args)
}))

import {
  printOrderReceipt,
  type OrderPrintResult
} from '../../renderer/src/plugins/restaurant/pages/utils/printOrderReceipt'
import type { ReceiptOrder } from '../../renderer/src/plugins/restaurant/pages/utils/receiptData'

const order: ReceiptOrder = {
  id: 'ord-1',
  orderNumber: 1042,
  orderType: 'dine_in',
  subtotal: 200,
  total: 200,
  openedAt: '2024-06-10T18:05:00.000Z',
  items: [{ itemName: 'Sea bass', quantity: 1, unitPrice: 200 }],
  table: { number: 7 }
}

beforeEach(() => {
  localStorage.clear()
  state.settings = { printerType: 'usb' }
  state.printReceipt.mockReset()
})

describe('a machine with a thermal printer', () => {
  it('sends the check and reports the printer result', async () => {
    state.printReceipt.mockResolvedValue({ success: true, detectedPrinter: 'XP-58C' })

    const result: OrderPrintResult = await printOrderReceipt(order, 'Fallback Store')

    expect(result).toEqual({ success: true, browserPrint: false, message: undefined })
    const [payload] = state.printReceipt.mock.calls[0]
    expect(payload.receiptNumber).toBe('1042')
    expect(payload.storeName).toBe('Fallback Store')
    expect(payload.items).toHaveLength(1)
  })

  it('passes the printer error through so the cashier is told what happened', async () => {
    state.printReceipt.mockResolvedValue({ success: false, error: 'Printer is offline' })

    expect(await printOrderReceipt(order)).toEqual({
      success: false,
      browserPrint: false,
      message: 'Printer is offline'
    })
  })

  it('prefers the printer message over the raw error', async () => {
    state.printReceipt.mockResolvedValue({ success: false, message: 'Paper out', error: 'EPIPE' })

    expect(await printOrderReceipt(order)).toMatchObject({ message: 'Paper out' })
    expect(state.printReceipt).toHaveBeenCalledTimes(1)
  })
})

describe('a machine with no thermal printer', () => {
  it.each(['none', 'html'])('asks the caller to browser-print when printerType is %s', async (type) => {
    state.settings = { printerType: type }

    expect(await printOrderReceipt(order)).toEqual({ success: false, browserPrint: true })
    expect(state.printReceipt).not.toHaveBeenCalled()
  })
})
