/**
 * Which path a receipt takes to the paper — graphics or code-page text.
 *
 * This is the decision that made the Settings test print and a real sale print
 * differently: the routing used to follow `receiptLanguage`, so a shop with an
 * English receipt that sells an Arabic-named product (`شاي بلنب`) never
 * rasterised and the Arabic came out as noise. The Arabic test tab forces
 * `receiptLanguage: 'ar'`, which is why it looked fine there.
 *
 * Two guarantees are pinned here:
 *   1. Arabic anywhere on the receipt — product names included — rasterises in
 *      bitmap mode regardless of the label language.
 *   2. A receipt picks exactly one code page, so it never switches pages
 *      half-way through (the printer accepts the first page and garbles the
 *      rest).
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => process.cwd() },
  BrowserWindow: class {},
  screen: { getPrimaryDisplay: () => ({ scaleFactor: 1 }) },
}))

import { ThermalPrinterService } from '../../main/services/ThermalPrinterService'
import type {
  PrinterSettings,
  ReceiptData,
} from '../../main/services/ThermalPrinterService'
import { ARABIC_CODE_PAGES, containsArabic } from '../../main/services/thermal/arabic'

const settings = (overrides: Partial<PrinterSettings> = {}): PrinterSettings => ({
  printerType: 'usb',
  printerName: 'XP-58C',
  paperWidth: '80mm',
  receiptLanguage: 'en',
  receiptArabicMode: 'bitmap',
  ...overrides,
})

const receipt = (overrides: Partial<ReceiptData> = {}): ReceiptData => ({
  storeName: 'BizFlow Coffee',
  storeAddress: '12 Corniche Rd',
  storePhone: '0100 000 0000',
  taxNumber: '100-200-300',
  receiptNumber: 'A-1042',
  date: new Date('2024-06-10T12:00:00.000Z'),
  paymentMethod: 'Cash',
  items: [{ name: 'Espresso', quantity: 1, price: 40, total: 40 }],
  subtotal: 40,
  tax: 0,
  taxRate: 0,
  total: 40,
  ...overrides,
})

const arabicItem = { name: 'شاي بلنب', quantity: 2, price: 25, total: 50 }

describe('receipt routing is driven by content, not by label language', () => {
  it('keeps a fully Latin English receipt as ESC/POS text', () => {
    expect(ThermalPrinterService.shouldRasterise(receipt(), settings())).toBe(false)
  })

  it('rasterises an Arabic product name on an English receipt', () => {
    expect(ThermalPrinterService.shouldRasterise(receipt({ items: [arabicItem] }), settings())).toBe(
      true,
    )
  })

  it('rasterises an Arabic store name on an English receipt', () => {
    const data = receipt({ storeName: 'قهوة النيل' })
    expect(ThermalPrinterService.shouldRasterise(data, settings())).toBe(true)
  })

  it('rasterises Arabic typed into the free-text header', () => {
    const data = receipt()
    const withHeader = settings({ receiptHeader: 'أهلاً بك' })
    expect(ThermalPrinterService.shouldRasterise(data, withHeader)).toBe(true)
  })

  it('rasterises an Arabic-language receipt even when nothing else is Arabic', () => {
    const data = receipt()
    const arabicLabels = settings({ receiptLanguage: 'ar' })
    expect(ThermalPrinterService.shouldRasterise(data, arabicLabels)).toBe(true)
  })

  it('stays on the text path when the printer is not a receipt printer', () => {
    expect(
      ThermalPrinterService.shouldRasterise(receipt({ items: [arabicItem] }), settings({ printerType: 'none' })),
    ).toBe(false)
    expect(
      ThermalPrinterService.shouldRasterise(receipt({ items: [arabicItem] }), settings({ printerType: 'html' })),
    ).toBe(false)
  })

  it('honours an explicit codepage choice over the bitmap default', () => {
    const data = receipt({ items: [arabicItem] })
    expect(ThermalPrinterService.shouldRasterise(data, settings({ receiptArabicMode: 'codepage' }))).toBe(
      false,
    )
  })
})

describe('a receipt resolves a single code page', () => {
  const data = receipt({ items: [arabicItem] })

  it('reports no missing glyphs on a Latin-only receipt', () => {
    expect(ThermalPrinterService.missingGlyphs(receipt(), settings({ receiptArabicMode: 'codepage' }))).toEqual(
      [],
    )
  })

  it('reports no missing glyphs on a bitmap receipt, where the page is unused', () => {
    expect(ThermalPrinterService.missingGlyphs(data, settings())).toEqual([])
  })

  it('picks the page that can write the whole receipt', () => {
    const codepage = settings({ receiptArabicMode: 'codepage', receiptArabicEncoding: 'auto' })
    const encoding = ThermalPrinterService.effectiveArabicEncoding(data, codepage)

    // The item name alone rules CP864 out, so nothing may be missing.
    expect(ARABIC_CODE_PAGES[encoding]).toBeDefined()
    expect(ThermalPrinterService.missingGlyphs(data, codepage)).toEqual([])
  })

  it('keeps a pinned page even when it cannot write a letter', () => {
    const pinned = settings({ receiptArabicMode: 'codepage', receiptArabicEncoding: 'cp864' })
    expect(ThermalPrinterService.effectiveArabicEncoding(data, pinned)).toBe('cp864')
  })

  it('resolves the same page with English and Arabic labels', () => {
    const english = settings({ receiptArabicMode: 'codepage', receiptArabicEncoding: 'auto' })
    const arabic = settings({
      receiptArabicMode: 'codepage',
      receiptArabicEncoding: 'auto',
      receiptLanguage: 'ar',
    })

    // `withResolvedArabicEncoding` freezes this page before the header prints, so
    // `emit` and the glyph check cannot disagree.
    expect(ThermalPrinterService.effectiveArabicEncoding(data, english)).toBe(
      ThermalPrinterService.effectiveArabicEncoding(data, arabic),
    )
  })

  it('leaves a Latin-only receipt untouched by page resolution', () => {
    // No Arabic means the page never reaches the paper, so `auto` stays as-is.
    const plain = receipt()
    expect(ThermalPrinterService.shouldRasterise(plain, settings({ receiptArabicMode: 'codepage' }))).toBe(
      false,
    )
    expect(ThermalPrinterService.missingGlyphs(plain, settings({ receiptArabicMode: 'codepage' }))).toEqual(
      [],
    )
  })
})

describe('the Arabic language itself', () => {
  it('recognises the sample item as Arabic', () => {
    expect(containsArabic('شاي بلنب')).toBe(true)
    expect(containsArabic('Espresso')).toBe(false)
  })
})

/** Every code page the buffer selects, in order: `ESC t <page>`. */
const codePagesIn = (buffer: Buffer): number[] => {
  const pages: number[] = []
  for (let i = 0; i < buffer.length - 2; i++) {
    if (buffer[i] === 0x1b && buffer[i + 1] === 0x74) pages.push(buffer[i + 2])
  }
  return pages
}

/**
 * Code pages the buffer uses for Arabic. Page 0 is the ASCII page a Latin run
 * inside an Arabic line switches back to, so it is not a page switch.
 */
const arabicCodePagesIn = (buffer: Buffer): number[] =>
  codePagesIn(buffer).filter((page) => page !== 0)

/** `GS v 0` — the raster command. Its presence means graphics, not text. */
const isRaster = (buffer: Buffer): boolean => buffer.includes(Buffer.from([0x1d, 0x76, 0x30]))

describe('the emitted bytes agree with the routing decision', () => {
  const data = receipt({ items: [arabicItem] })

  it('keeps one code page for the whole receipt in codepage mode', async () => {
    const buffer = await ThermalPrinterService.renderReceiptBuffer(
      data,
      settings({ receiptArabicMode: 'codepage', receiptArabicEncoding: 'auto' }),
    )
    const pages = arabicCodePagesIn(buffer)

    expect(pages.length).toBeGreaterThan(0)
    // The old bug: Arabic lines each resolved their own page, so the receipt could
    // switch pages half-way through and the printer kept only the first one.
    expect(new Set(pages).size).toBe(1)
    expect(pages[0]).toBe(
      ARABIC_CODE_PAGES[
        ThermalPrinterService.effectiveArabicEncoding(data, settings({ receiptArabicEncoding: 'auto' }))
      ].page,
    )
  })

  it('uses the page the user pinned, not the one the text prefers', async () => {
    const buffer = await ThermalPrinterService.renderReceiptBuffer(
      data,
      settings({ receiptArabicMode: 'codepage', receiptArabicEncoding: 'cp864' }),
    )
    expect(new Set(arabicCodePagesIn(buffer))).toEqual(new Set([ARABIC_CODE_PAGES.cp864.page]))
  })

  it('never delegates Arabic to the raster command on the text path', async () => {
    const buffer = await ThermalPrinterService.renderReceiptBuffer(
      data,
      settings({ receiptArabicMode: 'codepage', receiptArabicEncoding: 'auto' }),
    )
    expect(isRaster(buffer)).toBe(false)
  })

  it('renders a named printer into a buffer on a non-Windows platform', async () => {
    // A named printer becomes the `printer:<name>` interface, whose native driver
    // only exists on Windows. Composing a buffer reaches no device, so requiring a
    // driver here made the same render throw "No driver set!" on Linux and in CI.
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    try {
      const buffer = await ThermalPrinterService.renderReceiptBuffer(
        data,
        settings({ receiptArabicMode: 'codepage' }),
      )
      expect(buffer.length).toBeGreaterThan(0)
    } finally {
      if (platform) Object.defineProperty(process, 'platform', platform)
    }
  })
})
