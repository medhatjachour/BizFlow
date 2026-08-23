import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FinanceStockItem,
  FinanceOverviewData,
  LocationQtyMetric,
  CriticalImpactItem
} from '../types'
import { computeLocationBreakdown, computeCriticalImpacts } from '../utils'
import { useToast } from '@renderer/contexts/ToastContext'

export function useFinanceData() {
  const [stockItems, setStockItems] = useState<FinanceStockItem[]>([])
  const [overviewData, setOverviewData] = useState<FinanceOverviewData | null>(null)
  const [criticalRawItems, setCriticalRawItems] = useState<FinanceStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const toast = useToast()

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const api = window.api.warehouse
      const [rStock, rOverview, rLow] = await Promise.allSettled([
        api.getStock ? api.getStock() : Promise.resolve([]),
        api.getOverview ? api.getOverview() : Promise.resolve(null),
        api.getLowStock ? api.getLowStock() : Promise.resolve([])
      ])

      if (rStock.status === 'fulfilled') setStockItems(Array.isArray(rStock.value) ? rStock.value : [])
      if (rOverview.status === 'fulfilled') setOverviewData(rOverview.value || null)
      if (rLow.status === 'fulfilled') setCriticalRawItems(Array.isArray(rLow.value) ? rLow.value : [])
    } catch (err: any) {
      console.error('[useFinanceData] Failed to load data:', err)
      toast.error('Failed to load financial warehouse metrics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const locationBreakdown: LocationQtyMetric[] = useMemo(() => {
    return computeLocationBreakdown(stockItems)
  }, [stockItems])

  const criticalImpacts: CriticalImpactItem[] = useMemo(() => {
    return computeCriticalImpacts(criticalRawItems)
  }, [criticalRawItems])

  const totalStockUnits = useMemo(() => {
    return stockItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0)
  }, [stockItems])

  const totalEstimatedAssetValue = useMemo(() => {
    return stockItems.reduce((acc, item) => {
      const cost = Number(item.product?.baseCost || item.unitCost || 0)
      return acc + Number(item.quantity || 0) * cost
    }, 0)
  }, [stockItems])

  return {
    stockItems,
    overviewData,
    criticalImpacts,
    locationBreakdown,
    totalStockUnits,
    totalEstimatedAssetValue,
    loading,
    refreshing,
    refresh: () => loadData(true)
  }
}