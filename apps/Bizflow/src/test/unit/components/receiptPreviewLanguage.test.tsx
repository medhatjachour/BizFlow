/**
 * The Settings live preview has to be able to test Arabic on a shop that prints
 * English receipts.
 *
 * Two things decide what reaches the paper: the sample data (item names) and
 * `PrinterSettings.receiptArabicMode`, which is what tells the renderer to
 * rasterise. Arabic is detected from the receipt content, so an English receipt
 * containing an Arabic product name rasterises too. The Arabic tab forces the
 * sample items, so printing its sample must send an Arabic payload even when
 * the saved receipt language is English.
 */

import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { translations } from '../../../renderer/src/i18n/translations'

const renderPreviewMock = vi.fn()
const printReceiptMock = vi.fn()

vi.mock('../../../renderer/src/lib/thermalPrint', () => ({
  renderPreview: (...args: unknown[]) => renderPreviewMock(...args),
  printReceipt: (...args: unknown[]) => printReceiptMock(...args)
}))

import ReceiptPreviewPanel from '../../../renderer/src/pages/Settings/receipt/ReceiptPreview'
import { toPrinterSettings } from '../../../renderer/src/pages/Settings/receipt/usePrinterTools'
import type { TaxReceiptSettings } from '../../../renderer/src/pages/Settings/types'

const settings = {
  storeName: 'Nile View',
  taxRate: 10,
  printerType: 'usb',
  printerName: 'XP-58C',
  paperWidth: '58mm',
  receiptLanguage: 'en',
  receiptArabicMode: 'bitmap'
} as unknown as TaxReceiptSettings

const tools = {
  toPrinterSettings: () => toPrinterSettings(settings),
  setFeedback: vi.fn()
} as unknown as ComponentProps<typeof ReceiptPreviewPanel>['tools']

const show = (props: Partial<ComponentProps<typeof ReceiptPreviewPanel>> = {}) =>
  render(
    <LanguageProvider>
      <ReceiptPreviewPanel settings={settings} tools={tools} {...props} />
    </LanguageProvider>
  )

const lastRenderArgs = () => renderPreviewMock.mock.calls.at(-1) as [any, any]

describe('receipt preview language', () => {
  beforeEach(() => {
    renderPreviewMock.mockReset()
    printReceiptMock.mockReset()
    renderPreviewMock.mockResolvedValue({
      success: false,
      error: 'preview disabled in test'
    })
    printReceiptMock.mockResolvedValue({ success: true })
  })

  it('follows the saved receipt language by default', async () => {
    show()
    await waitFor(() => expect(renderPreviewMock).toHaveBeenCalled())
    const [data, printer] = lastRenderArgs()
    expect(printer.receiptLanguage).toBe('en')
    expect(data.items[0].name).toBe('Filter Coffee 250g')
  })

  it('renders Arabic when the Arabic tab forces it, even with English receipts saved', async () => {
    show({ forceLanguage: 'ar' })
    await waitFor(() => expect(renderPreviewMock).toHaveBeenCalled())
    const [data, printer] = lastRenderArgs()
    expect(printer.receiptLanguage).toBe('ar')
    expect(data.items[0].name).toBe('قهوة فلتر ٢٥٠ جم')
  })

  it('explains that the forced sample is Arabic', async () => {
    show({ forceLanguage: 'ar' })
    const notices = [
      translations.en.trPreviewArabicForced,
      translations.ar.trPreviewArabicForced
    ]
    expect(await screen.findByText((text) => notices.includes(text))).toBeInTheDocument()
  })

  it('does not rewrite the saved printer settings', async () => {
    show({ forceLanguage: 'ar' })
    await waitFor(() => expect(renderPreviewMock).toHaveBeenCalled())
    const [, printer] = lastRenderArgs()
    expect(settings.receiptLanguage).toBe('en')
    expect(printer.printerName).toBe('XP-58C')
    expect(printer.paperWidth).toBe('58mm')
  })
})
