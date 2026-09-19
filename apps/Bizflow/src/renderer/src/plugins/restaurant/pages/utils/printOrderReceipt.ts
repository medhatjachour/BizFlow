/**
 * Send a restaurant check to the receipt printer.
 *
 * Thin wrapper over the shared thermal pipeline: it only decides whether this
 * machine has a thermal printer at all, so the caller can fall back to browser
 * printing instead of failing silently.
 */
import { printReceipt as sendToThermalPrinter, readPrinterSettings } from '@renderer/lib/thermalPrint'
import { buildOrderReceiptData, type ReceiptOrder } from './receiptData'

export interface OrderPrintResult {
  success: boolean
  /** No thermal printer configured — the caller should use browser printing. */
  browserPrint: boolean
  message?: string
}

export async function printOrderReceipt(
  order: ReceiptOrder,
  storeNameFallback = '',
): Promise<OrderPrintResult> {
  const settings = readPrinterSettings()
  if (settings.printerType === 'none' || settings.printerType === 'html') {
    return { success: false, browserPrint: true }
  }

  const result = await sendToThermalPrinter(buildOrderReceiptData(order, storeNameFallback))
  return {
    success: result.success,
    browserPrint: false,
    message: result.message || result.error,
  }
}
