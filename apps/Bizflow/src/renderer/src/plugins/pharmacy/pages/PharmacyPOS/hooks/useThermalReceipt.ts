import { useState, useCallback } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { CartLine, SaleTransactionResult } from '../types'
import {
  printReceipt as sendToThermalPrinter,
  readPrinterSettings,
} from '../../../../../lib/thermalPrint'

/** Store identity, read from the keys the Settings page writes. */
function storeIdentity(fallbackName: string) {
  return {
    storeName: localStorage.getItem('storeName') || fallbackName,
    storeAddress: localStorage.getItem('storeAddress') || '',
    storePhone: localStorage.getItem('storePhone') || '',
    storeEmail: localStorage.getItem('storeEmail') || undefined,
    taxNumber: localStorage.getItem('taxNumber') || '',
    commercialRegister: localStorage.getItem('commercialRegister') || undefined,
  }
}

/**
 * The receipt builder only knows per-line discounts, so a sale-level discount is
 * spread proportionally across the lines — the printed subtotal then reconciles
 * with the total instead of silently losing the difference.
 */
function spreadDiscount(items: CartLine[], discount: number): number[] {
  const lineTotals = items.map((item) => item.quantity * item.unitPrice)
  const gross = lineTotals.reduce((sum, value) => sum + value, 0)
  if (!(discount > 0) || gross <= 0) return items.map(() => 0)

  let assigned = 0
  return lineTotals.map((value, index) => {
    const share = index === lineTotals.length - 1
      ? Number((discount - assigned).toFixed(2))
      : Number((discount * (value / gross)).toFixed(2))
    assigned += share
    return Math.max(0, share)
  })
}

export function useThermalReceipt() {
  const { t } = useLanguage()
  const [activeReceipt, setActiveReceipt] = useState<SaleTransactionResult | null>(null)

  /** Browser-print fallback: a 58mm/80mm CSS receipt inside a modal. */
  const openPrintableReceipt = useCallback((sale: SaleTransactionResult) => {
    setActiveReceipt(sale)
    setTimeout(() => {
      window.print()
    }, 300)
  }, [])

  const printReceipt = useCallback(
    async (sale: SaleTransactionResult) => {
      const settings = readPrinterSettings()
      // No receipt printer configured — use the browser preview instead.
      if (settings.printerType === 'none' || settings.printerType === 'html') {
        openPrintableReceipt(sale)
        return
      }

      const discounts = spreadDiscount(sale.items, sale.discount)
      const result = await sendToThermalPrinter({
        ...storeIdentity(t('phPosStoreFallback')),
        receiptNumber: sale.saleNumber,
        date: sale.createdAt,
        paymentMethod: sale.paymentMethod,
        items: sale.items.map((item, index) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.quantity * item.unitPrice,
          discountType: discounts[index] > 0 ? 'FIXED' : undefined,
          discountValue: discounts[index] > 0 ? discounts[index] : undefined,
        })),
        subtotal: sale.subtotal,
        // Pharmacy prices are tax-inclusive, so there is no separate tax line.
        tax: 0,
        taxRate: 0,
        total: sale.total,
        customerName: sale.customer?.name,
        customerPhone: sale.customer?.phone,
      })

      if (!result.success) {
        // The modal preview is the user-facing fallback; the reason stays in the log.
        console.error(result.error)
        openPrintableReceipt(sale)
      }
    },
    [openPrintableReceipt, t]
  )

  return {
    activeReceipt,
    setActiveReceipt,
    printReceipt,
  }
}
