import { beforeEach, describe, expect, it } from 'vitest'

import {
  getAutoPrintSale,
  getReceiptFooter,
  getReceiptHeader,
  getStoreLogo,
  readPrinterSettings,
  setAutoPrintSale,
  setStoreLogo,
  writePrinterSettings,
} from '@renderer/lib/thermalPrint'

describe('auto-print after sale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is on before anything is configured', () => {
    expect(getAutoPrintSale()).toBe(true)
  })

  it('reads the setting the Settings page writes', () => {
    localStorage.setItem('autoPrint', 'false')
    expect(getAutoPrintSale()).toBe(false)

    localStorage.setItem('autoPrint', 'true')
    expect(getAutoPrintSale()).toBe(true)
  })

  it('still honours the legacy key when the setting was never written', () => {
    localStorage.setItem('autoPrintAfterSale', 'false')
    expect(getAutoPrintSale()).toBe(false)
  })

  it('prefers the Settings page key over the legacy key', () => {
    localStorage.setItem('autoPrint', 'true')
    localStorage.setItem('autoPrintAfterSale', 'false')
    expect(getAutoPrintSale()).toBe(true)
  })

  it('round-trips through the shared setter and keeps the legacy key in sync', () => {
    setAutoPrintSale(false)
    expect(getAutoPrintSale()).toBe(false)
    expect(localStorage.getItem('autoPrint')).toBe('false')
    // Plugins built before the keys were unified still read this one.
    expect(localStorage.getItem('autoPrintAfterSale')).toBe('false')

    setAutoPrintSale(true)
    expect(getAutoPrintSale()).toBe(true)
  })
})

describe('store branding settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores the logo under both keys the app reads', () => {
    setStoreLogo('data:image/png;base64,AAA')
    expect(getStoreLogo()).toBe('data:image/png;base64,AAA')
    expect(localStorage.getItem('receiptLogo')).toBe('data:image/png;base64,AAA')
    expect(localStorage.getItem('storeLogo')).toBe('data:image/png;base64,AAA')
  })

  it('removes the logo from both keys', () => {
    setStoreLogo('data:image/png;base64,AAA')
    setStoreLogo(null)
    expect(getStoreLogo()).toBeNull()
    expect(localStorage.getItem('receiptLogo')).toBeNull()
    expect(localStorage.getItem('storeLogo')).toBeNull()
  })

  it('returns empty header and footer text when nothing was written', () => {
    expect(getReceiptHeader()).toBe('')
    expect(getReceiptFooter()).toBe('')
  })
})

describe('readPrinterSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('falls back to print-free defaults on a fresh install', () => {
    const settings = readPrinterSettings()
    expect(settings.printerType).toBe('none')
    expect(settings.paperWidth).toBe('80mm')
    expect(settings.receiptLanguage).toBe('en')
    expect(settings.receiptArabicMode).toBe('bitmap')
    expect(settings.receiptArabicEncoding).toBe('auto')
    expect(settings.receiptTemplate).toBe('classic')
    expect(settings.receiptDivider).toBe('dashed')
    expect(settings.receiptFontScale).toBe(1)
    expect(settings.receiptShowStoreDetails).toBe(true)
    expect(settings.printLogo).toBe(false)
  })

  it('reads back everything the Settings page persists', () => {
    writePrinterSettings({
      printerType: 'usb',
      printerName: 'XP-58C',
      paperWidth: '58mm',
      receiptLanguage: 'ar',
      receiptHeader: 'فرع وسط البلد',
      receiptFooter: 'شكرًا لزيارتكم',
      receiptTemplate: 'modern',
      receiptDivider: 'solid',
      receiptFontScale: 1.15,
      receiptLogoSize: 45,
      receiptLogoMono: true,
      printLogo: true,
      includeLogo: true,
      receiptShowStoreDetails: false,
      receiptBottomSpacing: 8,
      taxRate: 14,
    })
    setStoreLogo('data:image/png;base64,BBB')

    const settings = readPrinterSettings()
    expect(settings.printerType).toBe('usb')
    expect(settings.printerName).toBe('XP-58C')
    expect(settings.paperWidth).toBe('58mm')
    expect(settings.receiptLanguage).toBe('ar')
    expect(settings.receiptHeader).toBe('فرع وسط البلد')
    expect(settings.receiptFooter).toBe('شكرًا لزيارتكم')
    expect(settings.receiptTemplate).toBe('modern')
    expect(settings.receiptDivider).toBe('solid')
    expect(settings.receiptFontScale).toBe(1.15)
    expect(settings.receiptLogoSize).toBe(45)
    expect(settings.receiptLogoMono).toBe(true)
    expect(settings.printLogo).toBe(true)
    expect(settings.receiptShowStoreDetails).toBe(false)
    expect(settings.receiptBottomSpacing).toBe(8)
    expect(settings.receiptLogo).toBe('data:image/png;base64,BBB')
  })

  it('leaves keys alone when a patch value is undefined', () => {
    writePrinterSettings({ printerName: 'XP-58C' })
    writePrinterSettings({ printerName: undefined, paperWidth: '58mm' })
    expect(localStorage.getItem('printerName')).toBe('XP-58C')
    expect(localStorage.getItem('paperWidth')).toBe('58mm')
  })

  it('ignores unparsable numbers instead of printing NaN widths', () => {
    writePrinterSettings({ printerPort: 'not-a-number', receiptFontScale: '' })
    const settings = readPrinterSettings()
    expect(settings.printerPort).toBe(9100)
    expect(settings.receiptFontScale).toBe(1)
  })
})
