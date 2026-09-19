/**
 * Single source of truth for thermal receipt printing in the renderer.
 *
 * Printer + branding settings live in localStorage under the keys the Settings
 * page writes, so every plugin reads and writes the same values.
 */

export type PaperWidth = '58mm' | '80mm'
export type PrinterType = 'none' | 'usb' | 'network' | 'html'
export type ReceiptLanguage = 'en' | 'ar' | 'both'
export type ArabicMode = 'bitmap' | 'codepage'
/**
 * Arabic code page for `codepage` mode. CP864 carries the joined letter forms,
 * WPC1256 the plain letters, and printers rarely support both.
 */
export type ArabicEncoding = 'cp864' | 'win1256'
/**
 * `auto` lets the app pick the code page that can write this receipt, so nobody
 * has to know what the printer's ROM follows.
 */
export type ArabicEncodingPref = ArabicEncoding | 'auto'
/** Graphics receipt style. */
export type ReceiptTemplate = 'classic' | 'compact' | 'modern'
/** Separator drawn between receipt blocks. */
export type ReceiptDivider = 'dashed' | 'solid' | 'double' | 'none'

/** Printer dots per paper width — the raster renderer works in printer dots. */
export const PAPER_DOTS: Record<PaperWidth, number> = { '58mm': 384, '80mm': 576 }

export interface PrinterSettings {
  printerType: PrinterType
  printerName: string
  printerIP: string
  printerPort: number
  paperWidth: PaperWidth
  characterSet?: string
  receiptLanguage: ReceiptLanguage
  /** `bitmap` rasterises the receipt (needed for Arabic); `codepage` uses the ROM font. */
  receiptArabicMode: ArabicMode
  /**
   * Code page for `codepage` mode; ignored while the receipt is rasterised.
   * `auto` picks the page that can write this receipt's Arabic.
   */
  receiptArabicEncoding: ArabicEncodingPref
  printLogo: boolean
  /** Logo as a PNG/JPEG data URL, printed above the store name. */
  receiptLogo?: string
  printQRCode: boolean
  printBarcode: boolean
  openCashDrawer: boolean
  receiptHeader: string
  receiptFooter: string
  receiptBottomSpacing: number
  /** Graphics template: classic, compact or modern. */
  receiptTemplate: ReceiptTemplate
  /** Separator drawn between receipt blocks. */
  receiptDivider: ReceiptDivider
  /** Font size multiplier for the graphics receipt, 0.8 - 1.2. */
  receiptFontScale: number
  /** Logo width as a percentage of the paper width, 20 - 100. */
  receiptLogoSize: number
  /** Threshold the logo to pure black and white, which is all a thermal head prints. */
  receiptLogoMono: boolean
  /** Print address, phone and email under the store name. */
  receiptShowStoreDetails: boolean
}

export interface DetectedPrinter {
  path: string
  name: string
  driver?: string
  port?: string
  status?: string
  isDefault?: boolean
  isThermal?: boolean
  isOffline?: boolean
  portLive?: boolean
  stuckJobs?: number
  problem?: string
  /** Driver paper name, e.g. "58 x 210 mm". */
  paperSize?: string
  /** Paper width guessed from the driver or the printer name. */
  paperWidth?: PaperWidth
  /** Port family, which decides how a broken queue can be repaired. */
  portKind?: 'usb' | 'network' | 'parallel' | 'wsd' | 'share' | 'virtual' | 'other'
  /** A queue that never reaches paper: PDF, XPS, OneNote, Fax. */
  isVirtual?: boolean
  /** 0-100: how likely this queue is the receipt printer. */
  confidence?: number
}

export interface AutoConnectResult {
  success: boolean
  message: string
  printer?: DetectedPrinter
  paperWidth?: PaperWidth
  /** 0-100: how sure we are that `printer` is the receipt printer. */
  confidence: number
  /** Repairs applied while looking for a working queue. */
  repaired: string[]
  diagnosis?: PrinterDiagnosis
  /** A USB print device is present but no queue uses its port. */
  needsQueue?: { port: string; device?: string }
  candidates: DetectedPrinter[]
}

/** A receipt rendered by the main process for the live preview. */
export interface ReceiptPreview {
  /** Paper width, in printer dots. */
  width: number
  /** Full receipt height in dots, added up from the slices. */
  totalHeight: number
  /** Code page the Arabic text path will use, or `null` when the receipt does
   * not go through an Arabic code page (graphics printing, non-Arabic text). */
  encoding: ArabicEncoding | null
  /** True when this receipt prints as graphics instead of ESC/POS text. */
  raster: boolean
  /** Arabic letters the chosen code page cannot write; non-empty means code-page
   * mode fell back to graphics for this receipt. */
  missingGlyphs: string[]
  slices: Array<{ dataUrl: string; offset: number; height: number }>
}

export interface PrinterDiagnosis {
  printerName?: string
  found: boolean
  isOffline: boolean
  port?: string
  portLive?: boolean
  liveUsbPorts: string[]
  suggestedPort?: string
  stuckJobs: number
  issues: Array<{ code: 'not-found' | 'offline' | 'dead-port' | 'stuck-jobs' | 'hardware'; message: string }>
  repairable: boolean
}

/** Keys shared by the Settings page and every plugin's print path. */
export const STORE_KEYS = {
  storeName: 'storeName',
  storeAddress: 'storeAddress',
  storePhone: 'storePhone',
  storeEmail: 'storeEmail',
  taxNumber: 'taxNumber',
  commercialRegister: 'commercialRegister',
} as const

/** Read a printer setting, falling back to the value the Settings page defaults to. */
export function readPrinterSettings(): PrinterSettings {
  const num = (key: string, fallback: number): number => {
    const raw = localStorage.getItem(key)
    const parsed = raw === null ? NaN : parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const float = (key: string, fallback: number): number => {
    const raw = localStorage.getItem(key)
    const parsed = raw === null ? NaN : parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return {
    printerType: (localStorage.getItem('printerType') as PrinterType) || 'none',
    printerName: localStorage.getItem('printerName') || '',
    printerIP: localStorage.getItem('printerIP') || '',
    printerPort: num('printerPort', 9100),
    paperWidth: (localStorage.getItem('paperWidth') as PaperWidth) || '80mm',
    characterSet: localStorage.getItem('printerCharacterSet') || undefined,
    receiptLanguage: (localStorage.getItem('receiptLanguage') as ReceiptLanguage) || 'en',
    receiptArabicMode: (localStorage.getItem('receiptArabicMode') as ArabicMode) || 'bitmap',
    receiptArabicEncoding:
      (localStorage.getItem('receiptArabicEncoding') as ArabicEncodingPref) || 'auto',
    printLogo: localStorage.getItem('printLogo') === 'true' || localStorage.getItem('includeLogo') === 'true',
    receiptLogo: getStoreLogo() || undefined,
    printQRCode: localStorage.getItem('printQRCode') === 'true',
    printBarcode: localStorage.getItem('printBarcode') === 'true',
    openCashDrawer: localStorage.getItem('openCashDrawer') === 'true',
    receiptHeader: localStorage.getItem('receiptHeader') || '',
    receiptFooter: localStorage.getItem('receiptFooter') || '',
    receiptBottomSpacing: num('receiptBottomSpacing', 4),
    receiptTemplate: (localStorage.getItem('receiptTemplate') as ReceiptTemplate) || 'classic',
    receiptDivider: (localStorage.getItem('receiptDivider') as ReceiptDivider) || 'dashed',
    receiptFontScale: float('receiptFontScale', 1),
    receiptLogoSize: num('receiptLogoSize', 70),
    receiptLogoMono: localStorage.getItem('receiptLogoMono') === 'true',
    receiptShowStoreDetails: localStorage.getItem('receiptShowStoreDetails') !== 'false',
  }
}

/** Persist a subset of printer settings. `undefined` values are left untouched. */
export function writePrinterSettings(patch: Partial<Record<string, string | number | boolean | undefined>>): void {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    localStorage.setItem(key, String(value))
  }
}

/**
 * The uploaded logo, as a data URL. `receiptLogo` is what the Settings page
 * writes; `storeLogo` is the older key the plugins read.
 */
export function getStoreLogo(): string | null {
  return localStorage.getItem('receiptLogo') || localStorage.getItem('storeLogo') || null
}

export function setStoreLogo(dataUrl: string | null): void {
  if (dataUrl) {
    localStorage.setItem('receiptLogo', dataUrl)
    localStorage.setItem('storeLogo', dataUrl)
  } else {
    localStorage.removeItem('receiptLogo')
    localStorage.removeItem('storeLogo')
  }
}

export function getReceiptHeader(): string {
  return localStorage.getItem('receiptHeader') || ''
}

export function getReceiptFooter(): string {
  return localStorage.getItem('receiptFooter') || ''
}

/**
 * Auto-print after a completed sale; on unless switched off.
 *
 * `autoPrint` is the switch in Settings → Tax & Receipt → *Tax & rules*, and is
 * the single source of truth shared with every plugin's POS screen. The older
 * `autoPrintAfterSale` key is still read so machines configured before the two
 * were unified keep the choice they were given.
 */
export function getAutoPrintSale(): boolean {
  const stored = localStorage.getItem('autoPrint') ?? localStorage.getItem('autoPrintAfterSale')
  return stored !== 'false'
}

export function setAutoPrintSale(enabled: boolean): void {
  localStorage.setItem('autoPrint', String(enabled))
  localStorage.setItem('autoPrintAfterSale', String(enabled))
}

/**
 * Read an image file into a data URL no wider than `maxWidth`, downscaled on a
 * canvas. Thermal renderers draw at 1 px per printer dot, so a huge logo would
 * otherwise be cropped and a > 384 px one would overflow the paper.
 */
export async function readLogoFile(
  file: File,
  maxWidth = PAPER_DOTS['58mm'],
): Promise<{ dataUrl: string; width: number; height: number }> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Not a readable image file'))
    img.src = source
  })

  const scale = Math.min(1, maxWidth / image.naturalWidth)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  // Keep logos small enough for localStorage and the IPC payload.
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl: source, width: image.naturalWidth, height: image.naturalHeight }
  ctx.drawImage(image, 0, 0, width, height)
  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

interface ThermalReceiptsApi {
  print: (data: any) => Promise<any>
  detectPrinters: (options?: {
    printerIP?: string
    preferred?: string
  }) => Promise<{ success: boolean; printers: DetectedPrinter[]; recommended?: string; error?: string }>
  testPrint: (settings: any) => Promise<{ success: boolean; message: string }>
  diagnosePrinter: (settings: any) => Promise<{ success: boolean; diagnosis?: PrinterDiagnosis; error?: string }>
  repairPrinter: (settings: any) => Promise<{
    success: boolean
    message: string
    changes: string[]
    diagnosis?: PrinterDiagnosis
  }>
  autoConnect: (settings?: any) => Promise<AutoConnectResult>
  createQueue: (data: {
    printerName: string
    port: string
  }) => Promise<{ success: boolean; message: string; printerName: string }>
  renderPreview: (data: {
    receiptData: any
    settings: any
  }) => Promise<{ success: boolean; preview?: ReceiptPreview; error?: string }>
}

export const RECEIPT_TEMPLATES: ReceiptTemplate[] = ['classic', 'compact', 'modern']
export const RECEIPT_DIVIDERS: ReceiptDivider[] = ['dashed', 'solid', 'double', 'none']

function api(): ThermalReceiptsApi | undefined {
  return (window as any).api?.thermalReceipts
}

export async function detectPrinters(options?: {
  printerIP?: string
  preferred?: string
}): Promise<{
  success: boolean
  printers: DetectedPrinter[]
  recommended?: string
  error?: string
}> {
  const thermal = api()
  if (!thermal) return { success: false, printers: [], error: 'Receipt printing is unavailable.' }
  return thermal.detectPrinters(options)
}

const UNAVAILABLE = 'Receipt printing is unavailable.'

/**
 * Find and prepare the best receipt printer on this machine, whatever it is.
 * Repairs a saved-but-broken queue first, so an old printer that moved USB
 * socket keeps working without the user touching Windows settings.
 */
export async function autoConnect(
  settingsOverride?: Partial<PrinterSettings>,
): Promise<AutoConnectResult> {
  const thermal = api()
  const settings = { ...readPrinterSettings(), ...settingsOverride }
  if (!thermal) {
    return { success: false, message: UNAVAILABLE, confidence: 0, repaired: [], candidates: [] }
  }
  return thermal.autoConnect(settings)
}

/** Create a raw pass-through queue for a printer Windows has no driver for. */
export async function createQueue(
  printerName: string,
  port: string,
): Promise<{ success: boolean; message: string; printerName: string }> {
  const thermal = api()
  if (!thermal) return { success: false, message: UNAVAILABLE, printerName }
  return thermal.createQueue({ printerName, port })
}

/**
 * Ask the main process to rasterise a receipt for the live preview: the same
 * code path as the print job, so the preview is the paper.
 */
export async function renderPreview(
  receiptData: any,
  settingsOverride?: Partial<PrinterSettings>,
): Promise<{ success: boolean; preview?: ReceiptPreview; error?: string }> {
  const thermal = api()
  if (!thermal) return { success: false, error: UNAVAILABLE }
  const settings = { ...readPrinterSettings(), ...settingsOverride }
  const fallbackLogo = settings.printLogo ? getStoreLogo() ?? undefined : undefined
  try {
    return await thermal.renderPreview({
      receiptData: { ...receiptData, storeLogo: receiptData?.storeLogo ?? fallbackLogo },
      settings,
    })
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not render the preview.' }
  }
}

export async function testPrint(settings: PrinterSettings): Promise<{ success: boolean; message: string }> {
  const thermal = api()
  if (!thermal) return { success: false, message: 'Receipt printing is unavailable.' }
  return thermal.testPrint(settings)
}

export async function diagnosePrinter(
  settings: PrinterSettings,
): Promise<{ success: boolean; diagnosis?: PrinterDiagnosis; error?: string }> {
  const thermal = api()
  if (!thermal) return { success: false, error: 'Receipt printing is unavailable.' }
  return thermal.diagnosePrinter(settings)
}

export async function repairPrinter(settings: PrinterSettings): Promise<{
  success: boolean
  message: string
  changes: string[]
  diagnosis?: PrinterDiagnosis
}> {
  const thermal = api()
  if (!thermal) return { success: false, message: 'Receipt printing is unavailable.', changes: [] }
  return thermal.repairPrinter(settings)
}

/**
 * Send a receipt to the printer. Returns the raw IPC result so callers can
 * surface `detectedPrinter`/`message`, and never throws.
 */
export async function printReceipt(
  receiptData: any,
  settingsOverride?: Partial<PrinterSettings>,
): Promise<{ success: boolean; error?: string; detectedPrinter?: string; message?: string }> {
  const thermal = api()
  if (!thermal) return { success: false, error: 'Receipt printing is unavailable.' }
  const settings = { ...readPrinterSettings(), ...settingsOverride }
  // Plugins only carry a logo when logo printing is on; fill it in otherwise.
  const fallbackLogo = settings.printLogo ? getStoreLogo() ?? undefined : undefined
  try {
    return await thermal.print({
      receiptData: { ...receiptData, storeLogo: receiptData?.storeLogo ?? fallbackLogo },
      settings,
    })
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to print receipt' }
  }
}

/**
 * The translation key (and params) for the main problem with a detected printer,
 * so the caller can render it in the active language.
 */
export function printerWarning(
  printer: DetectedPrinter,
): { key: string; params?: Record<string, string | number> } | null {
  if (printer.isOffline) return { key: 'trPrinterOffline' }
  if (printer.portLive === false) {
    return printer.port
      ? { key: 'trPrinterDeadPort', params: { port: printer.port } }
      : { key: 'trPrinterPortUnknown' }
  }
  if (printer.problem) return { key: 'trPrinterProblem', params: { problem: printer.problem } }
  if (printer.stuckJobs) return { key: 'trPrinterStuckJobs', params: { count: printer.stuckJobs } }
  return null
}
