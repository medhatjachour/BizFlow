import { PurchaseOrderItem, PurchaseOrdersMetrics, POLineItem } from './types'

export function computePOMetrics(orders: PurchaseOrderItem[]): PurchaseOrdersMetrics {
  return orders.reduce(
    (acc, o) => {
      acc.totalOrders += 1
      if (o.status === 'draft') acc.draftsCount += 1
      if (o.status === 'ordered') acc.pendingOrderedValue += o.total || 0
      if (o.status === 'received') acc.receivedValue += o.total || 0
      return acc
    },
    { totalOrders: 0, draftsCount: 0, pendingOrderedValue: 0, receivedValue: 0 }
  )
}

export const createBlankPOLine = (): POLineItem => ({
  productId: '',
  productName: '',
  quantity: '1',
  costPerUnit: '',
  sellingPrice: '',
  expiryDate: '',
})

export function exportPurchaseOrdersToCSV(orders: PurchaseOrderItem[]) {
  const headers = ['Order #', 'Supplier', 'Order Date', 'Items Count', 'Total ($)', 'Status', 'Notes']
  const rows = orders.map(o => [
    o.orderNumber || '',
    o.supplier?.name || 'Unassigned',
    new Date(o.orderDate).toLocaleDateString(),
    o.itemCount || o.items?.length || 0,
    (o.total || 0).toFixed(2),
    o.status,
    o.notes || '',
  ])
  return [headers, ...rows]
}