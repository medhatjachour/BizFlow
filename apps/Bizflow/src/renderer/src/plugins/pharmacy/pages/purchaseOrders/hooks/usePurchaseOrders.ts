import { useState, useEffect, useCallback, useMemo } from 'react'
import { pharma } from '../../components/_shared'
import { PurchaseOrderItem, PurchaseOrderStatus } from '../types'
import { computePOMetrics } from '../utils'

export function usePurchaseOrders(toast: any) {
  const [orders, setOrders] = useState<PurchaseOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PurchaseOrderStatus>('all')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await pharma()?.purchaseOrders.getAll({
        status: status === 'all' ? undefined : status,
        take: 150,
      })
      setOrders(response?.data ?? [])
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }, [status, toast])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter(
      o =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.supplier?.name?.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q)
    )
  }, [orders, search])

  const metrics = useMemo(() => computePOMetrics(orders), [orders])

  return {
    orders: filteredOrders,
    rawCount: orders.length,
    loading,
    search,
    status,
    metrics,
    setSearch,
    setStatus,
    reload: loadOrders,
  }
}