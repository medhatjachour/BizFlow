/**
 * Thermal Printer Service
 * Handles thermal printer communication for Egyptian receipts
 * Uses node-thermal-printer for raw ESC/POS commands
 */

import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer'
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as net from 'net'
import { createLogger } from '../utils/logger'
import {
  ARABIC_CODE_PAGES,
  ARABIC_ENCODINGS,
  ArabicEncoding,
  ArabicEncodingPref,
  chooseArabicEncoding,
  containsArabic,
  encodeLine,
  isArabicEncoding,
  resolveArabicEncoding,
  resolveArabicEncodingPref,
  shapeAndOrder,
  shapeArabic,
  stripInvisible,
  toVisualOrderLtr,
  unsupportedGlyphs,
} from './thermal/arabic'
import { getReceiptLabels } from './thermal/labels'
import { saleAdjustmentRows, saleGratuityRow } from './thermal/adjustments'
import {
  buildReceiptHtml,
  renderReceiptSlices,
  receiptWidthDots,
  sliceToRaster,
} from './thermal/receiptImage'
import type {
  ReceiptDivider,
  ReceiptSlice,
  ReceiptTemplate,
} from './thermal/receiptImage'

const log = createLogger('ThermalPrinter')

const execAsync = promisify(exec)

export interface PrinterSettings {
  printerType: 'none' | 'usb' | 'network' | 'html'
  printerName?: string
  printerIP?: string
  paperWidth: '58mm' | '80mm'
  receiptBottomSpacing?: number
  printLogo?: boolean
  /** PNG data URL (or bare base64) printed at the top of the receipt. */
  receiptLogo?: string
  /** Free text printed above the store name. */
  receiptHeader?: string
  /** Free text printed below the thank-you lines. */
  receiptFooter?: string
  printQRCode?: boolean
  printBarcode?: boolean
  openCashDrawer?: boolean
  receiptLanguage?: 'en' | 'ar'
  /**
   * Code page used for Arabic text: CP864 (shaped), WPC1256 (base letters), or
   * `auto` (default) to pick whichever page can write this receipt's own text.
   */
  receiptArabicEncoding?: ArabicEncodingPref
  /**
   * How Arabic receipts reach the printer.
   * `bitmap` (default) rasterises the receipt with Chromium and streams it as
   * graphics — required for printers whose font ROM has no Arabic code page
   * (most 58mm units, e.g. the XP-58C). `codepage` keeps the fast ESC/POS text
   * path for printers that do have an Arabic font.
   */
  receiptArabicMode?: 'bitmap' | 'codepage'
  /** Overall look of the graphics (bitmap) receipt. */
  receiptTemplate?: ReceiptTemplate
  /** Separator drawn between receipt blocks. */
  receiptDivider?: ReceiptDivider
  /** Font size multiplier for the graphics receipt, 0.8 - 1.2. */
  receiptFontScale?: number
  /** Logo width as a percentage of the paper width, 20 - 100. */
  receiptLogoSize?: number
  /** Threshold the logo to black and white, which is all a thermal head prints. */
  receiptLogoMono?: boolean
  /** Print address, phone and email under the store name. */
  receiptShowStoreDetails?: boolean
}

export interface DetectedPrinter {
  /** Value stored in `printerName`. */
  path: string
  /** Human readable label, includes the driver when Windows reports one. */
  name: string
  driver?: string
  port?: string
  status?: string
  isDefault?: boolean
  /** Name/driver looks like a receipt printer rather than an office printer. */
  isThermal?: boolean
  /** Windows has the queue switched to "Use Printer Offline", or the device is gone. */
  isOffline?: boolean
  /**
   * The queue's port has a live USB print device behind it. Windows keeps one
   * `USB00x` port per socket, so a queue pointing at a port the printer is not
   * plugged into looks perfectly healthy while every job silently fails.
   */
  portLive?: boolean
  /** Errored / blocked jobs sitting in this queue. */
  stuckJobs?: number
  /** Hardware problem reported by the driver, e.g. `no-paper`. */
  problem?: string
  /** Paper size the driver reports, when the platform knows it. */
  paperSize?: string
  /** Paper width guessed from the paper name or the queue name. */
  paperWidth?: '58mm' | '80mm'
  /** Port family, which decides how a queue can be fixed. */
  portKind?: 'usb' | 'network' | 'parallel' | 'wsd' | 'share' | 'virtual' | 'other'
  /** A queue that never reaches paper: PDF, XPS, OneNote, Fax. */
  isVirtual?: boolean
  /** 0-100: how likely this queue is the receipt printer. */
  confidence?: number
}

/** What is wrong with a configured printer, and whether we can fix it. */
export interface PrinterDiagnosis {
  printerName?: string
  found: boolean
  isOffline: boolean
  port?: string
  portLive?: boolean
  /** USB ports that currently have a print device behind them. */
  liveUsbPorts: string[]
  /** Port from `liveUsbPorts` that this printer should probably be pointing at. */
  suggestedPort?: string
  stuckJobs: number
  issues: Array<{ code: 'not-found' | 'offline' | 'dead-port' | 'stuck-jobs' | 'hardware'; message: string }>
  /** True when `repairPrinter` can do something about the issues found. */
  repairable: boolean
}

/** Result of "connect to whatever receipt printer is plugged in". */
export interface AutoConnectResult {
  success: boolean
  message: string
  /** Queue that was selected; also present in `candidates`. */
  printer?: DetectedPrinter
  /** Paper width that fits the printer found. */
  paperWidth?: PrinterSettings['paperWidth']
  /** 0-100: how sure we are that `printer` is the receipt printer. */
  confidence: number
  /** Repairs applied while looking for a working queue. */
  repaired: string[]
  /** Diagnosis of the queue that was configured before connecting. */
  diagnosis?: PrinterDiagnosis
  /** A USB print device is present but no queue uses its port. */
  needsQueue?: { port: string; device?: string }
  /** Everything found, most likely receipt printer first. */
  candidates: DetectedPrinter[]
}

/** A receipt rendered for the Settings preview: one PNG per printed slice. */
export interface ReceiptPreview {
  /** Paper width, in printer dots. */
  width: number
  /** Full receipt height in dots, added up from the slices. */
  totalHeight: number
  /** Code page the Arabic text path would use, so `auto` can be shown to the
   * user. `null` when no code page is involved: graphics printing and
   * non-Arabic receipts never reach an Arabic code page. */
  encoding: ArabicEncoding | null
  /** True when this receipt prints as graphics instead of ESC/POS text. */
  raster: boolean
  /** Arabic characters the chosen code page cannot write. Non-empty means the
   * receipt went down the graphics path even though code-page mode was asked for. */
  missingGlyphs: string[]
  slices: Array<{ dataUrl: string; offset: number; height: number }>
}

export interface ReceiptData {
  // Store info
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail?: string
  taxNumber: string
  commercialRegister?: string
  
  // Transaction info
  receiptNumber: string
  date: Date
  paymentMethod: string
  
  // Items
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
    discountType?: string
    discountValue?: number
    finalPrice?: number
  }>
  
  // Totals
  subtotal: number
  tax: number
  taxRate: number
  total: number
  /** Sale-level discount amount, printed as its own row above the VAT line. */
  discount?: number
  /** `PERCENTAGE` labels the discount row with `discountRate`. */
  discountType?: string
  discountRate?: number
  /** Restaurant-style service charge and gratuity, printed above the total. */
  serviceCharge?: number
  tipAmount?: number
  
  // Optional
  username?: string
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  orderType?: string
  tableName?: string
  guestCount?: number
  shiftName?: string
  openedAt?: Date
  closedAt?: Date
  notes?: string
  /** Payload for the QR code when `printQRCode` is on. Defaults to the receipt number. */
  qrData?: string
  /** Payload for the barcode when `printBarcode` is on. Defaults to the receipt number. */
  barcodeData?: string
  
  // Installments
  installments?: Array<{
    amount: number
    dueDate: Date
    status: string
  }>
  depositAmount?: number
}

const splitList = (value: string | undefined, separator: string): string[] =>
  (value || '').split(separator).map(entry => entry.trim()).filter(Boolean)

/** Port families a Windows or CUPS queue can point at. */
export function classifyPort(port: string | undefined): DetectedPrinter['portKind'] {
  const value = (port || '').trim()
  if (!value) return undefined
  if (/^USB\d+/i.test(value)) return 'usb'
  if (/^(IP_|tcp|socket|ipp|http)/i.test(value) || /^(\d{1,3}\.){3}\d{1,3}/.test(value)) return 'network'
  if (/^LPT\d+/i.test(value)) return 'parallel'
  if (/^WSD/i.test(value)) return 'wsd'
  if (value.startsWith('\\\\')) return 'share'
  if (/^(PORTPROMPT|FILE|nul|SHRFAX|\\?\\pipe)/i.test(value)) return 'virtual'
  return 'other'
}

/** Queues that can never reach a thermal head, whatever is plugged in. */
const VIRTUAL_PRINTER = /pdf|xps|onenote|fax|print to file/i

/**
 * Paper width from the driver's paper name, then from the queue name.
 * Windows reports 58mm rolls as "58 x 210 mm" and 80mm rolls as "80 x 297 mm",
 * and the printer names people buy ("XP-58C", "POS-80") carry it too.
 */
export function guessPaperWidth(paperSize: string | undefined, name: string): '58mm' | '80mm' | undefined {
  const haystack = `${paperSize || ''} ${name || ''}`
  if (/(^|\D)58(\D|$)/.test(haystack)) return '58mm'
  if (/(^|\D)80(\D|$)/.test(haystack)) return '80mm'
  return undefined
}

/** How likely a queue is the receipt printer, before anything is known about it. */
function baseConfidence(printer: DetectedPrinter): number {
  let value = 40
  if (printer.isThermal) value += 30
  if (/(^|[^a-z])(xp|pos|thermal|receipt)/i.test(printer.name)) value += 10
  if (printer.portKind === 'usb') value += 15
  else if (printer.portKind === 'network' || printer.portKind === 'parallel') value += 8
  if (printer.isDefault) value += 5
  if (printer.isVirtual || printer.portKind === 'virtual') value = Math.min(value, 5)
  if (printer.isOffline || printer.portLive === false) value -= 25
  if (printer.problem) value -= 20
  return Math.max(0, Math.min(100, value))
}

/** Lower is better. `preferred` is the queue the user already saved. */
export function scorePrinter(printer: DetectedPrinter, preferred?: string): number {
  let score = 50
  if (printer.isThermal) score -= 25
  else if (printer.portKind === 'usb') score -= 8
  if (printer.isVirtual) score += 80
  if (printer.portKind === 'virtual') score += 60
  if (printer.isOffline) score += 40
  if (printer.portLive === false) score += 35
  if (printer.problem) score += 30
  if ((printer.stuckJobs ?? 0) > 0) score += 10
  if (printer.isDefault) score -= 6
  if (printer.confidence) score -= Math.round(printer.confidence / 5)
  if (preferred && printer.path === preferred) score -= 30
  return Math.max(0, Math.min(120, score))
}

/** Everything found, most likely receipt printer first. */
export function rankPrinters(printers: DetectedPrinter[], preferred?: string): DetectedPrinter[] {
  return printers
    .map(printer => ({ printer, score: scorePrinter(printer, preferred) }))
    .sort((a, b) => a.score - b.score || a.printer.name.localeCompare(b.printer.name))
    .map(entry => entry.printer)
}

/** True when this queue can physically reach a thermal head right now. */
export function isUsablePrinter(printer: DetectedPrinter): boolean {
  if (printer.isVirtual || printer.portKind === 'virtual') return false
  if (printer.isOffline || printer.problem) return false
  return printer.portLive !== false
}

/** The queue we would print to, or undefined when nothing can print. */
export function pickBestPrinter(
  printers: DetectedPrinter[],
  preferred?: string,
): DetectedPrinter | undefined {
  return rankPrinters(printers, preferred).find(printer => isUsablePrinter(printer))
}

export class ThermalPrinterService {
  /**
   * Sanitize printer name to prevent command injection
   */
  private static sanitizePrinterName(name: string): string {
    // Allow only alphanumeric, dash, underscore, dot, and forward slash
    return name.replace(/[^a-zA-Z0-9\-_./]/g, '')
  }

  /**
   * Sanitize IP address
   */
  private static sanitizeIP(ip: string): string {
    // Validate IP format (IPv4)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ip)) {
      throw new Error('Invalid IP address format')
    }
    return ip
  }

  /**
   * Print to CUPS printer using lp command with raw ESC/POS data
   */
  private static async printToCUPS(printerName: string, data: string, settings: PrinterSettings): Promise<void> {
    // Sanitize printer name to prevent command injection
    const safePrinterName = this.sanitizePrinterName(printerName)
    if (!safePrinterName || safePrinterName.length === 0) {
      throw new Error('Invalid printer name')
    }

    // Create temp file with ESC/POS commands + text data + cut command
    const tempFile = path.join(os.tmpdir(), `receipt-${Date.now()}.bin`)
    
    // ESC/POS initialization commands
    const initCommand = Buffer.from([0x1B, 0x40]) // ESC @ - Initialize printer
    
    // Set left margin to 0 (GS L)
    const leftMargin = Buffer.from([0x1D, 0x4C, 0x00, 0x00])
    
    // Set print area width based on paper width
    // GS W - Set printing area width
    // For 80mm paper: 576 dots (0x40, 0x02) at 203 DPI
    // For 58mm paper: 384 dots (0x80, 0x01) at 203 DPI
    let printWidth: Buffer
    if (settings.paperWidth === '80mm') {
      printWidth = Buffer.from([0x1D, 0x57, 0x40, 0x02]) // 576 dots for 80mm
    } else {
      printWidth = Buffer.from([0x1D, 0x57, 0x80, 0x01]) // 384 dots for 58mm
    }
    
    const textBuffer = Buffer.from(data, 'utf8')
    
    // Add ESC/POS cut command: GS V 0 (Full cut)
    const cutCommand = Buffer.from([0x1D, 0x56, 0x00])
    
    // Combine all commands
    const fullBuffer = Buffer.concat([initCommand, leftMargin, printWidth, textBuffer, cutCommand])
    
    await fs.writeFile(tempFile, fullBuffer)

    try {
      // Print using lp command with raw option for ESC/POS commands
      await execAsync(`lp -d "${safePrinterName}" -o raw "${tempFile}"`)
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile)
      } catch (e) {
        log.error(`Failed to delete temporary print file "${tempFile}":`, e)
      }
    }
  }

  // ─── Text layout ────────────────────────────────────────────────
  // A thermal printer prints left to right and has no text engine of its own, so
  // Arabic needs shaping plus a visual re-ordering, and the bytes must reach the
  // printer already encoded (see ./thermal/arabic). Everything below funnels the
  // receipt text through these two helpers so English output stays byte-identical
  // to what the printer already produced.

  /** Arabic receipts are laid out right to left. */
  private static isRtl(settings: PrinterSettings): boolean {
    return settings.receiptLanguage === 'ar'
  }

  private static receiptWidth(settings: PrinterSettings): number {
    return settings.paperWidth === '80mm' ? 48 : 32
  }

  /** Prepare one line for the active code page and append it to the buffer. */
  private static emit(
    printer: ThermalPrinter,
    text: string,
    settings: PrinterSettings,
    alreadyVisual = false,
  ): void {
    text = stripInvisible(text)
    if (!containsArabic(text)) {
      printer.println(text)
      return
    }

    const encoding = chooseArabicEncoding([text], settings.receiptArabicEncoding)
    let prepared = text
    if (!alreadyVisual) {
      prepared = this.isRtl(settings)
        ? shapeAndOrder(text, encoding)
        : toVisualOrderLtr(shapeArabic(text, encoding))
    }

    printer.append(encodeLine(prepared, encoding).buffer)
    printer.newLine()
  }

  /** One labelled value — right aligned on Arabic receipts, left aligned otherwise. */
  private static emitMeta(printer: ThermalPrinter, text: string, settings: PrinterSettings): void {
    const rtl = this.isRtl(settings)
    if (rtl) printer.alignRight()
    this.emit(printer, text, settings)
    if (rtl) printer.alignLeft()
  }

  /**
   * Force one line through a specific code page, ignoring `receiptArabicEncoding`.
   * `visual` is what the receipts use (glyphs reversed into reading order);
   * `logical` is the same text left in logical order, which only prints correctly
   * on a printer that lays Arabic out itself. Only the diagnostic page needs this.
   */
  private static emitEncoded(
    printer: ThermalPrinter,
    text: string,
    encoding: ArabicEncoding,
    order: 'visual' | 'logical' = 'visual',
  ): void {
    const prepared = order === 'visual'
      ? shapeAndOrder(text, encoding)
      : shapeArabic(text, encoding)
    printer.append(encodeLine(prepared, encoding).buffer)
    printer.newLine()
  }

  /**
   * Block separator in the ESC/POS text path. The printer has no line drawing, so
   * the style is written with characters; `none` only leaves the vertical space.
   */
  private static divider(printer: ThermalPrinter, settings: PrinterSettings): void {
    const width = this.receiptWidth(settings)
    switch (settings.receiptDivider) {
      case 'none':
        printer.newLine()
        return
      case 'solid':
        printer.println('='.repeat(width))
        return
      case 'double':
        printer.println('='.repeat(width))
        printer.println('='.repeat(width))
        return
      default:
        printer.drawLine()
    }
  }

  /** Split a free-text receipt header/footer into printable lines. */
  private static textLines(text?: string): string[] {
    return (text || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  }

  /** Column widths in characters, adjusted so they always fill the paper exactly. */
  private static columnWidths(
    cells: Array<{ width: number }>,
    total: number,
  ): number[] {
    const widths = cells.map(cell => Math.max(1, Math.round(total * cell.width)))
    const drift = total - widths.reduce((sum, w) => sum + w, 0)
    if (drift !== 0) {
      const widest = widths.indexOf(Math.max(...widths))
      widths[widest] = Math.max(1, widths[widest] + drift)
    }
    return widths
  }

  /**
   * A row of cells. Plain receipts keep the library's table layout; Arabic rows are
   * assembled here so the columns can be mirrored and every cell encoded correctly.
   */
  private static emitRow(
    printer: ThermalPrinter,
    cells: Array<{ text: string; align: 'LEFT' | 'CENTER' | 'RIGHT'; width: number; bold?: boolean }>,
    settings: PrinterSettings,
  ): void {
    const rtl = this.isRtl(settings)
    const hasArabic = cells.some(cell => containsArabic(cell.text))

    if (!rtl && !hasArabic) {
      printer.tableCustom(cells)
      return
    }

    const encoding = chooseArabicEncoding(cells.map(cell => cell.text), settings.receiptArabicEncoding)
    const ordered = rtl
      ? cells.slice().reverse().map(cell => ({
          ...cell,
          align: (cell.align === 'LEFT' ? 'RIGHT' : cell.align === 'RIGHT' ? 'LEFT' : 'CENTER') as
            'LEFT' | 'CENTER' | 'RIGHT',
        }))
      : cells

    const widths = this.columnWidths(ordered, this.receiptWidth(settings))
    let line = ''

    ordered.forEach((cell, index) => {
      const inner = widths[index]
      let text = cell.text
      if (containsArabic(text)) {
        text = rtl ? shapeAndOrder(text, encoding) : toVisualOrderLtr(shapeArabic(text, encoding))
      }

      const chars = Array.from(text)
      if (chars.length > inner) text = chars.slice(0, inner).join('')

      const pad = Math.max(0, inner - Array.from(text).length)
      if (cell.align === 'RIGHT') line += ' '.repeat(pad) + text
      else if (cell.align === 'CENTER') line += ' '.repeat(Math.floor(pad / 2)) + text + ' '.repeat(Math.ceil(pad / 2))
      else line += text + ' '.repeat(pad)
    })

    this.emit(printer, line.replace(/\s+$/, ''), settings, true)
  }

  /** Decode a `data:image/png;base64,...` (or bare base64) logo. */
  private static decodeLogo(logo: string): Buffer | null {
    const base64 = logo.includes(',') ? logo.slice(logo.indexOf(',') + 1) : logo
    try {
      const buffer = Buffer.from(base64, 'base64')
      return buffer.length > 8 && buffer.subarray(1, 4).toString('latin1') === 'PNG' ? buffer : null
    } catch {
      return null
    }
  }

  /** Logo, then the free-text header — both optional, both centered. */
  private static async printReceiptTop(
    printer: ThermalPrinter,
    settings: PrinterSettings,
  ): Promise<void> {
    printer.alignCenter()

    if (settings.printLogo && settings.receiptLogo) {
      const logo = this.decodeLogo(settings.receiptLogo)
      if (logo) {
        try {
          await printer.printImageBuffer(logo)
          printer.newLine()
        } catch (error: any) {
          log.warn('Skipping receipt logo:', error?.message || error)
        }
      } else {
        log.warn('Receipt logo is not a PNG image — skipping')
      }
    }

    const header = this.textLines(settings.receiptHeader)
    if (header.length > 0) {
      header.forEach(line => this.emit(printer, line, settings))
      printer.newLine()
    }
  }

  /**
   * Format receipt as plain text for thermal printing
   */
  private static formatReceiptText(data: ReceiptData, settings: PrinterSettings): string {
    const lbl = getReceiptLabels(settings.receiptLanguage || 'en')
    const locale = settings.receiptLanguage === 'ar' ? 'ar-EG' : 'en-US'
    const width = settings.paperWidth === '80mm' ? 48 : 32
    const line = '='.repeat(width)
    const dashes = '-'.repeat(width)
    
    let text = '\n'

    const header = this.textLines(settings.receiptHeader)
    if (header.length > 0) {
      header.forEach(line => { text += line + '\n' })
      text += '\n'
    }
    
    // Store name (centered)
    text += data.storeName.toUpperCase() + '\n'
    text += data.storeAddress + '\n'
    text += `${lbl.tel}: ${data.storePhone}\n`
    if (data.storeEmail) text += data.storeEmail + '\n'
    text += '\n'
    
    // Tax info
    text += dashes + '\n'
    text += `${lbl.taxNo}: ${data.taxNumber}\n`
    if (data.commercialRegister) text += `${lbl.commReg}: ${data.commercialRegister}\n`
    text += dashes + '\n'
    text += '\n'
    
    // Receipt info
    text += `${lbl.receiptNum}: ${data.receiptNumber}\n`
    text += `${lbl.date}: ${data.date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}\n`
    if (data.username) text += `${lbl.cashier}: ${data.username}\n`
    if (data.customerName) text += `${lbl.customer}: ${data.customerName}\n`
    if (data.customerPhone) text += `${lbl.phone}: ${data.customerPhone}\n`
    if (data.deliveryAddress) text += `${lbl.deliveryAddress}: ${data.deliveryAddress}\n`
    if (data.orderType) text += `${lbl.orderType}: ${data.orderType.replace('_', ' ')}\n`
    if (data.tableName) text += `${lbl.table}: ${data.tableName}\n`
    if (data.guestCount) text += `${lbl.guests}: ${data.guestCount}\n`
    if (data.shiftName) text += `${lbl.shift}: ${data.shiftName}\n`
    if (data.openedAt) text += `${lbl.openedAt}: ${new Date(data.openedAt).toLocaleString(locale)}\n`
    if (data.closedAt) text += `${lbl.closedAt}: ${new Date(data.closedAt).toLocaleString(locale)}\n`
    if (data.notes) text += `${lbl.notes}: ${data.notes}\n`
    text += dashes + '\n'
    
    // Items with discount calculation
    data.items.forEach(item => {
      const hasDiscount = item.discountType && item.discountType !== 'NONE' && item.discountValue !== undefined && item.discountValue > 0
      
      let originalPrice = item.price
      let itemDiscount = 0
      
      if (hasDiscount && item.discountValue !== undefined) {
        if (item.discountType === 'PERCENTAGE') {
          originalPrice = item.price / (1 - item.discountValue / 100)
          itemDiscount = (originalPrice * item.quantity) - (item.price * item.quantity)
        } else {
          originalPrice = item.price + (item.discountValue / item.quantity)
          itemDiscount = item.discountValue
        }
      }
      
      const originalTotal = originalPrice * item.quantity
      const finalTotal = item.price * item.quantity
      
      // Item details
      text += item.name + '\n'
      text += `${item.quantity} x ${originalPrice.toFixed(2)} = ${originalTotal.toFixed(2)} EGP\n`
      
      if (hasDiscount) {
        const discountLabel = item.discountType === 'PERCENTAGE'
          ? `${lbl.discount} ${item.discountValue}%`
          : lbl.fixedDiscount
        text += `${discountLabel}: -${itemDiscount.toFixed(2)} EGP\n`
        text += `${lbl.afterDiscount}: ${finalTotal.toFixed(2)} EGP\n`
      }
      
      text += dashes + '\n'
    })
    
    // Totals
    text += '\n'
    text += `${lbl.subtotal}: ${data.subtotal.toFixed(2)} EGP\n`
    saleAdjustmentRows(data, lbl).forEach(row => {
      text += `${row.label}: ${row.amount}\n`
    })
    // Nothing to declare when no tax was charged; a 0.00 VAT row is just noise.
    if (Number(data.tax) !== 0) {
      text += `${lbl.vat} (${data.taxRate}%): ${data.tax.toFixed(2)} EGP\n`
    }
    text += line + '\n'
    text += `${lbl.total}: ${data.total.toFixed(2)} EGP\n`
    // A tip is charged on top of the check total, so it prints after it.
    const gratuity = saleGratuityRow(data, lbl)
    if (gratuity) text += `${gratuity.label}: ${gratuity.amount}\n`
    text += line + '\n'
    text += '\n'
    
    // Payment
    text += `${lbl.payment}: ${data.paymentMethod}\n`
    
    // Installments
    if (data.installments && data.installments.length > 0) {
      text += '\n'
      text += dashes + '\n'
      text += `${lbl.installmentPlan}\n`
      text += dashes + '\n'
      
      if (data.depositAmount) {
        text += `${lbl.depositPaid}: ${data.depositAmount.toFixed(2)} EGP\n`
        text += '\n'
      }
      
      data.installments.forEach((inst, idx) => {
        const status = inst.status === 'paid' ? ` ${lbl.statusPaid}` : inst.status === 'overdue' ? ` ${lbl.statusOverdue}` : ''
        const dateStr = inst.dueDate.toLocaleDateString(locale, { month: '2-digit', day: '2-digit', year: '2-digit' })
        text += `#${idx + 1} ${dateStr}\n`
        text += `   ${inst.amount.toFixed(2)} EGP${status}\n`
      })
      
      const remaining = data.installments
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + i.amount, 0)
      
      text += dashes + '\n'
      text += `${lbl.remaining}: ${remaining.toFixed(2)} EGP\n`
    }
    
    text += '\n'
    text += `${lbl.thankYou}\n`
    text += `${lbl.appreciate}\n`

    const footer = this.textLines(settings.receiptFooter)
    if (footer.length > 0) {
      text += '\n'
      footer.forEach(line => { text += line + '\n' })
    }
    
    // Add blank lines for easy tearing
    const blankLines = settings.receiptBottomSpacing ?? 4
    text += '\n'.repeat(blankLines)
    
    return text
  }

  private static createPrinter(settings: PrinterSettings): ThermalPrinter {
    let printerInterface: string

    if (process.platform === 'win32') {
      // On Windows we build the ESC/POS buffer via node-thermal-printer's file interface,
      // then send it to the Windows spooler via winspool.drv P/Invoke.
      // The file path is a dummy — we call getBuffer() and never execute() on Windows.
      printerInterface = path.join(os.tmpdir(), `escpos-buf-${process.pid}`)
    } else if (settings.printerType === 'network' && settings.printerIP) {
      const safeIP = this.sanitizeIP(settings.printerIP)
      printerInterface = `tcp://${safeIP}:9100`
    } else if (settings.printerName) {
      if (settings.printerName.startsWith('usb://')) {
        printerInterface = settings.printerName
      } else if (settings.printerName.startsWith('/')) {
        printerInterface = settings.printerName
      } else {
        printerInterface = `printer:${settings.printerName}`
      }
    } else {
      printerInterface = '/dev/usb/lp0'
    }

    return new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: printerInterface,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      width: settings.paperWidth === '80mm' ? 48 : 32,
      // Start on the printer's power-on code page. Without this the library has no
      // active code page and throws on any non-ASCII character passed to print()/
      // println(); Arabic is always appended as pre-encoded bytes so this only ever
      // governs Latin text.
      characterSet: CharacterSet.PC437_USA,
    })
  }

  /**
   * Send a raw ESC/POS buffer to a Windows printer using winspool.drv P/Invoke.
   * This is the official Microsoft KB138594 method — no native Node.js addon required.
   * Works with ANY Electron version on Windows 10/11 with any thermal printer driver.
   */
  private static async printRawToWindowsSpooler(printerName: string, buffer: Buffer): Promise<void> {
    const ts         = Date.now()
    const dataFile   = path.join(os.tmpdir(), `escpos-${ts}.bin`)
    const scriptFile = path.join(os.tmpdir(), `winspool-${ts}.ps1`)

    // In PS single-quoted strings, only ' needs escaping (→ '')
    const safeName = printerName.replace(/'/g, "''")
    // Backslashes are literal in PS single-quoted strings — no escaping needed for paths
    const safeData = dataFile

    // Build the PowerShell script as an array of lines, joined with CRLF.
    // The heredoc @'...'@ uses single quotes so PS does NOT interpolate anything inside —
    // the C# double-quoted strings pass through unchanged.
    const psLines: string[] = [
      // ── C# type definition via single-quoted heredoc ─────────
      `Add-Type -TypeDefinition @'`,
      `using System;`,
      `using System.Runtime.InteropServices;`,
      `public class RawPrint {`,
      `  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]`,
      `  public class DocInfoA {`,
      `    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;`,
      `    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;`,
      `    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;`,
      `  }`,
      `  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]`,
      `  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);`,
      `  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]`,
      `  public static extern bool ClosePrinter(IntPtr hPrinter);`,
      `  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]`,
      `  public static extern int StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DocInfoA pDocInfo);`,
      `  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]`,
      `  public static extern bool EndDocPrinter(IntPtr hPrinter);`,
      `  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]`,
      `  public static extern bool StartPagePrinter(IntPtr hPrinter);`,
      `  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]`,
      `  public static extern bool EndPagePrinter(IntPtr hPrinter);`,
      `  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]`,
      `  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);`,
      `}`,
      `'@`,  // ← closing heredoc — must be at column 0
      // ── PowerShell logic ──────────────────────────────────────
      `$pn = '${safeName}'`,
      `$dp = '${safeData}'`,
      `$h  = [IntPtr]::Zero`,
      `if (-not [RawPrint]::OpenPrinter($pn, [ref]$h, [IntPtr]::Zero)) {`,
      `  throw "Cannot open printer '$pn'. Win32 error: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"`,
      `}`,
      `try {`,
      `  $di = New-Object RawPrint+DocInfoA`,
      `  $di.pDocName  = 'ESC/POS Receipt'`,
      `  $di.pDataType = 'RAW'`,
      `  if ([RawPrint]::StartDocPrinter($h, 1, $di) -le 0) {`,
      `    throw "StartDocPrinter failed. Win32 error: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"`,
      `  }`,
      `  [RawPrint]::StartPagePrinter($h) | Out-Null`,
      `  $bytes = [IO.File]::ReadAllBytes($dp)`,
      `  $ptr   = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)`,
      `  [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)`,
      `  $nw = 0`,
      `  $ok = [RawPrint]::WritePrinter($h, $ptr, $bytes.Length, [ref]$nw)`,
      `  [Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)`,
      `  [RawPrint]::EndPagePrinter($h) | Out-Null`,
      `  [RawPrint]::EndDocPrinter($h)  | Out-Null`,
      `  if (-not $ok) { throw "WritePrinter failed. Win32 error: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }`,
      `  Write-Host "OK: $nw bytes sent to $pn"`,
      `} finally {`,
      `  [RawPrint]::ClosePrinter($h) | Out-Null`,
      `}`,
    ]

    await fs.writeFile(dataFile, buffer)
    await fs.writeFile(scriptFile, psLines.join('\r\n'), 'utf8')

    try {
      const { stdout, stderr } = await execAsync(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptFile}"`,
        { timeout: 20000 }
      )
      log.info('🖨️  winspool result:', stdout.trim())
      if (stderr?.trim()) log.warn('🖨️  winspool stderr:', stderr.trim())
    } finally {
      try { await fs.unlink(dataFile)   } catch { /* ignore */ }
      try { await fs.unlink(scriptFile) } catch { /* ignore */ }
    }
  }

  /**
   * Format and print receipt via node-thermal-printer.
   * Design matches the HTML receipt preview exactly.
   * On Windows, pass windowsPrinterName to route via winspool.drv instead of execute().
   */
  /**
   * Compose a receipt into the printer buffer.
   * Split out of printing so the exact same layout can be rendered for previews,
   * tests and the code-page diagnostic without touching paper.
   */
  private static async buildReceipt(
    printer: ThermalPrinter,
    data: ReceiptData,
    settings: PrinterSettings,
  ): Promise<void> {
    // One code page for the whole receipt, resolved before the first line so the
    // header and the items can never disagree about it.
    settings = this.withResolvedArabicEncoding(data, settings)

    const lbl    = getReceiptLabels(settings.receiptLanguage || 'en')
    const locale = settings.receiptLanguage === 'ar' ? 'ar-EG' : 'en-US'
    const isAr   = settings.receiptLanguage === 'ar'

    // Abbreviated VAT label — keeps totals section from overflowing on 58mm
    const vatLabel = isAr
      ? `ض.ق.م (${data.taxRate}%):`
      : `${lbl.vat} (${data.taxRate}%):`

    // ── Logo & header ─────────────────────────────────────────────
    await this.printReceiptTop(printer, settings)

    // ── Store header ──────────────────────────────────────────────
    printer.alignCenter()
    printer.bold(true)
    this.emit(printer, data.storeName, settings)  // normal size — setTextSize(1,1) doubles width and causes truncation
    printer.bold(false)
    if (settings.receiptShowStoreDetails !== false) {
      if (data.storeAddress) this.emit(printer, data.storeAddress, settings)
      if (data.storePhone)   this.emit(printer, `${lbl.tel}: ${data.storePhone}`, settings)
      if (data.storeEmail)   printer.println(data.storeEmail)
    }
    printer.newLine()

    // ── Tax info ──────────────────────────────────────────────────
    this.divider(printer, settings)
    printer.alignLeft()
    if (data.taxNumber)          this.emitMeta(printer, `${lbl.taxNo}: ${data.taxNumber}`, settings)
    if (data.commercialRegister) this.emitMeta(printer, `${lbl.commReg}: ${data.commercialRegister}`, settings)
    this.divider(printer, settings)
    printer.newLine()

    // ── Transaction meta ──────────────────────────────────────────
    this.emitMeta(printer, `${lbl.receiptNum}: ${data.receiptNumber}`, settings)
    this.emitMeta(printer, `${lbl.date}: ${data.date.toLocaleString(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })}`, settings)
    if (data.username)      this.emitMeta(printer, `${lbl.cashier}: ${data.username}`, settings)
    if (data.customerName)  this.emitMeta(printer, `${lbl.customer}: ${data.customerName}`, settings)
    if (data.customerPhone) this.emitMeta(printer, `${lbl.phone}: ${data.customerPhone}`, settings)
    if (data.deliveryAddress) this.emitMeta(printer, `${lbl.deliveryAddress}: ${data.deliveryAddress}`, settings)
    if (data.orderType) this.emitMeta(printer, `${lbl.orderType}: ${data.orderType.replace('_', ' ')}`, settings)
    if (data.tableName) this.emitMeta(printer, `${lbl.table}: ${data.tableName}`, settings)
    if (data.guestCount) this.emitMeta(printer, `${lbl.guests}: ${data.guestCount}`, settings)
    if (data.shiftName) this.emitMeta(printer, `${lbl.shift}: ${data.shiftName}`, settings)
    if (data.openedAt) this.emitMeta(printer, `${lbl.openedAt}: ${new Date(data.openedAt).toLocaleString(locale)}`, settings)
    if (data.closedAt) this.emitMeta(printer, `${lbl.closedAt}: ${new Date(data.closedAt).toLocaleString(locale)}`, settings)
    if (data.notes) this.emitMeta(printer, `${lbl.notes}: ${data.notes}`, settings)
    this.divider(printer, settings)

    // ── Items ─────────────────────────────────────────────────────
    // Column header row — matches HTML table (Item | Qty | Price | Total)
    this.emitRow(printer, [
      { text: lbl.item,     align: 'LEFT',   width: 0.42 },
      { text: lbl.qty,      align: 'CENTER', width: 0.10 },
      { text: lbl.price,    align: 'RIGHT',  width: 0.22 },
      { text: lbl.totalCol, align: 'RIGHT',  width: 0.26 },
    ], settings)
    this.divider(printer, settings)

    data.items.forEach(item => {
      const hasDiscount = item.discountType &&
        item.discountType !== 'NONE' &&
        item.discountValue !== undefined &&
        item.discountValue > 0

      let originalPrice = item.price
      let itemDiscount  = 0

      if (hasDiscount && item.discountValue !== undefined) {
        if (item.discountType === 'PERCENTAGE') {
          originalPrice = item.price / (1 - item.discountValue / 100)
          itemDiscount  = (originalPrice * item.quantity) - (item.price * item.quantity)
        } else {
          originalPrice = item.price + (item.discountValue / item.quantity)
          itemDiscount  = item.discountValue
        }
      }

      const originalTotal = originalPrice * item.quantity
      const finalTotal    = item.price   * item.quantity

      if (isAr) {
        // A reversed four-column row would break long Arabic item names, so the
        // name gets its own right-aligned line and only the numbers stay tabular.
        this.emitMeta(printer, item.name, settings)
        this.emitRow(printer, [
          { text: String(item.quantity),    align: 'CENTER', width: 0.20 },
          { text: originalPrice.toFixed(2), align: 'RIGHT',  width: 0.40 },
          { text: originalTotal.toFixed(2), align: 'RIGHT',  width: 0.40 },
        ], settings)
      } else {
        // Data row — same 4-col layout as header
        this.emitRow(printer, [
          { text: item.name,                align: 'LEFT',   width: 0.42 },
          { text: String(item.quantity),    align: 'CENTER', width: 0.10 },
          { text: originalPrice.toFixed(2), align: 'RIGHT',  width: 0.22 },
          { text: originalTotal.toFixed(2), align: 'RIGHT',  width: 0.26 },
        ], settings)
      }

      if (hasDiscount && item.discountValue !== undefined) {
        const discLabel = item.discountType === 'PERCENTAGE'
          ? `${lbl.discount} ${item.discountValue}%`
          : lbl.fixedDiscount

        this.emitRow(printer, [
          { text: discLabel,                        align: 'LEFT',  width: 0.6 },
          { text: `-${itemDiscount.toFixed(2)} EGP`, align: 'RIGHT', width: 0.4 },
        ], settings)
        this.emitRow(printer, [
          { text: lbl.afterDiscount,               align: 'LEFT',  width: 0.6 },
          { text: `${finalTotal.toFixed(2)} EGP`,  align: 'RIGHT', width: 0.4 },
        ], settings)
      }
    })
    this.divider(printer, settings)

    // ── Totals ────────────────────────────────────────────────────
    printer.newLine()
    this.emitRow(printer, [
      { text: `${lbl.subtotal}:`,  align: 'LEFT',  width: 0.55 },
      { text: `${data.subtotal.toFixed(2)} EGP`, align: 'RIGHT', width: 0.45 },
    ], settings)
    saleAdjustmentRows(data, lbl).forEach(row => {
      this.emitRow(printer, [
        { text: `${row.label}:`, align: 'LEFT',  width: 0.55 },
        { text: row.amount,      align: 'RIGHT', width: 0.45 },
      ], settings)
    })
    // Nothing to declare when no tax was charged; a 0.00 VAT row is just noise.
    if (Number(data.tax) !== 0) {
      this.emitRow(printer, [
        { text: vatLabel,            align: 'LEFT',  width: 0.55 },
        { text: `${data.tax.toFixed(2)} EGP`,      align: 'RIGHT', width: 0.45 },
      ], settings)
    }
    this.divider(printer, settings)
    printer.bold(true)
    this.emitRow(printer, [
      { text: `${lbl.total}:`, align: 'LEFT',  width: 0.55, bold: true },
      { text: `${data.total.toFixed(2)} EGP`,  align: 'RIGHT', width: 0.45, bold: true },
    ], settings)
    printer.bold(false)
    // A tip is charged on top of the check total, so it prints after it.
    const gratuityRow = saleGratuityRow(data, lbl)
    if (gratuityRow) {
      this.emitRow(printer, [
        { text: `${gratuityRow.label}:`, align: 'LEFT',  width: 0.55 },
        { text: gratuityRow.amount,      align: 'RIGHT', width: 0.45 },
      ], settings)
    }
    this.divider(printer, settings)

    // ── Payment ───────────────────────────────────────────────────
    printer.newLine()
    printer.alignCenter()
    this.emit(printer, `${lbl.payment}: ${data.paymentMethod}`, settings)

    // ── Installments ──────────────────────────────────────────────
    if (data.installments && data.installments.length > 0) {
      printer.newLine()
      this.divider(printer, settings)
      printer.alignCenter()
      printer.bold(true)
      this.emit(printer, lbl.installmentPlan, settings)
      printer.bold(false)
      this.divider(printer, settings)
      printer.alignLeft()

      if (data.depositAmount) {
        this.emitRow(printer, [
          { text: `${lbl.depositPaid}:`,               align: 'LEFT',  width: 0.55 },
          { text: `${data.depositAmount.toFixed(2)} EGP`, align: 'RIGHT', width: 0.45 },
        ], settings)
        printer.newLine()
      }

      data.installments.forEach((inst, idx) => {
        const status  = inst.status === 'paid'    ? ` ${lbl.statusPaid}`
                      : inst.status === 'overdue' ? ` ${lbl.statusOverdue}` : ''
        const dateStr = inst.dueDate.toLocaleDateString(locale, {
          year: '2-digit', month: '2-digit', day: '2-digit',
        })
        this.emitRow(printer, [
          { text: `#${idx + 1}  ${dateStr}`,                   align: 'LEFT',  width: 0.55 },
          { text: `${inst.amount.toFixed(2)} EGP${status}`,    align: 'RIGHT', width: 0.45 },
        ], settings)
      })

      const remaining = data.installments
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + i.amount, 0)

      this.divider(printer, settings)
      printer.bold(true)
      this.emitRow(printer, [
        { text: `${lbl.remaining}:`, align: 'LEFT',  width: 0.55, bold: true },
        { text: `${remaining.toFixed(2)} EGP`,       align: 'RIGHT', width: 0.45, bold: true },
      ], settings)
      printer.bold(false)
    }

    // ── Footer ────────────────────────────────────────────────────
    printer.newLine()
    printer.alignCenter()
    this.emit(printer, lbl.thankYou, settings)
    this.emit(printer, lbl.appreciate, settings)
    this.textLines(settings.receiptFooter).forEach(line => this.emit(printer, line, settings))

    if (settings.printQRCode) {
      printer.printQR(data.qrData || data.receiptNumber, { cellSize: 6, correction: 'M' })
    }
    if (settings.printBarcode) {
      printer.printBarcode(data.barcodeData || data.receiptNumber)
    }

    const blankLines = settings.receiptBottomSpacing ?? 4
    for (let i = 0; i < blankLines; i++) printer.newLine()

    if (settings.openCashDrawer) printer.openCashDrawer()

    printer.cut()
  }

  /**
   * Build the ESC/POS byte stream for a receipt without sending it anywhere.
   * Used by the diagnostics page and by tests.
   */
  static async renderReceiptBuffer(
    data: ReceiptData,
    settings: PrinterSettings,
  ): Promise<Buffer> {
    const printer = this.createPrinter(settings)
    await this.buildReceipt(printer, data, settings)
    return printer.getBuffer()
  }

  /**
   * Should this receipt be sent as a raster image instead of ESC/POS text?
   * Arabic needs the bitmap path unless the printer is known to keep an Arabic
   * font on its ROM (`receiptArabicMode: 'codepage'`).
   *
   * The decision follows the receipt's own text, not the label language: a shop
   * that prints English receipts still sells products whose names are Arabic.
   */
  static shouldRasterise(data: ReceiptData, settings: PrinterSettings): boolean {
    if (settings.printerType === 'none' || settings.printerType === 'html') return false
    if ((settings.receiptArabicMode ?? 'bitmap') !== 'bitmap') return false
    return this.receiptHasArabic(data, settings)
  }

  /**
   * Arabic characters of this receipt that the configured code page cannot
   * write. `receiptArabicMode: 'codepage'` is a promise that Arabic reaches the
   * printer as text; when the page has no glyph for a letter, the text path
   * would drop it, so the caller falls back to graphics instead.
   */
  static missingGlyphs(data: ReceiptData, settings: PrinterSettings): string[] {
    if ((settings.receiptArabicMode ?? 'bitmap') !== 'codepage') return []
    if (!this.receiptHasArabic(data, settings)) return []

    const encoding = this.effectiveArabicEncoding(data, settings)
    const texts = this.receiptTexts(data, settings)

    const missing = new Set<string>()
    for (const text of texts) {
      for (const char of unsupportedGlyphs(text, encoding)) missing.add(char)
    }
    return [...missing]
  }

  /** Every string of this receipt that ends up on paper. */
  private static receiptTexts(data: ReceiptData, settings: PrinterSettings): string[] {
    return [
      ...Object.values(getReceiptLabels(settings.receiptLanguage === 'ar' ? 'ar' : 'en')),
      data.storeName,
      data.storeAddress,
      data.storePhone,
      data.storeEmail ?? '',
      data.customerName ?? '',
      data.notes ?? '',
      data.paymentMethod,
      settings.receiptHeader ?? '',
      settings.receiptFooter ?? '',
      ...data.items.map((item) => item.name),
    ]
  }

  /** True when anything on this receipt — labels included — is Arabic. */
  private static receiptHasArabic(data: ReceiptData, settings: PrinterSettings): boolean {
    return this.receiptTexts(data, settings).some((text) => containsArabic(text))
  }

  /**
   * Freeze the code page for one receipt.
   *
   * With `auto` the page has to be resolved once for the whole receipt: choosing
   * it per line lets one line go out through CP864 while the next needs WPC1256,
   * so a printer that only knows one of the two prints Arabic correctly in the
   * Settings test and garbled on a real sale. Resolving here also keeps `emit`
   * on the same page that `missingGlyphs` validated.
   */
  private static withResolvedArabicEncoding(
    data: ReceiptData,
    settings: PrinterSettings,
  ): PrinterSettings {
    if (isArabicEncoding(settings.receiptArabicEncoding)) return settings
    if (!this.receiptHasArabic(data, settings)) return settings
    return { ...settings, receiptArabicEncoding: this.effectiveArabicEncoding(data, settings) }
  }

  /**
   * Code page this receipt will really use. With `auto` the receipt text decides,
   * so nobody has to know whether their printer's ROM follows CP864 or WPC1256.
   */
  static effectiveArabicEncoding(data: ReceiptData, settings: PrinterSettings): ArabicEncoding {
    if (isArabicEncoding(settings.receiptArabicEncoding)) return settings.receiptArabicEncoding
    return chooseArabicEncoding(this.receiptTexts(data, settings), settings.receiptArabicEncoding)
  }

  /**
   * Rasterise a receipt into printer-dot slices.
   * Chromium does the Arabic shaping, so the glyphs are always correct.
   */
  static async renderReceiptImages(
    data: ReceiptData,
    settings: PrinterSettings,
  ): Promise<ReceiptSlice[]> {
    return renderReceiptSlices(buildReceiptHtml(data, settings), receiptWidthDots(settings))
  }

  /**
   * Rasterise a receipt for the Settings live preview. Same code path as the
   * print job, so the designer shows the real paper width and the real Arabic
   * shaping rather than an approximation.
   */
  static async renderReceiptPreview(
    data: ReceiptData,
    settings: PrinterSettings,
  ): Promise<ReceiptPreview> {
    const slices = await this.renderReceiptImages(data, settings)
    // Mirror printReceipt: a code page that cannot write a letter falls back to
    // graphics, so the preview shows the path this receipt will really take.
    const missingGlyphs = this.missingGlyphs(data, settings)
    const raster = this.shouldRasterise(data, settings) || missingGlyphs.length > 0
    return {
      width: receiptWidthDots(settings),
      totalHeight: slices.reduce((total, slice) => total + slice.height, 0),
      encoding:
        raster || !this.receiptHasArabic(data, settings)
          ? null
          : this.effectiveArabicEncoding(data, settings),
      raster,
      missingGlyphs,
      slices: slices.map((slice) => ({
        dataUrl: slice.image.toDataURL(),
        offset: slice.offset,
        height: slice.height,
      })),
    }
  }

  /**
   * Print a receipt as graphics. Used for Arabic on printers without an Arabic
   * code page — the QR code, cash-drawer kick and cut still travel as ESC/POS
   * commands in the same job.
   */
  private static async printRasterReceipt(
    data: ReceiptData,
    settings: PrinterSettings,
    windowsPrinterName?: string,
  ): Promise<void> {
    const width = receiptWidthDots(settings)
    const slices = await this.renderReceiptImages(data, settings)

    const printer = this.createPrinter(settings)

    // The rasters go in first: `append` writes straight to the buffer, so any
    // earlier command would be dropped by the print-image helpers.
    for (const slice of slices) printer.append(sliceToRaster(slice.image, width, slice.height))

    if (settings.printQRCode || settings.printBarcode) printer.alignCenter()
    if (settings.printQRCode) {
      printer.printQR(data.qrData || data.receiptNumber, { cellSize: 6, correction: 'M' })
    }
    if (settings.printBarcode) {
      printer.printBarcode(data.barcodeData || data.receiptNumber)
    }

    const blankLines = settings.receiptBottomSpacing ?? 4
    for (let i = 0; i < blankLines; i++) printer.newLine()

    if (settings.openCashDrawer) printer.openCashDrawer()
    printer.cut()

    if (windowsPrinterName) {
      await this.printRawToWindowsSpooler(windowsPrinterName, printer.getBuffer())
    } else {
      await printer.execute()
    }
  }

  private static async formatAndPrintReceipt(
    printer: ThermalPrinter,
    data: ReceiptData,
    settings: PrinterSettings,
    windowsPrinterName?: string,
  ): Promise<void> {
    await this.buildReceipt(printer, data, settings)

    // ── Execute ───────────────────────────────────────────────────
    if (windowsPrinterName) {
      // Windows: extract the raw ESC/POS buffer and send via winspool.drv
      await this.printRawToWindowsSpooler(windowsPrinterName, printer.getBuffer())
    } else {
      // Linux / macOS / Network: use node-thermal-printer's native interface
      await printer.execute()
    }
  }

  /**
   * Print receipt
   */
  static async printReceipt(data: ReceiptData, settings: PrinterSettings): Promise<void> {
    try {
      // CUPS (lp command) only exists on Linux / macOS — never call it on Windows
      const isNamedPrinter = settings.printerType === 'usb' &&
        settings.printerName &&
        !settings.printerName.startsWith('/') &&
        !settings.printerName.startsWith('tcp://')

      if (isNamedPrinter && process.platform !== 'win32') {
        const text = this.formatReceiptText(data, settings)
        await this.printToCUPS(settings.printerName!, text, settings)
        return
      }

      // Auto-detect if no printer configured
      if (settings.printerType === 'usb' && (!settings.printerName || settings.printerName === '/dev/usb/lp0')) {
        const detected = await this.detectUSBPrinters()
        if (detected.length > 0) {
          settings.printerName = detected[0].path
        } else {
          throw new Error('No thermal printers detected. Please connect your printer and configure it in Settings → Tax & Receipt Settings.')
        }
      }

      // Build ESC/POS buffer; on Windows send via winspool.drv; on Linux via node-thermal-printer
      const winPrinterName = process.platform === 'win32' ? settings.printerName : undefined

      // Arabic on a printer without an Arabic ROM goes out as graphics instead.
      const missingGlyphs = this.missingGlyphs(data, settings)
      if (this.shouldRasterise(data, settings) || missingGlyphs.length > 0) {
        if (missingGlyphs.length > 0) {
          log.warn(
            `Arabic code page ${ARABIC_CODE_PAGES[this.effectiveArabicEncoding(data, settings)].label} ` +
              `has no glyph for ${missingGlyphs.join(' ')} — printing the receipt as graphics.`
          )
        }
        await this.printRasterReceipt(data, settings, winPrinterName)
        return
      }

      const printer = this.createPrinter(settings)
      await this.formatAndPrintReceipt(printer, data, settings, winPrinterName)
    } catch (error: any) {
      log.error('❌ Print error:', error)
      // A queue that points at an empty USB socket, or the "Use Printer Offline"
      // flag, fails with an unhelpful spooler error — say what is really wrong.
      let detail = ''
      if (process.platform === 'win32' && settings.printerName) {
        detail = await this.diagnosePrinter(settings)
          .then(diagnosis => this.describeIssues(diagnosis))
          .catch(() => '')
      }
      throw new Error(`Failed to print: ${error.message}${detail}`)
    }
  }

  /**
   * Test printer
   */
  static async testPrinter(settings: PrinterSettings): Promise<{ success: boolean; message: string }> {
    try {
      // CUPS (lp command) only on Linux / macOS
      const isNamedPrinter = settings.printerType === 'usb' &&
        settings.printerName &&
        !settings.printerName.startsWith('/') &&
        !settings.printerName.startsWith('tcp://')

      if (isNamedPrinter && process.platform !== 'win32') {
        const testText = '\n' +
          'PRINTER TEST\n' +
          '================================\n' +
          '\n' +
          `Date: ${new Date().toLocaleString()}\n` +
          `Paper Width: ${settings.paperWidth}\n` +
          `Printer: ${settings.printerName}\n` +
          '\n' +
          '================================\n' +
          '\nTest Successful!\n\n\n\n\n'
        await this.printToCUPS(settings.printerName!, testText, settings)
        return { success: true, message: 'Test print sent via CUPS.' }
      }

      // Otherwise use node-thermal-printer
      const printer = this.createPrinter(settings)

      // isPrinterConnected() on Windows uses a dummy file path → always false.
      // Skip the check on Windows; winspool will report errors if printer is unavailable.
      if (process.platform !== 'win32') {
        const isConnected = await printer.isPrinterConnected()
        if (!isConnected) {
          return { success: false, message: 'Printer not connected. Check USB cable or IP address.' }
        }
      }

      printer.alignCenter()
      printer.bold(true)
      printer.setTextSize(1, 1)
      this.emit(printer, 'PRINTER TEST', settings)
      printer.bold(false)
      printer.setTextNormal()
      printer.newLine()
      printer.drawLine()

      printer.alignLeft()
      this.emitMeta(printer, `Date: ${new Date().toLocaleString()}`, settings)
      this.emitMeta(printer, `Paper Width: ${settings.paperWidth}`, settings)
      this.emitMeta(printer, `Printer Type: ${settings.printerType}`, settings)
      if (settings.printerIP) {
        this.emitMeta(printer, `Printer IP: ${settings.printerIP}`, settings)
      }
      if (settings.printerName) {
        this.emitMeta(printer, `Printer: ${settings.printerName}`, settings)
      }
      const arabicPref = settings.receiptArabicEncoding ?? 'auto'
      this.emitMeta(
        printer,
        `Arabic Encoding: ${arabicPref === 'auto'
          ? `auto (${ARABIC_CODE_PAGES[resolveArabicEncodingPref(arabicPref)].label})`
          : ARABIC_CODE_PAGES[resolveArabicEncoding(arabicPref)].label}`,
        settings,
      )
      printer.drawLine()

      // ── Arabic code-page diagnostic ──────────────────────────────
      // The same sample goes out twice per page: once reversed into visual order
      // (what the receipts use) and once in logical order, so the paper itself
      // shows which combination this printer can render.
      const sample = 'اختبار طباعة 123 ABC'
      const selected = chooseArabicEncoding([sample], settings.receiptArabicEncoding)

      ARABIC_ENCODINGS.forEach(encoding => {
        const page = ARABIC_CODE_PAGES[encoding]
        const mark = encoding === selected ? '  <-- SELECTED' : ''
        printer.println(`${page.label}${mark}`)
        printer.println(page.shaped ? 'shaped forms, visual order' : 'base letters, visual order')
        this.emitEncoded(printer, sample, encoding, 'visual')
        printer.println(page.shaped ? 'shaped forms, logical order' : 'base letters, logical order')
        this.emitEncoded(printer, sample, encoding, 'logical')
        printer.newLine()
      })

      printer.alignLeft()
      printer.println('Latin accents:')
      this.emit(printer, 'Café Crème - Ünïcode - 42.50 EGP', settings)
      printer.newLine()

      printer.alignCenter()
      printer.bold(true)
      this.emit(printer, 'Test Successful!', settings)
      printer.bold(false)
      this.emit(printer, 'Thermal Printer Ready', settings)
      this.emit(printer, 'Receipt System Active', settings)
      this.textLines(settings.receiptFooter).forEach(line => this.emit(printer, line, settings))

      printer.newLine()
      printer.newLine()
      printer.newLine()
      printer.cut()

      if (process.platform === 'win32' && settings.printerName) {
        await this.printRawToWindowsSpooler(settings.printerName, printer.getBuffer())
      } else {
        await printer.execute()
      }

      return {
        success: true,
        message: 'Test print sent successfully. Check printer output.',
      }
    } catch (error: any) {
      log.error('❌ Test print failed:', error)
      const errorMessage = error.message || error.toString()
      log.error('Full error:', errorMessage)
      
      return {
        success: false,
        message: `Test failed: ${errorMessage}. Check printer path, permissions, and connection.`
      }
    }
  }

  /**
   * Run a PowerShell script from a temp .ps1 file.
   * A file avoids every layer of quoting between Node and PowerShell and lets the
   * script use `[char]9` separators around printer names that contain spaces.
   */
  private static async runPowerShell(script: string, timeout = 15000): Promise<string> {
    const file = path.join(os.tmpdir(), `bizflow-printers-${Date.now()}-${process.pid}.ps1`)
    // BOM keeps Windows PowerShell 5.1 from mis-reading non-ASCII printer names
    await fs.writeFile(file, `\uFEFF${script}`, 'utf8')
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${file}"`,
        { timeout, maxBuffer: 1024 * 1024 },
      )
      return stdout
    } finally {
      await fs.unlink(file).catch(() => undefined)
    }
  }

  /** Parse the tab separated rows produced by the detection script. */
  private static parseDetectedPrinters(stdout: string, liveUsbPorts: string[] = []): DetectedPrinter[] {
    const thermalKeywords =
      /xp|xprinter|thermal|receipt|pos|epson|star|bixolon|citizen|sewoo|gprinter|rongta|hoin|zjiang|netum|munbyn|datecs|cashino/i
    const printers: DetectedPrinter[] = []

    for (const line of stdout.split(/\r?\n/)) {
      const cols = line.split('\t').map(col => col.trim())
      const name = cols[0] || ''
      if (!name || name.startsWith('#') || /^name$/i.test(name)) continue

      const driver = cols[1] || undefined
      const port = cols[2] || undefined
      const status = cols[3] || undefined
      const paperSize = cols[8] || undefined
      const portKind = classifyPort(port)
      const isVirtual = portKind === 'virtual' ||
        VIRTUAL_PRINTER.test(name) ||
        (driver ? VIRTUAL_PRINTER.test(driver) : false)

      const printer: DetectedPrinter = {
        path: name,
        // Only label the driver when it adds something: Windows often reports
        // the queue and its driver under the same name ("XP-58C"), and
        // "XP-58C (XP-58C)" is noise in the picker.
        name: driver && driver.toLowerCase() !== name.toLowerCase() ? `${name} (${driver})` : name,
        driver,
        port,
        status: status && !/^normal$/i.test(status) ? status : undefined,
        isDefault: cols[4] === '1' || undefined,
        isThermal: thermalKeywords.test(name) || (driver ? thermalKeywords.test(driver) : false) || undefined,
        isOffline: cols[5] === '1' || undefined,
        portLive: port && portKind === 'usb' ? liveUsbPorts.includes(port) : undefined,
        problem: cols[6] || undefined,
        stuckJobs: Number(cols[7]) > 0 ? Number(cols[7]) : undefined,
        paperSize,
        paperWidth: guessPaperWidth(paperSize, name),
        portKind,
        isVirtual: isVirtual || undefined,
      }
      printer.confidence = baseConfidence(printer)
      printers.push(printer)
    }

    return rankPrinters(printers)
  }

  /** Read the `#`-prefixed header lines the detection script emits. */
  private static parseDetectHeader(stdout: string): {
    liveUsbPorts: string[]
    devices: string[]
    body: string
  } {
    const liveUsbPorts: string[] = []
    const devices: string[] = []
    const body: string[] = []

    for (const line of stdout.split(/\r?\n/)) {
      if (line.startsWith('#live')) {
        liveUsbPorts.push(...splitList(line.split('\t')[1], ','))
        continue
      }
      if (line.startsWith('#devices')) {
        devices.push(...splitList(line.split('\t')[1], '|'))
        continue
      }
      body.push(line)
    }

    return { liveUsbPorts, devices, body: body.join('\r\n') }
  }

  /** `USB00x` ports that currently have a print device enumerated behind them. */
  static async detectLiveUsbPorts(): Promise<string[]> {
    if (process.platform !== 'win32') return []
    try {
      const stdout = await this.runPowerShell(
        `Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'USBPRINT*' -and $_.Status -eq 'OK' } | ForEach-Object { ($_.InstanceId -split '&')[-1] }`,
      )
      return [...new Set(splitList(stdout.split(/\r?\n/).join(','), ','))]
    } catch (error) {
      log.error('Could not list USB print devices:', error)
      return []
    }
  }

  /**
   * USB print devices Windows sees, whether or not a queue exists for them.
   * This is the "the printer is plugged in, why is there nothing to print to?"
   * case that makes older units look broken on a fresh machine.
   */
  static async detectRawUsbPrintDevices(): Promise<string[]> {
    if (process.platform !== 'win32') return []
    try {
      const stdout = await this.runPowerShell(
        `Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'USBPRINT*' -and $_.Status -eq 'OK' } | ForEach-Object { $_.FriendlyName }`,
      )
      return splitList(stdout.split(/\r?\n/).join('|'), '|')
    } catch (error) {
      log.error('Could not list USB print devices:', error)
      return []
    }
  }

  /** One CUPS queue, described the same way a Windows queue is. */
  private static cupsPrinter(name: string, uri: string): DetectedPrinter {
    const portKind: DetectedPrinter['portKind'] = uri.startsWith('usb://')
      ? 'usb'
      : /^(socket|ipp|ipps|http|https):\/\//i.test(uri) ? 'network' : classifyPort(uri)
    const printer: DetectedPrinter = {
      path: name,
      name: uri ? `${name} (${uri})` : `${name} (CUPS)`,
      port: uri || undefined,
      portKind,
      isThermal: /thermal|receipt|\bpos\b|\bxp\b|epson|star|bixolon|citizen|gprinter/i.test(`${name} ${uri}`) || undefined,
      paperWidth: guessPaperWidth('', `${name} ${uri}`),
    }
    printer.confidence = baseConfidence(printer)
    return printer
  }

  /**
   * Auto-detect thermal printers.
   * Windows: PowerShell Win32_Printer — no native addon required.
   * Linux/macOS: CUPS `lpstat -v`, plus raw `/dev/usb/lp*` nodes.
   */
  static async detectUSBPrinters(): Promise<DetectedPrinter[]> {
    try {
      if (process.platform === 'win32') {
        const script = [
          // A `USB00x` port only works while a print device is enumerated behind
          // it; Windows reports nothing when the queue points at the wrong one.
          `$live = @()`,
          `$devices = @()`,
          `$hasConfig = [bool](Get-Command Get-PrintConfiguration -ErrorAction SilentlyContinue)`,
          `Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -like 'USBPRINT*' -and $_.Status -eq 'OK' } | ForEach-Object { $port = ($_.InstanceId -split '&')[-1]; if ($port) { $live += $port }; if ($_.FriendlyName) { $devices += $_.FriendlyName } }`,
          `'#live' + [char]9 + (($live | Sort-Object -Unique) -join ',')`,
          `'#devices' + [char]9 + (($devices | Sort-Object -Unique) -join '|')`,
          `$default = (Get-CimInstance Win32_Printer -Filter "Default = TRUE" | Select-Object -First 1).Name`,
          `$hasJobs = [bool](Get-Command Get-PrintJob -ErrorAction SilentlyContinue)`,
          `Get-CimInstance Win32_Printer | ForEach-Object {`,
          `  $offline = $_.WorkOffline -or $_.PrinterStatus -eq 7`,
          `  $state = switch ($_.DetectedErrorState) { 3 {'low-paper'} 4 {'no-paper'} 5 {'low-toner'} 6 {'no-toner'} 7 {'door-open'} 8 {'paper-jam'} 9 {'offline'} 10 {'service'} 11 {'output-full'} default {''} }`,
          `  $status = if ($offline) { 'offline' } elseif ($state) { $state } elseif ($_.PrinterStatus -eq 3) { 'normal' } else { 'busy' }`,
          `  $stuck = 0`,
          `  if ($hasJobs) { $stuck = @(Get-PrintJob -PrinterName $_.Name -ErrorAction SilentlyContinue | Where-Object { $_.JobStatus -match 'Error|Blocked|Offline|Retained' }).Count }`,
          `  $paper = ''`,
          `  if ($hasConfig) { try { $paper = (Get-PrintConfiguration -PrinterName $_.Name -ErrorAction Stop).PaperSize } catch { $paper = '' } }`,
          `  @($_.Name, $_.DriverName, $_.PortName, $status, $(if ($_.Name -eq $default) { '1' } else { '0' }), $(if ($offline) { '1' } else { '0' }), $state, $stuck, $paper) -join [char]9`,
          `}`,
        ].join('\r\n')

        const header = this.parseDetectHeader(await this.runPowerShell(script))
        return this.parseDetectedPrinters(header.body, header.liveUsbPorts)
      }

      // Linux / macOS: CUPS
      const printers: DetectedPrinter[] = []
      try {
        const { stdout } = await execAsync('lpstat -v 2>/dev/null || lpstat -a 2>/dev/null || true')
        for (const line of stdout.split('\n')) {
          const named = line.match(/^device for (\S+?):\s*(.*)$/i)
          if (named) {
            printers.push(this.cupsPrinter(named[1], named[2].trim()))
            continue
          }
          const listed = line.match(/^(\S+)\s+/)
          if (listed && !/^device$/i.test(listed[1])) printers.push(this.cupsPrinter(listed[1], ''))
        }
      } catch { /* lpstat not available */ }

      // A raw USB device with no CUPS queue can still be written to directly.
      if (process.platform === 'linux') {
        try {
          const entries = await fs.readdir('/dev/usb')
          for (const entry of entries.filter(name => /^lp\d+$/.test(name))) {
            const device = `/dev/usb/${entry}`
            if (printers.some(printer => printer.path === device)) continue
            printers.push({
              path: device,
              name: `${device} (USB)`,
              port: device,
              portKind: 'usb',
              isThermal: true,
              confidence: 60,
            })
          }
        } catch { /* no /dev/usb on this machine */ }
      }

      return rankPrinters(printers)
    } catch (error) {
      log.error('Error detecting printers:', error)
      return []
    }
  }

  /**
   * Every printer this machine knows about, ranked, plus an optional reachability
   * probe for network receipt printers (raw port 9100).
   */
  static async detectPrinters(networkHosts: string[] = []): Promise<DetectedPrinter[]> {
    const printers = await this.detectUSBPrinters()

    for (const host of networkHosts) {
      if (!host || printers.some(printer => printer.path.includes(host))) continue
      if (!await this.probeNetworkPrinter(host)) continue
      printers.push({
        path: `tcp://${host}:9100`,
        name: `Network printer ${host}:9100`,
        port: host,
        portKind: 'network',
        isThermal: true,
        confidence: 70,
      })
    }

    return rankPrinters(printers)
  }

  /** True when something accepts a raw ESC/POS connection on port 9100. */
  static probeNetworkPrinter(host: string, port = 9100, timeoutMs = 700): Promise<boolean> {
    const target = host.trim().replace(/^tcp:\/\//i, '').replace(/:\d+$/, '')
    return new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: target, port })
      const settle = (reachable: boolean): void => {
        socket.removeAllListeners()
        socket.destroy()
        resolve(reachable)
      }
      socket.setTimeout(timeoutMs)
      socket.on('connect', () => settle(true))
      socket.on('timeout', () => settle(false))
      socket.on('error', () => settle(false))
    })
  }

  /**
   * Find and prepare the best receipt printer on this machine, whatever it is.
   *
   * Windows keeps one `USB00x` port per socket, so a printer that moved socket or
   * came back from "Use Printer Offline" looks healthy while every job dies. This
   * walks the queues, repairs the queue the user already picked, and reports when
   * only the USB device is present and a queue still has to be created.
   */
  static async autoConnect(settings: Partial<PrinterSettings> = {}): Promise<AutoConnectResult> {
    const preferred = settings.printerName
    const hosts = settings.printerIP ? [settings.printerIP] : []
    const repaired: string[] = []
    let diagnosis: PrinterDiagnosis | undefined
    let printers = await this.detectPrinters(hosts)

    // A queue the user already chose that used to work beats a stranger that
    // happens to be plugged in, so give it a chance to be repaired first.
    if (preferred) {
      diagnosis = await this.diagnosePrinter({ ...settings, printerName: preferred } as PrinterSettings)
        .catch(() => undefined)
      if (diagnosis && diagnosis.repairable) {
        const repair = await this.repairPrinter({ ...settings, printerName: preferred } as PrinterSettings)
        if (repair.changes.length > 0) {
          repaired.push(...repair.changes)
          printers = await this.detectPrinters(hosts)
          diagnosis = repair.diagnosis
        }
      }
    }

    const best = pickBestPrinter(printers, preferred)
    if (best) {
      return {
        success: true,
        message: `Connected to ${best.path}${best.port ? ` on ${best.port}` : ''}.`,
        printer: best,
        paperWidth: best.paperWidth ?? settings.paperWidth ?? '58mm',
        confidence: best.confidence ?? 60,
        repaired,
        diagnosis,
        candidates: printers,
      }
    }

    // Nothing usable: is a printer plugged into a USB port no queue uses?
    const livePorts = await this.detectLiveUsbPorts()
    const usedPorts = new Set(printers.map(printer => printer.port).filter(Boolean) as string[])
    const freePort = livePorts.find(port => !usedPorts.has(port)) ?? livePorts[0]

    if (freePort) {
      const devices = await this.detectRawUsbPrintDevices()
      const device = devices[0]
      return {
        success: false,
        message: device
          ? `${device} is connected on ${freePort}, but Windows has no print queue for it. Create one to print.`
          : `A USB print device is connected on ${freePort}, but Windows has no print queue for it. Create one to print.`,
        confidence: 40,
        repaired,
        diagnosis,
        needsQueue: { port: freePort, device },
        candidates: printers,
      }
    }

    return {
      success: false,
      message: printers.length > 0
        ? 'No usable receipt printer found. Check the cable, the power switch and the paper, then try again.'
        : 'No printer found. Connect a thermal printer over USB, or enter its IP address, and try again.',
      confidence: 0,
      repaired,
      diagnosis,
      candidates: printers,
    }
  }

  /**
   * Create a raw pass-through queue for a printer whose own driver is missing —
   * the usual state of older 58mm units on a fresh machine. The inbox
   * "Generic / Text Only" driver forwards our ESC/POS bytes untouched.
   */
  static async createPrinterQueue(
    printerName: string,
    port: string,
  ): Promise<{ success: boolean; message: string; printerName: string }> {
    if (process.platform !== 'win32') {
      return { success: false, message: 'Creating a queue automatically is only available on Windows.', printerName }
    }

    const name = this.quotePowerShell(printerName)
    const portName = this.quotePowerShell(port)
    const script = [
      `if (-not (Get-PrinterPort -Name ${portName} -ErrorAction SilentlyContinue)) { 'failed:port'; exit }`,
      `$queue = Get-Printer -Name ${name} -ErrorAction SilentlyContinue`,
      `if ($queue) { 'fixed:exists'; exit }`,
      `$driver = 'Generic / Text Only'`,
      `if (-not (Get-PrinterDriver -Name $driver -ErrorAction SilentlyContinue)) {`,
      `  try { Add-PrinterDriver -Name $driver -ErrorAction Stop } catch { $driver = $null }`,
      `}`,
      `if (-not $driver) { 'failed:driver'; exit }`,
      `try { Add-Printer -Name ${name} -DriverName $driver -PortName ${portName} -ErrorAction Stop; 'fixed:created' }`,
      `catch { 'failed:queue' }`,
    ].join('\r\n')

    try {
      const stdout = await this.runPowerShell(script, 30000)
      const tokens = stdout.split(/\r?\n/).map(line => line.trim())
      if (tokens.includes('fixed:exists')) {
        return { success: true, message: `Printer "${printerName}" already exists and is ready to print.`, printerName }
      }
      if (tokens.includes('fixed:created')) {
        return { success: true, message: `Created printer "${printerName}" on ${port}. Print a test receipt to confirm.`, printerName }
      }

      const reason = tokens.includes('failed:port')
        ? `Windows does not know the port ${port}. Reconnect the printer and try again.`
        : tokens.includes('failed:driver')
          ? 'Windows refused to install the raw text driver. Install the printer manually from Windows Settings.'
          : 'Windows refused to create the printer. This needs an administrator account — run BizFlow once as administrator.'
      return { success: false, message: reason, printerName }
    } catch (error: any) {
      log.error('Creating printer queue failed:', error)
      return { success: false, message: `Could not create the printer: ${error.message || error}`, printerName }
    }
  }

  /** Quote a value so it can be embedded in a generated PowerShell script. */
  private static quotePowerShell(value: string): string {
    return `'${value.replace(/[\r\n\u0000-\u001f]/g, '').replace(/'/g, "''")}'`
  }

  /**
   * Explain why a configured printer may not work, and what can be done about it.
   * A queue pointing at an empty USB socket reports no error until a job dies.
   */
  static async diagnosePrinter(settings: PrinterSettings): Promise<PrinterDiagnosis> {
    const printers = await this.detectUSBPrinters()
    const liveUsbPorts = printers
      .filter(printer => printer.portLive)
      .map(printer => printer.port!)
      .filter(Boolean)
    const target = printers.find(printer => printer.path === settings.printerName)
    const issues: PrinterDiagnosis['issues'] = []

    if (!target) {
      issues.push({
        code: 'not-found',
        message: `"${settings.printerName || ''}" is not installed on this computer.`,
      })
      return {
        printerName: settings.printerName,
        found: false,
        isOffline: false,
        liveUsbPorts,
        stuckJobs: 0,
        issues,
        repairable: false,
      }
    }

    const isOffline = Boolean(target.isOffline)
    const portLive = target.portLive
    const stuckJobs = target.stuckJobs ?? 0
    const isUsbQueue = Boolean(target.port && /^USB\d+$/i.test(target.port))

    if (isOffline) {
      issues.push({
        code: 'offline',
        message: `Windows has "${target.path}" switched to "Use Printer Offline".`,
      })
    }
    if (target.problem) {
      issues.push({ code: 'hardware', message: `The driver reports: ${target.problem}.` })
    }
    // Only a USB queue can be pointing at the wrong socket.
    const suggestedPort = isUsbQueue && portLive === false && liveUsbPorts.length === 1
      ? liveUsbPorts[0]
      : undefined
    if (isUsbQueue && portLive === false) {
      issues.push({
        code: 'dead-port',
        message: suggestedPort
          ? `Queue "${target.path}" points at ${target.port}, but the printer is on ${suggestedPort}.`
          : `Queue "${target.path}" points at ${target.port}, which has no printer on it.`,
      })
    }
    if (stuckJobs > 0) {
      issues.push({
        code: 'stuck-jobs',
        message: `${stuckJobs} failed job(s) are blocking the queue.`,
      })
    }

    return {
      printerName: target.path,
      found: true,
      isOffline,
      port: target.port,
      portLive,
      liveUsbPorts,
      suggestedPort,
      stuckJobs,
      issues,
      repairable: issues.some(issue => issue.code !== 'not-found' && issue.code !== 'hardware'),
    }
  }

  /**
   * Clear the usual Windows reasons a configured receipt printer stops printing:
   * the offline flag, a queue pointing at the wrong USB socket, failed jobs.
   */
  static async repairPrinter(
    settings: PrinterSettings,
  ): Promise<{ success: boolean; message: string; changes: string[]; diagnosis: PrinterDiagnosis }> {
    const diagnosis = await this.diagnosePrinter(settings)
    if (process.platform !== 'win32') {
      return {
        success: false,
        message: 'Automatic repair is only available on Windows.',
        changes: [],
        diagnosis,
      }
    }
    if (!diagnosis.found) {
      return { success: false, message: 'Printer not found. Select a printer first.', changes: [], diagnosis }
    }
    if (diagnosis.issues.length === 0) {
      return { success: true, message: 'No problems found with this printer.', changes: [], diagnosis }
    }

    const name = this.quotePowerShell(settings.printerName || '')
    const lines = [`$target = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq ${name} }`]
    const changes: string[] = []

    if (diagnosis.isOffline) {
      lines.push(
        `try {`,
        `  Set-CimInstance -InputObject $target -Property @{ WorkOffline = $false } -ErrorAction Stop`,
        `  'fixed:offline'`,
        `} catch { 'failed:offline' }`,
      )
    }
    if (diagnosis.port && diagnosis.suggestedPort) {
      lines.push(
        `try {`,
        `  Set-Printer -Name ${name} -PortName ${this.quotePowerShell(diagnosis.suggestedPort)} -ErrorAction Stop`,
        `  'fixed:port'`,
        `} catch { 'failed:port' }`,
      )
    }
    if (diagnosis.stuckJobs > 0) {
      lines.push(
        `try {`,
        `  $jobs = @(Get-PrintJob -PrinterName ${name} -ErrorAction SilentlyContinue | Where-Object { $_.JobStatus -match 'Error|Blocked|Offline|Retained' })`,
        `  foreach ($job in $jobs) { Remove-PrintJob -InputObject $job -ErrorAction SilentlyContinue }`,
        `  if ($jobs.Count -gt 0) { 'fixed:jobs' }`,
        `} catch { 'failed:jobs' }`,
      )
    }

    try {
      const stdout = await this.runPowerShell(lines.join('\r\n'), 30000)
      const fixed = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith('fixed:'))
      const failed = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith('failed:'))
      const labels: Record<string, string> = {
        offline: 'cleared the offline flag',
        port: `repointed the queue to ${diagnosis.suggestedPort}`,
        jobs: `removed ${diagnosis.stuckJobs} failed job(s)`,
      }
      changes.push(...fixed.map(token => labels[token.split(':')[1]] || token))

      const after = await this.diagnosePrinter(settings)
      const stillBroken = after.issues.filter(issue => issue.code !== 'hardware')
      if (failed.length > 0 && changes.length === 0) {
        return {
          success: false,
          message: `Windows refused the repair (${failed.join(', ')}). Reconnecting the printer usually fixes this.`,
          changes,
          diagnosis: after,
        }
      }
      return {
        success: stillBroken.length === 0,
        message: stillBroken.length === 0
          ? `Printer repaired: ${changes.join(', ')}. Print a test receipt to confirm.`
          : changes.length > 0
            ? `Applied: ${changes.join(', ')}. Still to check: ${stillBroken.map(i => i.message).join(' ')}`
            : 'Nothing could be repaired automatically. Check the cable, power and paper.',
        changes,
        diagnosis: after,
      }
    } catch (error: any) {
      log.error('Printer repair failed:', error)
      return {
        success: false,
        message: `Repair failed: ${error.message || error}`,
        changes,
        diagnosis,
      }
    }
  }

  /** Human readable version of the issues found, for a thrown print error. */
  private static describeIssues(diagnosis: PrinterDiagnosis): string {
    if (diagnosis.issues.length === 0) return ''
    return ` ${diagnosis.issues.map(issue => issue.message).join(' ')}` +
      (diagnosis.repairable ? ' Use "Fix printer" in Settings → Tax & Receipt.' : '')
  }

  /**
   * Get available printers (for compatibility)
   */
  static async getAvailablePrinters(): Promise<string[]> {
    const detectedPrinters = await this.detectUSBPrinters()
    return detectedPrinters.map(p => p.path)
  }

  /**
   * Print barcode label
   */
  static async printBarcode(
    printerName: string,
    barcodeText: string,
    options: {
      productName?: string
      format?: 'code128' | 'ean13' | 'ean8'
      copies?: number
      width?: number
      height?: number
    } = {}
  ): Promise<void> {
    const {
      productName = '',
      copies = 1,
      width = 2,
      height = 100
    } = options

    // Create temp file for the print job
    const tempFile = path.join(os.tmpdir(), `barcode-${Date.now()}.bin`)

    try {
      // Build ESC/POS commands
      const commands: Buffer[] = []

      // Initialize printer with extended reset
      commands.push(Buffer.from([0x1B, 0x40])) // ESC @ - Initialize
      
      // Enable barcode printing (some printers need this)
      // Set to standard mode
      commands.push(Buffer.from([0x1B, 0x53])) // ESC S - Select standard mode

      for (let copy = 0; copy < copies; copy++) {
        // Center alignment
        commands.push(Buffer.from([0x1B, 0x61, 0x01])) // ESC a 1 - Center

        // Print product name if provided
        if (productName) {
          // Bold on
          commands.push(Buffer.from([0x1B, 0x45, 0x01])) // ESC E 1 - Bold
          // Print name
          commands.push(Buffer.from(productName + '\n', 'utf-8'))
          // Bold off
          commands.push(Buffer.from([0x1B, 0x45, 0x00])) // ESC E 0 - Bold off
          commands.push(Buffer.from('\n'))
        }

        // Line feed before barcode (some printers require this)
        commands.push(Buffer.from('\n'))
        
        // Use ESC/POS native barcode command for CODE128
        // XPrinter supports multiple formats, trying Type B command (more compatible)
        
        // Set barcode height: GS h n (n = height in dots, default 162)
        commands.push(Buffer.from([0x1D, 0x68, height])) // GS h - Set barcode height
        
        // Set barcode width: GS w n (n = 2-6, module width)
        commands.push(Buffer.from([0x1D, 0x77, width])) // GS w - Set barcode width
        
        // Set HRI position: GS H n (0=none, 1=above, 2=below, 3=both)
        commands.push(Buffer.from([0x1D, 0x48, 0x02])) // GS H 2 - Print barcode text below
        
        // Set HRI font: GS f n (0=Font A, 1=Font B)
        commands.push(Buffer.from([0x1D, 0x66, 0x00])) // GS f 0 - Font A
        
        // Print CODE128 barcode using Type B format (GS k m d1...dk NUL)
        // This is the most compatible format for XPrinter and similar thermal printers
        // The barcode data must include proper CODE128 structure
        const barcodeData = Buffer.from(barcodeText, 'utf-8')
        
        // GS k 73 - CODE128 with NUL terminator (Type B format)
        commands.push(Buffer.from([0x1D, 0x6B, 0x49])) // GS k m (m=73 for CODE128)
        commands.push(barcodeData) // Barcode data
        commands.push(Buffer.from([0x00])) // NUL terminator
        
        // Debug: Log barcode command being sent
        log.info(`📋 Barcode print debug:`)
        log.info(`   - Text: ${barcodeText}`)
        log.info(`   - Length: ${barcodeData.length}`)
        log.info(`   - Height: ${height}, Width: ${width}`)
        log.info(`   - Command: GS k 73 (CODE128 Type B)`)
        
        // Add 0.5cm bottom margin (approximately 6 lines for thermal printers)
        commands.push(Buffer.from('\n\n\n\n\n\n'))

        // Cut paper after each copy
        commands.push(Buffer.from([0x1D, 0x56, 0x00])) // GS V 0 - Full cut

        // Add small feed between copies (but not after the last one)
        if (copy < copies - 1) {
          commands.push(Buffer.from([0x1B, 0x64, 0x02])) // ESC d 2 - Feed 2 lines
        }
      }

      // Combine all commands
      const finalBuffer = Buffer.concat(commands)

      // Write to temp file
      await fs.writeFile(tempFile, finalBuffer)

      // Sanitize printer name
      const safePrinterName = this.sanitizePrinterName(printerName)
      if (!safePrinterName) {
        throw new Error('Invalid printer name')
      }

      // Send to printer using lp
      await execAsync(`lp -d "${safePrinterName}" -o raw "${tempFile}"`)

      // Clean up temp file after a delay
      setTimeout(() => {
        fs.unlink(tempFile).catch(err => log.error('Failed to delete temp file:', err))
      }, 5000)

    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(tempFile)
      } catch {}
      throw error
    }
  }

  /**
   * Test print - prints a test page
   */
  static async printTest(printerName: string): Promise<void> {
    const tempFile = path.join(os.tmpdir(), `test-${Date.now()}.bin`)

    try {
      // Build test print commands
      const commands: Buffer[] = []

      // Initialize
      commands.push(Buffer.from([0x1B, 0x40])) // ESC @

      // Center
      commands.push(Buffer.from([0x1B, 0x61, 0x01])) // ESC a 1

      // Bold
      commands.push(Buffer.from([0x1B, 0x45, 0x01])) // ESC E 1
      commands.push(Buffer.from('TEST PRINT\n', 'utf-8'))
      commands.push(Buffer.from([0x1B, 0x45, 0x00])) // ESC E 0

      commands.push(Buffer.from('\n'))
      commands.push(Buffer.from('If you can read this,\n', 'utf-8'))
      commands.push(Buffer.from('your printer is working!\n', 'utf-8'))
      commands.push(Buffer.from('\n'))
      commands.push(Buffer.from(new Date().toLocaleString() + '\n', 'utf-8'))
      commands.push(Buffer.from('\n\n'))

      // Cut
      commands.push(Buffer.from([0x1D, 0x56, 0x00])) // GS V 0

      const finalBuffer = Buffer.concat(commands)
      await fs.writeFile(tempFile, finalBuffer)

      // Sanitize printer name
      const safePrinterName = this.sanitizePrinterName(printerName)
      if (!safePrinterName) {
        throw new Error('Invalid printer name')
      }

      // Send to printer
      await execAsync(`lp -d "${safePrinterName}" -o raw "${tempFile}"`)

      // Clean up
      setTimeout(() => {
        fs.unlink(tempFile).catch(err => log.error('Failed to delete temp file:', err))
      }, 5000)

    } catch (error) {
      try {
        await fs.unlink(tempFile)
      } catch {}
      throw error
    }
  }
}
