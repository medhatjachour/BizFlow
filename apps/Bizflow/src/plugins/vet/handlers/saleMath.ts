/**
 * Canonical sub-unit-aware sale math — single source of truth for COGS / profit
 * across stats, finance and reports.
 *
 * Rules (what makes the numbers "realistic"):
 *  - VetMedicineSale.quantity is stored in the SALE unit (sub-units when
 *    saleUnit='sub'); batch costPerUnit / sellingPrice are per CONTAINER.
 *    → convert to container-equivalent units before multiplying by cost.
 *  - Refunds restock the goods, so refunded quantity is NOT a cost of goods
 *    sold and refunded money is NOT revenue → net both out.
 *  - COGS / margin are therefore based on what was actually SOLD (and kept),
 *    never on the whole inventory.
 *
 * SQL fragments require these table aliases:
 *   s = VetMedicineSale, b = VetMedicineBatch, m = VetMedicine
 */

export const SQL_SOLD_QTY = `(CASE WHEN s.saleUnit='sub' AND m.subUnitsPerContainer>0
    THEN (s.quantity - COALESCE(s.refundedQty,0)) / m.subUnitsPerContainer
    ELSE (s.quantity - COALESCE(s.refundedQty,0)) END)`

export const SQL_COGS = `(${SQL_SOLD_QTY} * b.costPerUnit)`

export const SQL_NET_REVENUE = `(s.totalPrice - COALESCE(s.refundedAmount,0))`

/** Container-equivalent quantity actually sold (net of refunds). */
export function soldContainerQty(sale: any): number {
  const refunded = Number(sale?.refundedQty) || 0
  const qty = Math.max(0, (Number(sale?.quantity) || 0) - refunded)
  const ratio = (sale?.saleUnit === 'sub' && Number(sale?.medicine?.subUnitsPerContainer) > 0)
    ? Number(sale.medicine.subUnitsPerContainer)
    : 1
  return qty / ratio
}

/** Cost of goods sold for one sale row (sub-unit aware, net of refunds). */
export function saleCostTotal(sale: any): number {
  return soldContainerQty(sale) * (Number(sale?.batch?.costPerUnit) || 0)
}

/** Revenue actually kept for one sale row (after discount and refunds). */
export function saleNetRevenue(sale: any): number {
  return (Number(sale?.totalPrice) || 0) - (Number(sale?.refundedAmount) || 0)
}
