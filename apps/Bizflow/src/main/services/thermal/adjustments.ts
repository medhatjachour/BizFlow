/**
 * Sale-level totals that sit between the subtotal and the grand total.
 *
 * Kept separate from the composers so the ESC/POS text layout, the bitmap
 * renderer and the HTML composer all print the same rows in the same order,
 * and so the maths can be unit tested without an Electron window.
 */
import type { ReceiptLabels } from './labels'

export interface SaleAdjustments {
  /** Sale-level discount (already resolved to an amount, not a percentage). */
  discount?: number
  discountType?: string
  /** Percentage behind `discount`; only used to label the row. */
  discountRate?: number
  serviceCharge?: number
  tipAmount?: number
}

export interface AdjustmentRow {
  label: string
  amount: string
}

const money = (value: number): string => `${value.toFixed(2)} EGP`

/**
 * Rows to print between the subtotal and the grand total. A zero or missing
 * value prints nothing, which keeps the totals block tight on 58mm paper.
 *
 * Gratuities are deliberately not part of this block: a tip is charged on top of
 * the check total, so it is printed after the total (see `saleGratuityRow`) to
 * keep the printed column of figures adding up.
 */
export function saleAdjustmentRows(data: SaleAdjustments, labels: ReceiptLabels): AdjustmentRow[] {
  const rows: AdjustmentRow[] = []

  if (Number(data.discount) > 0) {
    const isPercent = data.discountType === 'PERCENTAGE' && Number(data.discountRate) > 0
    rows.push({
      label: isPercent ? `${labels.discount} ${data.discountRate}%` : labels.discount,
      amount: `-${money(Number(data.discount))}`,
    })
  }

  if (Number(data.serviceCharge) > 0) {
    rows.push({ label: labels.serviceCharge, amount: money(Number(data.serviceCharge)) })
  }

  return rows
}

/** The tip line, printed below the check total; `null` when no tip was paid. */
export function saleGratuityRow(
  data: SaleAdjustments,
  labels: ReceiptLabels,
): AdjustmentRow | null {
  if (!(Number(data.tipAmount) > 0)) return null
  return { label: labels.gratuity, amount: money(Number(data.tipAmount)) }
}
