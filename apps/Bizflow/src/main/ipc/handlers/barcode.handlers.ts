/**
 * Barcode Printing IPC Handlers
 * Handles barcode printing to thermal printers
 */

import { ipcMain } from 'electron'
import { ThermalPrinterService } from '../../services/ThermalPrinterService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Barcode')

export function registerBarcodePrintHandlers() {
  /**
   * Detect available printers
   */
  ipcMain.handle('barcode:detect-printers', async () => {
    try {
      const printers = await ThermalPrinterService.detectUSBPrinters()
      return {
        success: true,
        printers: printers.map(p => ({
          name: p.name,
          path: p.path
        }))
      }
    } catch (error: any) {
      log.error('Error detecting printers:', error)
      return {
        success: false,
        message: error.message || 'Failed to detect printers'
      }
    }
  })

  /**
   * Print barcode label
   */
  ipcMain.handle('barcode:print', async (_, { printerName, barcodeText, options }) => {
    try {
      await ThermalPrinterService.printBarcode(printerName, barcodeText, options)
      return {
        success: true,
        message: 'Barcode printed successfully'
      }
    } catch (error: any) {
      log.error('Error printing barcode:', error)
      
      // Provide user-friendly error messages
      let message = 'Failed to print barcode'
      
      if (error.message?.includes('not found') || error.message?.includes('ENOENT')) {
        message = 'Printer not found. Please check if the printer is connected and turned on.'
      } else if (error.message?.includes('EACCES') || error.message?.includes('permission')) {
        message = 'Permission denied. You may need to add your user to the lp group:\nsudo usermod -a -G lp $USER'
      } else if (error.message?.includes('EBUSY')) {
        message = 'Printer is busy. Please wait and try again.'
      } else if (error.message) {
        message = error.message
      }
      
      return {
        success: false,
        message
      }
    }
  })

  /**
   * Test printer connection
   */
  ipcMain.handle('barcode:test-printer', async (_, { printerName }) => {
    try {
      await ThermalPrinterService.printTest(printerName)
      return {
        success: true,
        message: 'Test page sent to printer'
      }
    } catch (error: any) {
      log.error('Error testing printer:', error)
      return {
        success: false,
        message: error.message || 'Failed to send test page'
      }
    }
  })

  log.info('✅ Barcode print handlers registered')
}
