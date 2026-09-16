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
   * Generates End-of-Shift Z-Report for daily drawer reconciliation.
   *
   * Kept in sync with `getZReportData`; the on-screen report lives in
   * `pages/shifts/components/ZReportModal.tsx`.
   */
  buildZReport(data: ZReportData): string {
    const money = (n: number | null | undefined): string => `$${(n ?? 0).toFixed(2)}`

    let text = `\n================================\n`
    text += `     DAILY Z-REPORT AUDIT       \n`
    text += `Shift #${data.shift.id.slice(0, 8)}\n`
    text += `Server: ${data.shift.serverName}\n`
    text += `Opened: ${new Date(data.shift.openedAt).toLocaleTimeString()}\n`
    if (data.shift.closedAt) {
      text += `Closed: ${new Date(data.shift.closedAt).toLocaleTimeString()}\n`
    }
    text += `--------------------------------\n`
    text += `Checks Settled:        ${data.ordersCount}\n`
    text += `Gross Sales:           ${money(data.grossSales)}\n`
    text += `Discounts:            -${money(data.totalDiscounts)}\n`
    text += `Net Sales:             ${money(data.netSales)}\n`
    text += `Tips Pool:             ${money(data.totalTips)}\n`
    text += `  Cash Tips:           ${money(data.cashTips)}\n`
    text += `  Card Tips:           ${money(data.cardTips)}\n`
    text += `--------------------------------\n`
    text += `PAYMENT SUMMARY:\n`
    const tenders = Object.entries(data.paymentBreakdown || {})
    if (tenders.length === 0) {
      text += `  (no tenders recorded)\n`
    } else {
      tenders.forEach(([method, amt]) => {
        text += `* ${method.toUpperCase()}: ${money(amt as number)}\n`
      })
    }
    text += `--------------------------------\n`
    text += `CASH DRAWER:\n`
    text += `Opening Float:         ${money(data.startCash)}\n`
    text += `Cash Sales:            ${money(data.cashSales)}\n`
    text += `Expected Cash:         ${money(data.expectedCash)}\n`
    text += `Counted Cash:          ${money(data.endCash)}\n`
    text += `Variance:              ${money(data.variance)}\n`
    if (data.openChecksCount > 0) {
      text += `--------------------------------\n`
      text += `OPEN CHECKS (not revenue): ${data.openChecksCount} · ${money(data.openChecksTotal)}\n`
    }
    if (data.voidedLineCount > 0) {
      text += `Voids: ${data.voidedOrdersCount} check(s) · ${data.voidedLineCount} line(s) · ${money(data.voidedOrdersTotal)}\n`
    }
    text += `================================\n\n\n`
    return text
  }
}
