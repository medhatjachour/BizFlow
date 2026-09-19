/**
 * Bitmap receipt layout and the ESC/POS raster packer.
 *
 * These two are what actually reach the paper for Arabic receipts: the HTML is
 * rasterised offscreen and `sliceToRaster` turns each slice's pixels into the
 * `GS v 0` command the printer understands. Both are pure functions of their
 * arguments, so they are tested without an Electron runtime - the packer only
 * needs an object shaped like a `NativeImage` (a size and a BGRA bitmap).
 *
 * The layout assertions are about the things a cashier notices on paper: the
 * logo sits above the store name, the free-text header above it too, the footer
 * below the thank-you lines, and a zero VAT row stays off the receipt.
 */

import { describe, expect, it } from 'vitest'

import {
  buildReceiptHtml,
  DEFAULT_RECEIPT_LAYOUT,
  normalizeLogoDataUrl,
  PAPER_DOTS,
  RECEIPT_DIVIDERS,
  RECEIPT_TEMPLATES,
  receiptWidthDots,
  resolveReceiptLayout,
  sliceToRaster,
} from '../../main/services/thermal/receiptImage'
import { getReceiptLabels } from '../../main/services/thermal/labels'
import type { PrinterSettings, ReceiptData } from '../../main/services/ThermalPrinterService'

type SliceImage = Parameters<typeof sliceToRaster>[0]

const settings = (overrides: Partial<PrinterSettings> = {}): PrinterSettings => ({
  printerType: 'usb',
  paperWidth: '58mm',
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
  items: [{ name: 'Espresso', quantity: 2, price: 30, total: 60 }],
  subtotal: 60,
  tax: 0,
  taxRate: 0,
  total: 60,
  ...overrides,
})

/** A `NativeImage` double: `sliceToRaster` reads a size and a BGRA bitmap. */
function image(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number]
): SliceImage {
  const bitmap = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [b, g, r, a] = pixel(x, y)
      const at = (y * width + x) * 4
      bitmap[at] = b
      bitmap[at + 1] = g
      bitmap[at + 2] = r
      bitmap[at + 3] = a
    }
  }
  return { getSize: () => ({ width, height }), toBitmap: () => bitmap } as unknown as SliceImage
}

const INK: [number, number, number, number] = [0, 0, 0, 255]
const PAPER: [number, number, number, number] = [255, 255, 255, 255]

describe('receipt HTML', () => {
  it('sizes the document to the printer head at 1 CSS pixel per dot', () => {
    expect(receiptWidthDots(settings({ paperWidth: '58mm' }))).toBe(PAPER_DOTS['58mm'])
    expect(receiptWidthDots(settings({ paperWidth: '80mm' }))).toBe(PAPER_DOTS['80mm'])
    expect(buildReceiptHtml(receipt(), settings({ paperWidth: '80mm' }))).toContain('width: 576px')
  })

  it('writes the document right to left for an Arabic receipt', () => {
    const html = buildReceiptHtml(receipt(), settings({ receiptLanguage: 'ar' }))
    const labels = getReceiptLabels('ar')
    expect(html).toContain('<html dir="rtl" lang="ar">')
    expect(html).toContain(labels.total)
    expect(html).not.toContain(getReceiptLabels('en').total)
  })

  it('keeps the store name above the header text and the footer below the thank-you', () => {
    const html = buildReceiptHtml(
      receipt(),
      settings({ receiptHeader: 'Branch 4\nOpen 8am - 11pm', receiptFooter: 'VAT included\nFind us online' })
    )
    const labels = getReceiptLabels('en')
    expect(html.indexOf('Open 8am - 11pm')).toBeLessThan(html.indexOf('BizFlow Coffee'))
    expect(html.indexOf('Find us online')).toBeGreaterThan(html.indexOf(labels.thankYou))
  })

  it('prints a logo only when one is set and not switched off', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo='
    expect(buildReceiptHtml(receipt(), settings({ receiptLogo: logo }))).toContain('<img class="logo"')
    expect(buildReceiptHtml(receipt(), settings({ receiptLogo: logo, printLogo: false }))).not.toContain('<img class="logo"')
    expect(buildReceiptHtml(receipt(), settings())).not.toContain('<img class="logo"')
  })

  it('accepts a bare base64 logo and refuses anything else', () => {
    expect(normalizeLogoDataUrl('iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(normalizeLogoDataUrl('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA')
    expect(normalizeLogoDataUrl('not a logo!')).toBeNull()
    expect(normalizeLogoDataUrl('')).toBeNull()
    expect(normalizeLogoDataUrl(undefined)).toBeNull()
  })

  it('leaves the VAT row off a receipt that charged no tax', () => {
    const withoutTax = buildReceiptHtml(receipt(), settings())
    expect(withoutTax).not.toContain('VAT (0%)')

    const withTax = buildReceiptHtml(receipt({ tax: 8.4, taxRate: 14 }), settings())
    expect(withTax).toContain('VAT (14%)')
    expect(withTax).toContain('8.40 EGP')
  })

  it('escapes the data instead of letting it into the markup', () => {
    const html = buildReceiptHtml(receipt({ storeName: '<b>Shop</b>' }), settings())
    expect(html).toContain('&lt;b&gt;Shop&lt;/b&gt;')
    expect(html).not.toContain('<b>Shop</b>')
  })

  it('prints the sale discount, the service charge and the tip, and puts the tip below the total', () => {
    const html = buildReceiptHtml(
      receipt({
        subtotal: 200,
        discount: 20,
        discountType: 'PERCENTAGE',
        discountRate: 10,
        tax: 25.2,
        taxRate: 14,
        serviceCharge: 19.2,
        tipAmount: 25,
        total: 205.2,
      }),
      settings()
    )
    const labels = getReceiptLabels('en')

    expect(html).toContain(`${labels.discount} 10%`)
    expect(html).toContain('-20.00 EGP')
    expect(html).toContain(labels.serviceCharge)
    expect(html).toContain('19.20 EGP')
    // A tip is charged on top of the check total, so it must not sit above it.
    expect(html.indexOf(labels.gratuity)).toBeGreaterThan(html.indexOf('class="row total"'))
    expect(html.indexOf(`${labels.discount} 10%`)).toBeLessThan(html.indexOf('class="row total"'))
  })

  it('leaves the discount, service and tip rows off a plain receipt', () => {
    const html = buildReceiptHtml(receipt(), settings())
    const labels = getReceiptLabels('en')

    expect(html).not.toContain(labels.gratuity)
    expect(html).not.toContain(labels.serviceCharge)
  })
})

describe('receipt design options', () => {
  it('defaults every design knob when the user never touched one', () => {
    expect(resolveReceiptLayout(settings())).toEqual(DEFAULT_RECEIPT_LAYOUT)
    expect(RECEIPT_TEMPLATES).toContain(DEFAULT_RECEIPT_LAYOUT.template)
    expect(RECEIPT_DIVIDERS).toContain(DEFAULT_RECEIPT_LAYOUT.divider)
  })

  it('forces a hand-typed or stale value back into a printable range', () => {
    expect(resolveReceiptLayout(settings({ receiptFontScale: 3 })).fontScale).toBe(1.2)
    expect(resolveReceiptLayout(settings({ receiptFontScale: 0.1 })).fontScale).toBe(0.8)
    expect(resolveReceiptLayout(settings({ receiptLogoSize: 500 })).logoSize).toBe(100)
    expect(resolveReceiptLayout(settings({ receiptLogoSize: 5 })).logoSize).toBe(20)
    expect(resolveReceiptLayout(settings({ receiptFontScale: Number.NaN })).fontScale).toBe(0.8)
  })

  it('ignores a template or divider it does not know', () => {
    const layout = resolveReceiptLayout(
      settings({ receiptTemplate: 'fancy' as never, receiptDivider: 'zigzag' as never })
    )
    expect(layout.template).toBe(DEFAULT_RECEIPT_LAYOUT.template)
    expect(layout.divider).toBe(DEFAULT_RECEIPT_LAYOUT.divider)
  })

  it('carries the chosen template and divider onto the document', () => {
    const modern = buildReceiptHtml(receipt(), settings({ receiptTemplate: 'modern', receiptDivider: 'solid' }))
    expect(modern).toContain('<div class="doc t-modern">')
    expect(modern).toContain('<div class="hr solid"></div>')

    const plain = buildReceiptHtml(receipt(), settings({ receiptDivider: 'none' }))
    expect(plain).not.toContain('class="hr')
    expect(plain).toContain('class="gap-sm"')
  })

  it('scales the printed type with the font-size slider', () => {
    expect(buildReceiptHtml(receipt(), settings({ receiptFontScale: 1.2 }))).toContain('font-size: 25.2px')
    expect(buildReceiptHtml(receipt(), settings())).toContain('font-size: 21.0px')
  })

  it('sizes the logo from the logo slider and can threshold it to black and white', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo='
    const html = buildReceiptHtml(
      receipt(),
      settings({ receiptLogo: logo, receiptLogoSize: 40, receiptLogoMono: true })
    )
    expect(html).toContain('<img class="logo mono" style="width:40%"')
    expect(DEFAULT_RECEIPT_LAYOUT.logoMono).toBe(false)
    expect(buildReceiptHtml(receipt(), settings({ receiptLogo: logo }))).toContain('<img class="logo" style="width:70%"')
  })

  it('leaves the store address and phone off when the user hides the store details', () => {
    const html = buildReceiptHtml(receipt(), settings({ receiptShowStoreDetails: false }))
    expect(html).toContain('BizFlow Coffee')
    expect(html).not.toContain('12 Corniche Rd')
    expect(html).not.toContain('0100 000 0000')
  })

  it('tolerates a legacy receipt with no design fields at all', () => {
    // A receipt queued before the designer existed must still render: the
    // settings object simply has none of the new keys.
    const legacy = { printerType: 'usb' as const, paperWidth: '58mm' as const }
    expect(() => buildReceiptHtml(receipt(), legacy)).not.toThrow()
    expect(buildReceiptHtml(receipt(), legacy)).toContain('BizFlow Coffee')
  })
})

describe('sliceToRaster', () => {
  it('writes the GS v 0 header for the slice geometry', () => {
    const raster = sliceToRaster(image(8, 2, () => INK), 8)
    expect(raster).toHaveLength(8 + 2)
    expect([...raster.subarray(0, 8)]).toEqual([0x1d, 0x76, 0x30, 0x00, 1, 0, 2, 0])
  })

  it('packs dark, opaque pixels as ink and everything else as paper', () => {
    // One row of eight dots: ink, paper, ink, translucent black (paper), a dark
    // colour logo pixel (ink), paper, mid grey (ink), paper.
    const raster = sliceToRaster(
      image(8, 1, (x) => {
        if (x === 0 || x === 2) return INK
        if (x === 4) return [40, 90, 200, 255]
        if (x === 3) return [0, 0, 0, 120]
        if (x === 6) return [100, 100, 100, 255]
        return PAPER
      }),
      8
    )
    // Ink at dots 0, 2, 4 and 6 -> 0b10101010.
    expect(raster[8]).toBe(0b10101010)
  })

  it('prints rows the capture could not reach as paper when told the slice height', () => {
    const raster = sliceToRaster(image(8, 1, () => INK), 8, 3)
    expect([...raster.subarray(4, 8)]).toEqual([1, 0, 3, 0])
    expect(raster).toHaveLength(8 + 3)
    expect([...raster.subarray(9, 11)]).toEqual([0, 0])
  })

  it('leaves the pixels past a width that is not a whole byte as paper', () => {
    // 58mm paper is 384 dots (48 bytes, whole bytes), so a deliberately ragged
    // width is the one that exercises the padding path.
    const raster = sliceToRaster(image(4, 1, () => INK), 10)
    expect([...raster.subarray(4, 6)]).toEqual([2, 0])
    expect([raster[8], raster[9]]).toEqual([0xf0, 0x00])
  })
})
