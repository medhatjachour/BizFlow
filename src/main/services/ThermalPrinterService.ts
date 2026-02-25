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
   * Format receipt as plain text for thermal printing
   */
  private static formatReceiptText(data: ReceiptData, settings: PrinterSettings): string {
    const width = settings.paperWidth === '80mm' ? 48 : 32
    const line = '='.repeat(width)
    const dashes = '-'.repeat(width)
    
    let text = '\n'
    
    // Store name (centered)
    text += data.storeName.toUpperCase() + '\n'
    text += data.storeAddress + '\n'
    text += `Tel: ${data.storePhone}\n`
    if (data.storeEmail) text += data.storeEmail + '\n'
    text += '\n'
    
    // Tax info
    text += dashes + '\n'
    text += `Tax No: ${data.taxNumber}\n`
    if (data.commercialRegister) text += `Comm Reg: ${data.commercialRegister}\n`
    text += dashes + '\n'
    text += '\n'
    
    // Receipt info
    text += `Receipt #: ${data.receiptNumber}\n`
    text += `Date: ${data.date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}\n`
    if (data.username) text += `Cashier: ${data.username}\n`
    if (data.customerName) text += `Customer: ${data.customerName}\n`
    if (data.customerPhone) text += `Phone: ${data.customerPhone}\n`
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
          ? `Discount ${item.discountValue}%` 
          : 'Fixed Discount'
        text += `${discountLabel}: -${itemDiscount.toFixed(2)} EGP\n`
        text += `After Discount: ${finalTotal.toFixed(2)} EGP\n`
      }
      
      text += dashes + '\n'
    })
    
    // Totals
    text += '\n'
    text += `Subtotal: ${data.subtotal.toFixed(2)} EGP\n`
    text += `VAT (${data.taxRate}%): ${data.tax.toFixed(2)} EGP\n`
    text += line + '\n'
    text += `TOTAL: ${data.total.toFixed(2)} EGP\n`
    text += line + '\n'
    text += '\n'
    
    // Payment
    text += `Payment: ${data.paymentMethod}\n`
    
    // Installments
    if (data.installments && data.installments.length > 0) {
      text += '\n'
      text += dashes + '\n'
      text += 'INSTALLMENT PLAN\n'
      text += dashes + '\n'
      
      if (data.depositAmount) {
        text += `Deposit Paid: ${data.depositAmount.toFixed(2)} EGP\n`
        text += '\n'
      }
      
      data.installments.forEach((inst, idx) => {
        const status = inst.status === 'paid' ? ' PAID' : inst.status === 'overdue' ? ' OVERDUE' : ''
        const dateStr = inst.dueDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
        text += `#${idx + 1} ${dateStr}\n`
        text += `   ${inst.amount.toFixed(2)} EGP${status}\n`
      })
      
      const remaining = data.installments
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + i.amount, 0)
      
      text += dashes + '\n'
      text += `Remaining: ${remaining.toFixed(2)} EGP\n`
    }
    
    text += '\n'
    text += 'Thank you for your visit!\n'
    text += 'We appreciate your business\n'
    
    // Add blank lines for easy tearing
    const blankLines = settings.receiptBottomSpacing ?? 4
    text += '\n'.repeat(blankLines)
    
    return text
  }

  private static createPrinter(settings: PrinterSettings): ThermalPrinter {
    let printerInterface: string
    
    if (settings.printerType === 'network' && settings.printerIP) {
      // Sanitize IP address to prevent injection
      const safeIP = this.sanitizeIP(settings.printerIP)
      printerInterface = `tcp://${safeIP}:9100`
    } else if (settings.printerName) {
      // Check if it's a USB URI (usb://...)
      if (settings.printerName.startsWith('usb://')) {
        printerInterface = settings.printerName
      }
      // If it starts with /, it's a device path
      else if (settings.printerName.startsWith('/')) {
        printerInterface = settings.printerName
      }
      // Otherwise it's a CUPS printer name
      else {
        printerInterface = `printer:${settings.printerName}`
      }
    } else {
      printerInterface = '/dev/usb/lp0'
    }

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // ESC/POS compatible
      interface: printerInterface,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      width: settings.paperWidth === '80mm' ? 48 : 32
    })
    return printer
  }

  /**
   * Format and print receipt
   */
  private static async formatAndPrintReceipt(printer: ThermalPrinter, data: ReceiptData, settings: PrinterSettings): Promise<void> {
    
    // Store info
    printer.alignCenter()
    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println(data.storeName.toUpperCase())
    printer.bold(false)
    printer.setTextNormal()
    printer.println(data.storeAddress)
    printer.println(`Tel: ${data.storePhone}`)
    if (data.storeEmail) {
      printer.println(data.storeEmail)
    }
    printer.newLine()

    // Tax info
    printer.drawLine()
    printer.println(`Tax No: ${data.taxNumber}`)
    if (data.commercialRegister) {
      printer.println(`Comm Reg: ${data.commercialRegister}`)
    }
    printer.drawLine()
    printer.newLine()

    // Receipt info
    printer.alignLeft()
    printer.println(`Receipt #: ${data.receiptNumber}`)
    printer.println(`Date: ${data.date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`)
    if (data.username) {
      printer.println(`Cashier: ${data.username}`)
    }
    if (data.customerName) {
      printer.println(`Customer: ${data.customerName}`)
    }
    if (data.customerPhone) {
      printer.println(`Phone: ${data.customerPhone}`)
    }
    printer.drawLine()

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
      
      // Item name and details
      printer.println(item.name)
      printer.println(`${item.quantity} x ${originalPrice.toFixed(2)} = ${originalTotal.toFixed(2)} EGP`)
      
      if (hasDiscount && item.discountValue !== undefined) {
        const discountLabel = item.discountType === 'PERCENTAGE' 
          ? `Discount ${item.discountValue}%` 
          : 'Fixed Discount'
        printer.println(`${discountLabel}: -${itemDiscount.toFixed(2)} EGP`)
        printer.println(`After Discount: ${finalTotal.toFixed(2)} EGP`)
      }
      
      printer.drawLine()
    })

    // Totals
    printer.newLine()
    printer.println(`Subtotal: ${data.subtotal.toFixed(2)} EGP`)
    printer.println(`VAT (${data.taxRate}%): ${data.tax.toFixed(2)} EGP`)
    printer.drawLine()
    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println(`TOTAL: ${data.total.toFixed(2)} EGP`)
    printer.bold(false)
    printer.setTextNormal()
    printer.drawLine()

    // Payment
    printer.newLine()
    printer.alignCenter()
    printer.println(`Payment: ${data.paymentMethod}`)
    
    // Installments
    if (data.installments && data.installments.length > 0) {
      printer.newLine()
      printer.drawLine()
      printer.alignCenter()
      printer.bold(true)
      printer.println('INSTALLMENT PLAN')
      printer.bold(false)
      printer.drawLine()
      printer.alignLeft()
      
      if (data.depositAmount) {
        printer.println(`Deposit: ${data.depositAmount.toFixed(2)} EGP`)
        printer.drawLine()
      }
      
      data.installments.forEach((inst, idx) => {
        const status = inst.status === 'paid' ? 'PAID' : inst.status === 'overdue' ? 'OVER' : 'DUE'
        const dateStr = inst.dueDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
        printer.println(`#${idx + 1} ${dateStr}`)
        printer.println(`   ${inst.amount.toFixed(2)} EGP - ${status}`)
      })
      
      const remaining = data.installments
        .filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + i.amount, 0)
      
      printer.drawLine()
      printer.bold(true)
      printer.println(`Remaining: ${remaining.toFixed(2)} EGP`)
      printer.bold(false)
    }
    
    printer.newLine()
    printer.alignCenter()
    printer.println('Thank you for your visit!')
    printer.println('We appreciate your business')

    // Add spacing
    const blankLines = settings.receiptBottomSpacing ?? 4
    for (let i = 0; i < blankLines; i++) {
      printer.newLine()
    }
    
    if (settings.openCashDrawer) {
      printer.openCashDrawer()
    }
    
    printer.cut()
    await printer.execute()
  }

  /**
   * Print receipt
   */
  static async printReceipt(data: ReceiptData, settings: PrinterSettings): Promise<void> {
    try {
      // For CUPS printers, use direct CUPS printing
      if (settings.printerType === 'usb' && settings.printerName && 
          !settings.printerName.startsWith('/') && !settings.printerName.startsWith('tcp://')) {
        
        const text = this.formatReceiptText(data, settings)
        await this.printToCUPS(settings.printerName, text, settings)
        return
      }

      // Auto-detect if printer name is empty or default
      if (settings.printerType === 'usb' && (!settings.printerName || settings.printerName === '/dev/usb/lp0')) {
        const detectedPrinters = await this.detectUSBPrinters()
        
        if (detectedPrinters.length > 0) {
          const firstPrinter = detectedPrinters[0]
          settings.printerName = firstPrinter.path
          
          // Save to localStorage (will be picked up by renderer)
          // Note: This runs in main process, need to send back to renderer
        } else {
          throw new Error('No thermal printers detected. Please connect your printer and configure it in Settings → Tax & Receipt Settings.')
        }
      }

      // Otherwise use node-thermal-printer for direct device access
      const printer = this.createPrinter(settings)
      await this.formatAndPrintReceipt(printer, data, settings)
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
      // Check if using CUPS printer
      if (settings.printerType === 'usb' && settings.printerName && 
          !settings.printerName.startsWith('/') && !settings.printerName.startsWith('tcp://')) {
        // Use CUPS lp command for test
        const testText = '\n' +
          'PRINTER TEST\n' +
          '================================\n' +
          '\n' +
          `Date: ${new Date().toLocaleString()}\n` +
          `Paper Width: ${settings.paperWidth}\n` +
          `Printer Type: ${settings.printerType}\n` +
          `Printer: ${settings.printerName}\n` +
          '\n' +
          '================================\n' +
          '\n' +
          'Test Successful!\n' +
          'ZKT eco ZKP8012\n' +
          '\n\n\n\n'

        await this.printToCUPS(settings.printerName, testText, settings)
        
        return {
          success: true,
          message: 'Test print sent successfully via CUPS. Check printer output.'
        }
      }

      // Otherwise use node-thermal-printer
      const printer = this.createPrinter(settings)

      // Check if printer is connected
      const isConnected = await printer.isPrinterConnected()
      
      if (!isConnected) {
        return {
          success: false,
          message: 'Printer not connected. Check USB cable or IP address.'
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

      await printer.execute()

      return {
        success: true,
        message: 'Test print sent successfully. Check printer output.'
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
   * Auto-detect USB thermal printers
   */
  static async detectUSBPrinters(): Promise<Array<{ path: string; name: string }>> {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    const printers: Array<{ path: string; name: string }> = []

    try {
      // Get CUPS printers with lpstat -a
      try {
        const { stdout } = await execAsync('lpstat -a 2>/dev/null || true')
        const lines = stdout.split('\n')
        
        for (const line of lines) {
          const match = line.match(/^(\S+)\s+/)
          if (match) {
            const printerName = match[1]
            printers.push({
              path: printerName,
              name: `${printerName} (CUPS Printer)`
            })
          }
        }
      } catch (error) {
        // lpstat command not available, silently fail
      }

      // Return detected printers or empty array
      return printers
    } catch (error) {
      log.error('Error detecting USB printers:', error)
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
