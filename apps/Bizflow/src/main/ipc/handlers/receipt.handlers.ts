import { ipcMain } from 'electron'
import {
  ThermalPrinterService,
  ReceiptData,
  PrinterSettings,
  DetectedPrinter,
  pickBestPrinter,
} from '../../services/ThermalPrinterService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Receipt')

/**
 * Receipt printing IPC handlers
 */

/** Do not send a job to a printer Windows has disabled or that has no device behind it. */
function isUsable(printer: DetectedPrinter): boolean {
  return !printer.isOffline && printer.portLive !== false
}

/** Best guess at the receipt printer, without touching a queue that cannot work. */
function pickPrinter(printers: DetectedPrinter[], preferred?: string): DetectedPrinter | undefined {
  return pickBestPrinter(printers, preferred) ?? printers.find(isUsable) ?? printers[0]
}

export function registerReceiptHandlers(): void {
  // Print receipt
  ipcMain.handle('receipt:print', async (_event, data: {
    receiptData: ReceiptData
    settings: PrinterSettings
  }) => {
    try {
      const { receiptData, settings } = data
      
      // Validate settings to prevent injection
      if (settings.printerName && typeof settings.printerName !== 'string') {
        throw new Error('Invalid printer name type')
      }
      if (settings.printerIP && typeof settings.printerIP !== 'string') {
        throw new Error('Invalid printer IP type')
      }
      
      log.info('📄 Receipt print requested:', {
        type: settings.printerType,
        name: settings.printerName,
        items: receiptData.items?.length || 0
      })
      
      // Auto-detect USB printer if not configured
      if (settings.printerType === 'usb' && (!settings.printerName || settings.printerName === '/dev/usb/lp0')) {
        log.info('🔍 Auto-detecting USB printer...')
        const printers = await ThermalPrinterService.detectUSBPrinters()
        const detectedPrinter = pickPrinter(printers)

        if (detectedPrinter) {
          log.info('✅ Auto-detected:', detectedPrinter.name, '→', detectedPrinter.path)
          settings.printerName = detectedPrinter.path

          // Return detected printer info to save in UI
          await ThermalPrinterService.printReceipt(receiptData, settings)

          return {
            success: true,
            detectedPrinter: detectedPrinter.path,
            message: `Printer auto-detected: ${detectedPrinter.name}`
          }
        }

        return {
          success: false,
          error: 'No USB thermal printers found. Please connect your printer and try again.'
        }
      }
      
      // Use updated ThermalPrinterService
      await ThermalPrinterService.printReceipt(receiptData, settings)
      
      log.info('✅ Receipt printed successfully')
      return { success: true }
    } catch (error: any) {
      log.error('❌ Receipt print error:', error)
      
      // If print fails with USB, try auto-detection as fallback
      if (data.settings.printerType === 'usb') {
        log.info('🔄 Print failed, attempting auto-detection...')
        try {
          const printers = await ThermalPrinterService.detectUSBPrinters()
          const detectedPrinter = pickPrinter(printers)

          // Only worth retrying against a different, usable queue.
          if (detectedPrinter && detectedPrinter.path !== data.settings.printerName && isUsable(detectedPrinter)) {
            log.info('✅ Auto-detected:', detectedPrinter.name)
            data.settings.printerName = detectedPrinter.path

            // Retry print with detected printer
            await ThermalPrinterService.printReceipt(data.receiptData, data.settings)

            return {
              success: true,
              detectedPrinter: detectedPrinter.path,
              message: `Printer auto-detected and recovered: ${detectedPrinter.name}`
            }
          }
        } catch (retryError) {
          log.error('❌ Auto-detection failed:', retryError)
        }
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to print receipt'
      }
    }
  })

  // Get available printers with auto-detection
  ipcMain.handle('receipt:detectPrinters', async (_event, options?: {
    printerIP?: string
    preferred?: string
  }) => {
    try {
      const hosts = options?.printerIP ? [options.printerIP] : []
      const printers = await ThermalPrinterService.detectPrinters(hosts)
      return {
        success: true,
        printers,
        recommended: pickPrinter(printers, options?.preferred)?.path,
      }
    } catch (error: any) {
      log.error('Detect printers error:', error)
      return { 
        success: false, 
        error: error.message,
        printers: [] 
      }
    }
  })

  // Test printer connection
  ipcMain.handle('receipt:testPrint', async (_event, settings: PrinterSettings) => {
    try {
      const result = await ThermalPrinterService.testPrinter(settings)
      return result
    } catch (error: any) {
      log.error('Test print error:', error)
      return { 
        success: false, 
        message: error.message || 'Test print failed'
      }
    }
  })

  // Explain why a configured printer is not printing
  ipcMain.handle('receipt:diagnosePrinter', async (_event, settings: PrinterSettings) => {
    try {
      const diagnosis = await ThermalPrinterService.diagnosePrinter(settings)
      return { success: true, diagnosis }
    } catch (error: any) {
      log.error('Diagnose printer error:', error)
      return { success: false, error: error.message || 'Diagnosis failed' }
    }
  })

  // Clear the usual Windows causes of a stuck receipt printer
  ipcMain.handle('receipt:repairPrinter', async (_event, settings: PrinterSettings) => {
    try {
      const result = await ThermalPrinterService.repairPrinter(settings)
      return result
    } catch (error: any) {
      log.error('Repair printer error:', error)
      return {
        success: false,
        message: error.message || 'Repair failed',
        changes: [],
      }
    }
  })

  // Find and prepare whichever receipt printer this machine has
  ipcMain.handle('receipt:autoConnect', async (_event, settings?: Partial<PrinterSettings>) => {
    try {
      log.info('🔌 Auto-connecting to a receipt printer...')
      const result = await ThermalPrinterService.autoConnect(settings ?? {})
      log.info('🔌 Auto-connect:', result.message)
      return result
    } catch (error: any) {
      log.error('Auto-connect error:', error)
      return {
        success: false,
        message: error.message || 'Could not look for a printer.',
        confidence: 0,
        repaired: [],
        candidates: [],
      }
    }
  })

  // Create a raw pass-through queue when Windows has a USB printer without a driver
  ipcMain.handle('receipt:createQueue', async (_event, data: { printerName: string; port: string }) => {
    try {
      if (!data?.printerName || typeof data.printerName !== 'string') {
        throw new Error('A printer name is required')
      }
      if (!data.port || typeof data.port !== 'string') {
        throw new Error('A port is required')
      }
      log.info('🛠️ Creating printer queue:', data.printerName, 'on', data.port)
      return await ThermalPrinterService.createPrinterQueue(data.printerName, data.port)
    } catch (error: any) {
      log.error('Create queue error:', error)
      return { success: false, message: error.message || 'Could not create the printer.', printerName: data?.printerName ?? '' }
    }
  })

  // Render a receipt for the Settings live preview
  ipcMain.handle('receipt:renderPreview', async (_event, data: {
    receiptData: ReceiptData
    settings: PrinterSettings
  }) => {
    try {
      const preview = await ThermalPrinterService.renderReceiptPreview(data.receiptData, data.settings)
      return { success: true, preview }
    } catch (error: any) {
      log.error('Render preview error:', error)
      return { success: false, error: error.message || 'Could not render the preview.' }
    }
  })
}
