/**
 * The guest check preview the cashier sees before paper comes out.
 *
 * The modal is a thin shell around the shared renderer, so what these tests pin
 * is the shell's contract: the raster the print job would produce is shown at the
 * configured paper width, the Print button reports what actually happened, and a
 * machine with no thermal printer falls back to the browser dialog instead of
 * failing silently.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { translations } from '../../../renderer/src/i18n/translations'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'

const renderPreviewMock = vi.fn()
const printOrderReceiptMock = vi.fn()

vi.mock('@renderer/lib/thermalPrint', () => ({
  readPrinterSettings: () => ({ paperWidth: '58mm' }),
  renderPreview: (...args: unknown[]) => renderPreviewMock(...args)
}))

vi.mock('../../../renderer/src/plugins/restaurant/pages/utils/printOrderReceipt', () => ({
  printOrderReceipt: (...args: unknown[]) => printOrderReceiptMock(...args)
}))

import { ReceiptThermalPreview } from '../../../renderer/src/plugins/restaurant/pages/POS/components/ReceiptThermalPreview'
import type { PosOrder } from '../../../renderer/src/plugins/restaurant/pages/POS/types'

const en = translations.en

const order = {
  id: 'ord-1',
  orderNumber: 1042,
  orderType: 'dine_in',
  status: 'settled',
  guestCount: 2,
  serverName: 'Mona',
  subtotal: 200,
  total: 205.2,
  tax: 25.2,
  taxRate: 0.14,
  items: [{ itemName: 'Sea bass', quantity: 2, unitPrice: 70, totalPrice: 140, status: 'sent' }],
  table: { number: 7 },
  openedAt: '2024-06-10T18:05:00.000Z',
  closedAt: '2024-06-10T19:40:00.000Z'
} as unknown as PosOrder

const preview = {
  width: 384,
  totalHeight: 900,
  encoding: null,
  raster: false,
  missingGlyphs: [],
  slices: [
    { offset: 0, height: 900, dataUrl: 'data:image/png;base64,AAAA' }
  ]
}

const show = (props: Partial<ComponentProps<typeof ReceiptThermalPreview>> = {}) =>
  render(
    <LanguageProvider>
      <ReceiptThermalPreview isOpen onClose={vi.fn()} order={order} {...props} />
    </LanguageProvider>
  )

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('language', 'en')
  localStorage.setItem('storeName', 'Nile View')
  renderPreviewMock.mockReset()
  printOrderReceiptMock.mockReset()
  renderPreviewMock.mockResolvedValue({ success: true, preview })
  printOrderReceiptMock.mockResolvedValue({ success: true })
})

describe('what the cashier previews', () => {
  it('shows the receipt as the print job would rasterise it', async () => {
    const { container } = show()

    const image = await screen.findByAltText(en.restReceiptPreviewTitle)
    expect(image).toHaveAttribute('src', preview.slices[0].dataUrl)
    // One image per slice: the whole receipt, not a thumbnail of the first band.
    expect(container.querySelectorAll('img')).toHaveLength(preview.slices.length)
  })

  it('renders nothing at all while closed', () => {
    const { container } = show({ isOpen: false })

    expect(container).toBeEmptyDOMElement()
    expect(renderPreviewMock).not.toHaveBeenCalled()
  })

  it('states the paper width the preview was rendered for', async () => {
    show()

    expect(await screen.findByText('58mm')).toBeInTheDocument()
  })

  it('maps the check through the shared receipt payload', async () => {
    show()

    await waitFor(() => expect(renderPreviewMock).toHaveBeenCalledTimes(1))
    const payload = renderPreviewMock.mock.calls[0][0]
    expect(payload.receiptNumber).toBe('1042')
    expect(payload.tableName).toBe('7')
    expect(payload.username).toBe('Mona')
    expect(payload.taxRate).toBe(14)
  })

  it('explains itself when the rasteriser refuses the job', async () => {
    renderPreviewMock.mockResolvedValue({ success: false, error: 'No printer driver' })
    show()

    expect(await screen.findByText('No printer driver')).toBeInTheDocument()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('points at Settings when the store is still unnamed', async () => {
    localStorage.removeItem('storeName')
    show()

    expect(await screen.findByText(en.restReceiptNoStore)).toBeInTheDocument()
  })
})

describe('printing from the preview', () => {
  it('confirms a job the printer accepted', async () => {
    show()
    await screen.findByAltText(en.restReceiptPreviewTitle)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.restSalesPrintReceipt) }))

    expect(await screen.findByText(en.restReceiptPrinted)).toBeInTheDocument()
    expect(printOrderReceiptMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the browser dialog when no thermal printer is set up', async () => {
    const browserPrint = vi.spyOn(window, 'print').mockImplementation(() => {})
    printOrderReceiptMock.mockResolvedValue({ success: false, browserPrint: true, message: 'none' })
    show()
    await screen.findByAltText(en.restReceiptPreviewTitle)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.restSalesPrintReceipt) }))

    expect(await screen.findByText(en.restReceiptNoPrinter)).toBeInTheDocument()
    expect(browserPrint).toHaveBeenCalled()
    browserPrint.mockRestore()
  })

  it('surfaces the printer error instead of claiming success', async () => {
    printOrderReceiptMock.mockResolvedValue({ success: false, browserPrint: false, message: 'Paper out' })
    show()
    await screen.findByAltText(en.restReceiptPreviewTitle)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en.restSalesPrintReceipt) }))

    expect(await screen.findByText('Paper out')).toBeInTheDocument()
    expect(screen.queryByText(en.restReceiptPrinted)).not.toBeInTheDocument()
  })
})
