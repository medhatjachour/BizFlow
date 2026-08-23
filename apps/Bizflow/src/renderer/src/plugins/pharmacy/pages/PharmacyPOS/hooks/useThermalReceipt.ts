import { useState, useCallback } from 'react'
import { SaleTransactionResult } from '../types'

export function useThermalReceipt() {
  const [activeReceipt, setActiveReceipt] = useState<SaleTransactionResult | null>(null)

  const printReceipt = useCallback((sale: SaleTransactionResult) => {
    // 1. Check if Electron IPC thermal print driver exists
    const win = window as any
    if (win?.api?.thermalPrinter?.print) {
      win.api.thermalPrinter.print({
        saleNumber: sale.saleNumber,
        date: sale.createdAt,
        items: sale.items.map(item => ({
          name: item.name,
          unit: item.saleUnit === 'sub' ? item.subUnit || 'sub' : item.unit,
          qty: item.quantity,
          price: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        paid: sale.amountPaid,
        change: sale.change,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customer?.name,
      })
    } else {
      // Fallback: Open receipt modal for thermal 80mm/58mm CSS print
      setActiveReceipt(sale)
      setTimeout(() => {
        window.print()
      }, 300)
    }
  }, [])

  return {
    activeReceipt,
    setActiveReceipt,
    printReceipt,
  }
}