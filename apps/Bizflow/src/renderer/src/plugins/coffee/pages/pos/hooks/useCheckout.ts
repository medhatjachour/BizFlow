import { useState, useCallback } from 'react'
import type { CartItem, OrderType, PaymentMethod, CheckoutForm } from '../types'
import { buildReceiptData, readReceiptSettings, getAutoPrintSale, type ReceiptData } from '../utils'

interface CheckoutParams {
  cart: CartItem[]
  checkout: CheckoutForm
  customerId?: string
  cashierId?: string
  shiftId?: string
  tables: { id: string; number: number; name?: string; section?: string }[]
  toast: any
}

interface PrintParams {
  orderNumber: string
  paymentMethod: PaymentMethod
  type: OrderType
  tableLabel?: string
  openedAt?: Date
  closedAt?: Date
  cart: CartItem[]
  customerName: string
  customerPhone: string
  customerAddress: string
  notes: string
  subtotal: number
  discount: number
  total: number
  username: string
  toast: any
}

export function useCheckout() {
  const [checking, setChecking] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)

  // ── Print receipt (respects auto-print setting) ──
  const printReceipt = useCallback(async (meta: PrintParams) => {
    try {
      const receiptData = buildReceiptData({
        orderNumber: meta.orderNumber,
        closedAt: meta.closedAt || new Date(),
        cashierName: meta.username,
        orderType: meta.type,
        tableLabel: meta.tableLabel,
        customerName: meta.customerName || undefined,
        customerPhone: meta.customerPhone || undefined,
        customerAddress: meta.customerAddress || undefined,
        cart: meta.cart,
        subtotal: meta.subtotal,
        discount: meta.discount,
        total: meta.total,
        paymentMethod: meta.paymentMethod,
        notes: meta.notes || undefined
      })

      // Always save for preview
      setLastReceipt(receiptData)

      // Only auto-print if setting is enabled
      const shouldAutoPrint = getAutoPrintSale()

      if (shouldAutoPrint) {
        const settings = readReceiptSettings()
        const shouldForceThermal =
          settings.printerType === 'none' || settings.printerType === 'html'
        const effectiveSettings = shouldForceThermal
          ? { ...settings, printerType: 'usb' as const }
          : settings

        const result = await window.api.thermalReceipts.print({
          receiptData,
          settings: effectiveSettings
        })

        if (result.success) {
          if (result.detectedPrinter) {
            localStorage.setItem('printerName', result.detectedPrinter)
            localStorage.setItem('printerType', 'usb')
          }
        } else {
          meta.toast.error(result.error || 'Receipt print failed')
        }
      }
    } catch {
      meta.toast.error('Receipt print failed')
    }
  }, [])

  // ── Reprint last receipt ──
  const reprintLast = useCallback(
    async (toast: any) => {
      if (!lastReceipt) return
      try {
        const settings = readReceiptSettings()
        const shouldForceThermal =
          settings.printerType === 'none' || settings.printerType === 'html'
        const effectiveSettings = shouldForceThermal
          ? { ...settings, printerType: 'usb' as const }
          : settings

        const result = await window.api.thermalReceipts.print({
          receiptData: lastReceipt,
          settings: effectiveSettings
        })

        if (result.success) {
          toast.success('Receipt reprinted')
        } else {
          toast.error(result.error || 'Reprint failed')
        }
      } catch {
        toast.error('Reprint failed')
      }
    },
    [lastReceipt]
  )

  // ── Full checkout ──
  const checkout = useCallback(
    async (params: CheckoutParams, pm: PaymentMethod) => {
      setChecking(true)
      try {
        const { cart, checkout: ck, customerId, cashierId, shiftId, tables, toast } = params
        const subtotal = cart.reduce((s, i) => s + i.salePrice * i.quantity, 0)
        const total = Math.max(0, subtotal - ck.discount)

        const order = await window.api.coffee.orders.create({
          type: ck.orderType,
          tableId: ck.orderType === 'dine_in' && ck.selectedTable ? ck.selectedTable : undefined,
          customerName: ck.customerName || undefined,
          customerPhone: ck.customerPhone || undefined,
          deliveryAddress:
            ck.orderType === 'delivery' ? ck.customerAddress || undefined : undefined,
          customerId,
          cashierId,
          shiftId,
          notes: ck.notes || undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unitPrice: i.salePrice,
            unit: i.unit, // ← ADD
            quantity: i.quantity,
            notes: i.notes
          }))
        })

        const closed = await window.api.coffee.orders.close({
          orderId: order.id,
          paymentMethod: pm,
          discount: ck.discount,
          cashierId,
          shiftId
        })

        const tableLabel =
          ck.orderType === 'dine_in' && ck.selectedTable
            ? (() => {
                const t = tables.find((x) => x.id === ck.selectedTable)
                return t ? `Table ${t.number}${t.name ? ` (${t.name})` : ''}` : undefined
              })()
            : undefined

        await printReceipt({
          orderNumber: order.orderNumber,
          paymentMethod: pm,
          type: ck.orderType,
          tableLabel,
          openedAt: order.openedAt ? new Date(order.openedAt) : undefined,
          closedAt: closed?.closedAt ? new Date(closed.closedAt) : new Date(),
          cart,
          customerName: ck.customerName,
          customerPhone: ck.customerPhone,
          customerAddress: ck.customerAddress,
          notes: ck.notes,
          subtotal,
          discount: ck.discount,
          total,
          username: cashierId || 'Cashier',
          toast
        })

        return { success: true as const, orderNumber: order.orderNumber, pm, total }
      } catch (err: any) {
        params.toast.error(err?.message ?? 'Checkout failed')
        return { success: false as const }
      } finally {
        setChecking(false)
      }
    },
    [printReceipt]
  )

  // ── Quick checkout ──
  const quickCheckout = useCallback(
    async (
      params: {
        cart: CartItem[]
        cashierId?: string
        shiftId?: string
        toast: any
      },
      pm: PaymentMethod
    ) => {
      setChecking(true)
      try {
        const { cart, cashierId, shiftId, toast } = params
        const total = cart.reduce((s, i) => s + i.salePrice * i.quantity, 0)

        const order = await window.api.coffee.orders.create({
          type: 'takeaway',
          cashierId,
          shiftId,
          items: cart.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unitPrice: i.salePrice,
            quantity: i.quantity,
            unit: i.unit, // ← ADD THIS LINE HERE
          }))
        })

        const closed = await window.api.coffee.orders.close({
          orderId: order.id,
          paymentMethod: pm,
          discount: 0,
          cashierId,
          shiftId
        })

        await printReceipt({
          orderNumber: order.orderNumber,
          paymentMethod: pm,
          type: 'takeaway',
          openedAt: order.openedAt ? new Date(order.openedAt) : undefined,
          closedAt: closed?.closedAt ? new Date(closed.closedAt) : new Date(),
          cart,
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          notes: '',
          subtotal: total,
          discount: 0,
          total,
          username: cashierId || 'Cashier',
          toast
        })

        return { success: true as const, orderNumber: order.orderNumber, pm, total }
      } catch (err: any) {
        params.toast.error(err?.message ?? 'Quick sale failed')
        return { success: false as const }
      } finally {
        setChecking(false)
      }
    },
    [printReceipt]
  )

  return { checking, checkout, quickCheckout, lastReceipt, reprintLast }
}
