// src/pages/utils/printer.ts
import { PosOrder } from '../POS/types'
import { ZReportData } from '../shifts/types'

export const ThermalPrinter = {
  /**
   * Generates a Kitchen Order Ticket (KOT) for station prep printers
   */
  buildKitchenKOT(order: PosOrder, course?: string): string {
    const items = course
      ? order.items.filter((i) => i.course === course && i.status !== 'voided')
      : order.items.filter((i) => i.status !== 'voided')

    let text = `\n================================\n`
    text += `       KITCHEN ORDER TICKET     \n`
    text += `Table: #${order.table?.number || 'BAR'}   Check: #${order.orderNumber || 1}\n`
    text += `Server: ${order.serverName || 'Staff'}   Guests: ${order.guestCount}\n`
    text += `Time: ${new Date().toLocaleTimeString()}\n`
    text += `--------------------------------\n`

    items.forEach((item) => {
      text += `${item.quantity}x  ${item.itemName.toUpperCase()}\n`
      if (item.modifiers) {
        try {
          const mods = JSON.parse(item.modifiers)
          mods.forEach((m: any) => {
            text += `    * ${m.name}\n`
          })
        } catch {}
      }
      if (item.notes) {
        text += `    >> NOTE: ${item.notes}\n`
      }
    })

    text += `================================\n\n\n`
    return text
  },

  /**
   * Generates formatted Guest Check for patron payment
   */
  buildGuestReceipt(order: PosOrder): string {
    let text = `\n================================\n`
    text += `        GOURMET RESTAURANT      \n`
    text += `       123 Culinary Way         \n`
    text += `       Tel: (555) 019-2834      \n`
    text += `--------------------------------\n`
    text += `Table #${order.table?.number || 'T'} | Bill #${order.orderNumber || 1}\n`
    text += `Server: ${order.serverName || 'Staff'}\n`
    text += `Date: ${new Date(order.openedAt).toLocaleString()}\n`
    text += `--------------------------------\n`

    order.items
      .filter((i) => i.status !== 'voided')
      .forEach((item) => {
        const lineTotal = (item.unitPrice * item.quantity).toFixed(2)
        const name = item.itemName.padEnd(20, ' ').slice(0, 20)
        text += `${item.quantity}x ${name} $${lineTotal}\n`
      })

    text += `--------------------------------\n`
    text += `Subtotal:              $${order.subtotal.toFixed(2)}\n`
    if (order.discountAmount > 0) {
      text += `Discount:             -$${order.discountAmount.toFixed(2)}\n`
    }
    if (order.tax > 0) {
      text += `Tax:                   $${order.tax.toFixed(2)}\n`
    }
    if (order.tipAmount > 0) {
      text += `Gratuity:              $${order.tipAmount.toFixed(2)}\n`
    }
    text += `--------------------------------\n`
    text += `TOTAL DUE:             $${order.total.toFixed(2)}\n`
    text += `================================\n`
    text += `   Thank you for dining with us! \n\n\n`
    return text
  },

  /**
   * Generates End-of-Shift Z-Report for daily drawer reconciliation
   */
  buildZReport(data: ZReportData): string {
    let text = `\n================================\n`
    text += `     DAILY Z-REPORT AUDIT       \n`
    text += `Shift #${data.shift.id.slice(0, 8)}\n`
    text += `Cashier: ${data.shift.serverName}\n`
    text += `Opened:  ${new Date(data.shift.openedAt).toLocaleTimeString()}\n`
    if (data.shift.closedAt) {
      text += `Closed:  ${new Date(data.shift.closedAt).toLocaleTimeString()}\n`
    }
    text += `--------------------------------\n`
    text += `Total Checks Settled:  ${data.ordersCount}\n`
    text += `Opening Drawer Float:  $${data.startCash.toFixed(2)}\n`
    text += `Gross Sales:           $${data.totalSales.toFixed(2)}\n`
    text += `Tips Pool:             $${data.totalTips.toFixed(2)}\n`
    text += `--------------------------------\n`
    text += `PAYMENT SUMMARY:\n`
    Object.entries(data.paymentBreakdown).forEach(([method, amt]) => {
      text += `* ${method.toUpperCase()}: $${amt.toFixed(2)}\n`
    })
    text += `--------------------------------\n`
    text += `Counted Cash:          $${(data.endCash || 0).toFixed(2)}\n`
    text += `================================\n\n\n`
    return text
  }
}