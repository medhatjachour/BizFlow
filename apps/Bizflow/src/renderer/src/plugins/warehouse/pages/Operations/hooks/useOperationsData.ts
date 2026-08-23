import { useState, useEffect, useCallback, useMemo } from 'react'
import { WarehouseOrder, Movement, AuditLog, JourneyBoard, LocationItem } from '../types'
import { getOrderCurrentStage, getNextStage, isFinalPostingAction, getStageLabel } from '../utils'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function useOperationsData() {
  const [loading, setLoading] = useState(true)
  const [actingOrderId, setActingOrderId] = useState<string | null>(null)
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [orders, setOrders] = useState<WarehouseOrder[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [board, setBoard] = useState<JourneyBoard | null>(null)

  const toast = useToast()
  const { t } = useLanguage()

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [locs, orderRes, movementRes, auditRes, boardRes] = await Promise.all([
        window.api.warehouse.getLocations(),
        window.api.warehouse.getOrders({ take: 200 }),
        window.api.warehouse.getMovements({ take: 30 }),
        window.api.warehouse.getAuditLogs({ take: 30 }),
        window.api.warehouse.getJourneyBoard()
      ])
      setLocations(Array.isArray(locs) ? locs : [])
      setOrders(orderRes?.data ?? [])
      setMovements(movementRes?.data ?? [])
      setAuditLogs(auditRes?.data ?? [])
      setBoard(boardRes ?? null)
    } catch (err: any) {
      toast.error(err?.message || t('warehouseLoadOperationsFailed') || 'Failed to load operations')
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const activeOrders = useMemo(() => {
    return orders.filter(o => ['pending', 'processing'].includes(o.status))
  }, [orders])

  const advanceOrder = async (order: WarehouseOrder) => {
    if (!order.locationId) {
      toast.warning(t('warehouseOrderNoAssignedLocation') || 'Order has no assigned location')
      return
    }

    setActingOrderId(order.id)
    const stage = getOrderCurrentStage(order)
    const nxt = getNextStage(order.orderType, stage)
    const backupState = [...orders]

    setOrders(prev =>
      prev.map(o => {
        if (o.id !== order.id) return o
        if (isFinalPostingAction(order)) return { ...o, workflowStage: 'done', status: 'completed' }
        if (!nxt) return o
        return { ...o, workflowStage: nxt, status: nxt === 'done' ? 'completed' : 'processing' }
      })
    )

    try {
      if (isFinalPostingAction(order)) {
        await window.api.warehouse.processOrder({
          orderId: order.id,
          locationId: order.locationId,
          actedBy: 'warehouse.operator',
          notes: t('warehousePostedFromPhase2') || 'Fulfillment finalized'
        })
        toast.success(
          (t('warehouseOrderCompleted') || 'Order {orderNumber} finalized').replace('{orderNumber}', order.orderNumber)
        )
      } else {
        if (!nxt) return
        await window.api.warehouse.advanceOrderStage({
          id: order.id,
          stage: nxt,
          actedBy: 'warehouse.operator',
          notes: (t('warehouseAdvancedToStage') || 'Stage advanced to {stage}').replace('{stage}', nxt)
        })
        toast.success(
          (t('warehouseOrderMovedToStage') || 'Order {orderNumber} moved to {stage}')
            .replace('{orderNumber}', order.orderNumber)
            .replace('{stage}', getStageLabel(nxt, t))
        )
      }
      await loadAll()
    } catch (err: any) {
      setOrders(backupState)
      toast.error(err?.message || t('warehouseAdvanceOrderFailed') || 'Could not advance order')
    } finally {
      setActingOrderId(null)
    }
  }

  return {
    loading,
    actingOrderId,
    locations,
    orders,
    activeOrders,
    movements,
    auditLogs,
    board,
    advanceOrder,
    refresh: loadAll
  }
}