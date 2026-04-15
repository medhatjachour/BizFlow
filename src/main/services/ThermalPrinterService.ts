/**
 * Thermal Printer Service
 * Handles thermal printer communication for Egyptian receipts
 * Uses node-thermal-printer for raw ESC/POS commands
 */

import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createLogger } from '../utils/logger'

const log = createLogger('ThermalPrinter')

const execAsync = promisify(exec)

export interface PrinterSettings {
  printerType: 'none' | 'usb' | 'network' | 'html'
  printerName?: string
  printerIP?: string
  paperWidth: '58mm' | '80mm'
  receiptBottomSpacing?: number
  printLogo?: boolean
  printQRCode?: boolean
  printBarcode?: boolean
  openCashDrawer?: boolean
  receiptLanguage?: 'en' | 'ar'
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
  
  // Optional
  username?: string
  customerName?: string
  customerPhone?: string
  notes?: string
  
  // Installments
  installments?: Array<{
    amount: number
    dueDate: Date
    status: string
  }>
  depositAmount?: number
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

  /**
   * Get receipt label strings in English or Arabic
   */
  private static getReceiptLabels(lang: 'en' | 'ar') {
    if (lang === 'ar') {
      return {
        tel: 'هاتف',
        taxNo: 'الرقم الضريبي',
        commReg: 'السجل التجاري',
        receiptNum: 'رقم الإيصال',
        date: 'التاريخ',
        cashier: 'الكاشير',
        customer: 'العميل',
        phone: 'الهاتف',
        subtotal: 'المجموع الفرعي',
        vat: 'ضريبة القيمة المضافة',
        total: 'الاجمالي الكلي',
        payment: 'طريقة الدفع',
        discount: 'خصم',
        afterDiscount: 'بعد الخصم',
        fixedDiscount: 'خصم ثابت',
        installmentPlan: 'خطة الاقساط',
        depositPaid: 'الدفعة المقدمة',
        remaining: 'المتبقي',
        statusPaid: 'مدفوع',
        statusOverdue: 'متاخر',
        thankYou: 'شكرا لزيارتكم!',
        appreciate: 'نقدر تعاملكم معنا',
        item: 'الصنف',
        qty: 'ك',
        price: 'السعر',
        totalCol: 'الإجمالي',
      }
    }
    return {
      tel: 'Tel',
      taxNo: 'Tax No',
      commReg: 'Comm Reg',
      receiptNum: 'Receipt #',
      date: 'Date',
      cashier: 'Cashier',
      customer: 'Customer',
      phone: 'Phone',
      subtotal: 'Subtotal',
      vat: 'VAT',
      total: 'TOTAL',
      payment: 'Payment',
      discount: 'Discount',
      afterDiscount: 'After Discount',
      fixedDiscount: 'Fixed Discount',
      installmentPlan: 'INSTALLMENT PLAN',
      depositPaid: 'Deposit Paid',
      remaining: 'Remaining',
      statusPaid: 'PAID',
      statusOverdue: 'OVERDUE',
      thankYou: 'Thank you for your visit!',
      appreciate: 'We appreciate your business',
      item: 'Item',
      qty: 'Qty',
      price: 'Price',
      totalCol: 'Total',
    }
  }

  /**
   * Format receipt as plain text for thermal printing
   */
  private static formatReceiptText(data: ReceiptData, settings: PrinterSettings): string {
    const lbl = this.getReceiptLabels(settings.receiptLanguage || 'en')
    const locale = settings.receiptLanguage === 'ar' ? 'ar-EG' : 'en-US'
    const width = settings.paperWidth === '80mm' ? 48 : 32
    const line = '='.repeat(width)
    const dashes = '-'.repeat(width)
    
    let text = '\n'
    
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
    text += `${lbl.vat} (${data.taxRate}%): ${data.tax.toFixed(2)} EGP\n`
    text += line + '\n'
    text += `${lbl.total}: ${data.total.toFixed(2)} EGP\n`
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
  private static async formatAndPrintReceipt(
    printer: ThermalPrinter,
    data: ReceiptData,
    settings: PrinterSettings,
    windowsPrinterName?: string,
  ): Promise<void> {
    const lbl    = this.getReceiptLabels(settings.receiptLanguage || 'en')
    const locale = settings.receiptLanguage === 'ar' ? 'ar-EG' : 'en-US'
    const isAr   = settings.receiptLanguage === 'ar'

    // Abbreviated VAT label — keeps totals section from overflowing on 58mm
    const vatLabel = isAr
      ? `ض.ق.م (${data.taxRate}%):`
      : `${lbl.vat} (${data.taxRate}%):`

    // ── Store header ──────────────────────────────────────────────
    printer.alignCenter()
    printer.bold(true)
    printer.println(data.storeName)           // normal size — setTextSize(1,1) doubles width and causes truncation
    printer.bold(false)
    if (data.storeAddress)  printer.println(data.storeAddress)
    if (data.storePhone)    printer.println(`${lbl.tel}: ${data.storePhone}`)
    if (data.storeEmail)    printer.println(data.storeEmail)
    printer.newLine()

    // ── Tax info ──────────────────────────────────────────────────
    printer.drawLine()
    printer.alignLeft()
    if (data.taxNumber)          printer.println(`${lbl.taxNo}: ${data.taxNumber}`)
    if (data.commercialRegister) printer.println(`${lbl.commReg}: ${data.commercialRegister}`)
    printer.drawLine()
    printer.newLine()

    // ── Transaction meta ──────────────────────────────────────────
    printer.println(`${lbl.receiptNum}: ${data.receiptNumber}`)
    printer.println(`${lbl.date}: ${data.date.toLocaleString(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })}`)
    if (data.username)      printer.println(`${lbl.cashier}: ${data.username}`)
    if (data.customerName)  printer.println(`${lbl.customer}: ${data.customerName}`)
    if (data.customerPhone) printer.println(`${lbl.phone}: ${data.customerPhone}`)
    printer.drawLine()

    // ── Items ─────────────────────────────────────────────────────
    // Column header row — matches HTML table (Item | Qty | Price | Total)
    printer.tableCustom([
      { text: lbl.item,     align: 'LEFT',   width: 0.42 },
      { text: lbl.qty,      align: 'CENTER', width: 0.10 },
      { text: lbl.price,    align: 'RIGHT',  width: 0.22 },
      { text: lbl.totalCol, align: 'RIGHT',  width: 0.26 },
    ])
    printer.drawLine()

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

      // Data row — same 4-col layout as header
      printer.tableCustom([
        { text: item.name,                    align: 'LEFT',   width: 0.42 },
        { text: String(item.quantity),        align: 'CENTER', width: 0.10 },
        { text: originalPrice.toFixed(2),     align: 'RIGHT',  width: 0.22 },
        { text: originalTotal.toFixed(2),     align: 'RIGHT',  width: 0.26 },
      ])

      if (hasDiscount && item.discountValue !== undefined) {
        const discLabel = item.discountType === 'PERCENTAGE'
          ? `${lbl.discount} ${item.discountValue}%`
          : lbl.fixedDiscount

        printer.tableCustom([
          { text: discLabel,                        align: 'LEFT',  width: 0.6 },
          { text: `-${itemDiscount.toFixed(2)} EGP`, align: 'RIGHT', width: 0.4 },
        ])
        printer.tableCustom([
          { text: lbl.afterDiscount,               align: 'LEFT',  width: 0.6 },
          { text: `${finalTotal.toFixed(2)} EGP`,  align: 'RIGHT', width: 0.4 },
        ])
      }
    })
    printer.drawLine()

    // ── Totals ────────────────────────────────────────────────────
    printer.newLine()
    printer.tableCustom([
      { text: `${lbl.subtotal}:`,  align: 'LEFT',  width: 0.55 },
      { text: `${data.subtotal.toFixed(2)} EGP`, align: 'RIGHT', width: 0.45 },
    ])
    printer.tableCustom([
      { text: vatLabel,            align: 'LEFT',  width: 0.55 },
      { text: `${data.tax.toFixed(2)} EGP`,      align: 'RIGHT', width: 0.45 },
    ])
    printer.drawLine()
    printer.bold(true)
    printer.tableCustom([
      { text: `${lbl.total}:`, align: 'LEFT',  width: 0.55, bold: true },
      { text: `${data.total.toFixed(2)} EGP`,  align: 'RIGHT', width: 0.45, bold: true },
    ])
    printer.bold(false)
    printer.drawLine()

    // ── Payment ───────────────────────────────────────────────────
    printer.newLine()
    printer.alignCenter()
    printer.println(`${lbl.payment}: ${data.paymentMethod}`)

    // ── Installments ──────────────────────────────────────────────
    if (data.installments && data.installments.length > 0) {
      printer.newLine()
      printer.drawLine()
      printer.alignCenter()
      printer.bold(true)
      printer.println(lbl.installmentPlan)
      printer.bold(false)
      printer.drawLine()
      printer.alignLeft()

      if (data.depositAmount) {
        printer.tableCustom([
          { text: `${lbl.depositPaid}:`,               align: 'LEFT',  width: 0.55 },
          { text: `${data.depositAmount.toFixed(2)} EGP`, align: 'RIGHT', width: 0.45 },
        ])
        printer.newLine()
      }

      data.installments.forEach((inst, idx) => {
        const status  = inst.status === 'paid'    ? ` ${lbl.statusPaid}`
                      : inst.status === 'overdue' ? ` ${lbl.statusOverdue}` : ''
        const dateStr = inst.dueDate.toLocaleDateString(locale, {
          year: '2-digit', month: '2-digit', day: '2-digit',
        })
        printer.tableCustom([
          { text: `#${idx + 1}  ${dateStr}`,                   align: 'LEFT',  width: 0.55 },
          { text: `${inst.amount.toFixed(2)} EGP${status}`,    align: 'RIGHT', width: 0.45 },
        ])
      })

      const remaining = data.installments
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + i.amount, 0)

      printer.drawLine()
      printer.bold(true)
      printer.tableCustom([
        { text: `${lbl.remaining}:`, align: 'LEFT',  width: 0.55, bold: true },
        { text: `${remaining.toFixed(2)} EGP`,       align: 'RIGHT', width: 0.45, bold: true },
      ])
      printer.bold(false)
    }

    // ── Footer ────────────────────────────────────────────────────
    printer.newLine()
    printer.alignCenter()
    printer.println(lbl.thankYou)
    printer.println(lbl.appreciate)

    const blankLines = settings.receiptBottomSpacing ?? 4
    for (let i = 0; i < blankLines; i++) printer.newLine()

    if (settings.openCashDrawer) printer.openCashDrawer()

    printer.cut()

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
      const printer            = this.createPrinter(settings)
      const winPrinterName     = process.platform === 'win32' ? settings.printerName : undefined
      await this.formatAndPrintReceipt(printer, data, settings, winPrinterName)
    } catch (error: any) {
      log.error('❌ Print error:', error)
      throw new Error(`Failed to print: ${error.message}`)
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
      printer.println('PRINTER TEST')
      printer.bold(false)
      printer.setTextNormal()
      printer.newLine()
      printer.drawLine()
      printer.newLine()

      printer.alignLeft()
      printer.println(`Date: ${new Date().toLocaleString()}`)
      printer.println(`Paper Width: ${settings.paperWidth}`)
      printer.println(`Printer Type: ${settings.printerType}`)
      if (settings.printerIP) {
        printer.println(`Printer IP: ${settings.printerIP}`)
      }
      if (settings.printerName) {
        printer.println(`Printer: ${settings.printerName}`)
      }
      printer.newLine()
      printer.drawLine()
      printer.newLine()

      printer.alignCenter()
      printer.bold(true)
      printer.println('Test Successful!')
      printer.bold(false)
      printer.println('Thermal Printer Ready')
      printer.println('Receipt System Active')

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
   * Auto-detect thermal printers.
   * Windows: PowerShell Get-Printer — no native addon required.
   * Linux/macOS: CUPS lpstat -a.
   */
  static async detectUSBPrinters(): Promise<Array<{ path: string; name: string }>> {
    try {
      if (process.platform === 'win32') {
        // Enumerate all installed printers via PowerShell
        const ps = `Get-Printer | Select-Object Name,DriverName | ConvertTo-Csv -NoTypeInformation`
        const { stdout } = await execAsync(
          `powershell -NoProfile -NonInteractive -Command "${ps}"`,
          { timeout: 10000 }
        )

        const thermalKeywords = /xp|xprinter|thermal|receipt|pos|epson|star|bixolon|citizen|sewoo/i
        const all: Array<{ path: string; name: string }> = []

        // Skip CSV header row
        const lines = stdout.trim().split(/\r?\n/).slice(1)
        for (const line of lines) {
          // CSV format: "Name","DriverName"
          const cols = line.replace(/^\s*"|"\s*$/g, '').split('","')
          const name   = (cols[0] || '').trim()
          const driver = (cols[1] || '').trim()
          if (name) {
            all.push({ path: name, name: driver ? `${name} (${driver})` : name })
          }
        }

        // Return thermal-looking printers first; fall back to all printers
        const thermal = all.filter(p => thermalKeywords.test(p.path) || thermalKeywords.test(p.name))
        return thermal.length > 0 ? thermal : all

      } else {
        // Linux / macOS: CUPS
        const printers: Array<{ path: string; name: string }> = []
        try {
          const { stdout } = await execAsync('lpstat -a 2>/dev/null || true')
          for (const line of stdout.split('\n')) {
            const match = line.match(/^(\S+)\s+/)
            if (match) printers.push({ path: match[1], name: `${match[1]} (CUPS)` })
          }
        } catch { /* lpstat not available */ }
        return printers
      }
    } catch (error) {
      log.error('Error detecting printers:', error)
      return []
    }
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
