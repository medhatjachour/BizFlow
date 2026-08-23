import { Stage, OrderType, WarehouseOrder } from './types'
import { INBOUND_STEPS, OUTBOUND_STEPS } from './constants'

export function getOrderCurrentStage(order: WarehouseOrder): Stage {
  if (order.workflowStage) return order.workflowStage
  if (order.status === 'completed') return 'done'
  return order.orderType === 'inbound' ? 'receiving' : 'picking'
}

export function getStageLabel(stage: Stage, t: (key: string) => string): string {
  const map: Record<Stage, string> = {
    created: t('warehouseStageCreated') || 'Created',
    receiving: t('warehouseStageReceiving') || 'Receiving',
    qc: t('warehouseStageQc') || 'Quality Check',
    putaway: t('warehouseStagePutaway') || 'Putaway',
    picking: t('warehouseStagePicking') || 'Picking',
    packing: t('warehouseStagePacking') || 'Packing',
    shipping: t('warehouseStageShipping') || 'Shipping',
    done: t('warehouseStageDone') || 'Completed'
  }
  return map[stage] || stage
}

export function getNextStage(orderType: OrderType, currentStage: Stage): Stage | null {
  const steps = orderType === 'inbound' ? INBOUND_STEPS : OUTBOUND_STEPS
  const index = steps.indexOf(currentStage)
  if (index < 0 || index === steps.length - 1) return null
  return steps[index + 1]
}

export function isFinalPostingAction(order: WarehouseOrder): boolean {
  const stage = getOrderCurrentStage(order)
  return (
    (order.orderType === 'inbound' && stage === 'putaway') ||
    (order.orderType === 'outbound' && stage === 'shipping')
  )
}

export function getPrimaryActionLabel(order: WarehouseOrder, t: (key: string) => string): string {
  const stage = getOrderCurrentStage(order)
  if (order.orderType === 'inbound') {
    if (stage === 'created') return t('warehouseActionStartReceiving') || 'Start Receiving'
    if (stage === 'receiving') return t('warehouseActionMoveToQc') || 'Move to QC'
    if (stage === 'qc') return t('warehouseActionApprovePutaway') || 'Approve Putaway'
    if (stage === 'putaway') return t('warehouseActionPostStock') || 'Post Stock'
  }
  if (order.orderType === 'outbound') {
    if (stage === 'created') return t('warehouseActionStartPicking') || 'Start Picking'
    if (stage === 'picking') return t('warehouseActionMoveToPacking') || 'Move to Packing'
    if (stage === 'packing') return t('warehouseActionMoveToShipping') || 'Move to Shipping'
    if (stage === 'shipping') return t('warehouseActionConfirmShipment') || 'Confirm Shipment'
  }
  return t('warehouseActionView') || 'View Details'
}

export function filterOrders(
  orders: WarehouseOrder[],
  searchQuery: string,
  locationId: string
): WarehouseOrder[] {
  const query = searchQuery.trim().toLowerCase()
  return orders.filter(order => {
    if (locationId !== 'all' && order.locationId !== locationId) return false
    if (!query) return true

    const haystack = [
      order.orderNumber,
      order.sourceRef || '',
      order.partnerName || '',
      order.createdBy || '',
      ...order.lines.map(l => l.productName),
      ...order.lines.map(l => l.sku || '')
    ].join(' ').toLowerCase()

    return haystack.includes(query)
  })
}