import { useState, useEffect, useCallback, useMemo } from 'react'
import { WarehouseRawData, DailyBucketPoint, DashboardKPIData, LocationMetric } from '../types'
import { buildDailyTransferBuckets } from '../utils'
import { useDashboardWorker, StockValueResult, TrendsResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

const EMPTY_DATA: WarehouseRawData = {
  locations: [],
  todayTransfers: [],
  weekTransfers: [],
  stockItems: [],
  criticalItems: []
}

export function useWarehouseDashboardData(refreshSignal?: number) {
  const [loading, setLoading] = useState(true)
  const [raw, setRaw] = useState<WarehouseRawData>(EMPTY_DATA)
  const [stockVal, setStockVal] = useState<StockValueResult | null>(null)
  const [transferTrend, setTransferTrend] = useState<TrendsResult | null>(null)

  const { compute } = useDashboardWorker()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as any).api?.warehouse
      if (!api) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)

      // Concurrent IPC queries
      const [locsRes, todayTransRes, weekTransRes, stockRes, critRes] =
        await Promise.allSettled([
          api.getLocations ? api.getLocations() : Promise.resolve([]),
          api.getTransfers ? api.getTransfers({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }) : Promise.resolve([]),
          api.getTransfers ? api.getTransfers({ startDate: weekAgo.toISOString(), endDate: tomorrow.toISOString() }) : Promise.resolve([]),
          api.getStock ? api.getStock() : Promise.resolve([]),
          api.getLowStock ? api.getLowStock() : Promise.resolve([])
        ])

      const locations = locsRes.status === 'fulfilled' ? locsRes.value || [] : []
      const todayTransfers = todayTransRes.status === 'fulfilled' ? todayTransRes.value || [] : []
      const weekTransfers = weekTransRes.status === 'fulfilled' ? weekTransRes.value || [] : []
      const stockItems = stockRes.status === 'fulfilled' ? stockRes.value || [] : []
      const criticalItems = critRes.status === 'fulfilled' ? critRes.value || [] : []

      const fetchedData: WarehouseRawData = { locations, todayTransfers, weekTransfers, stockItems, criticalItems }
      setRaw(fetchedData)

      // Compute transfer buckets
      const dailyBuckets = buildDailyTransferBuckets(weekTransfers, 7)

      // Parallel Web Worker tasks
      const [svResult, trendResult] = await Promise.all([
        stockItems.length > 0
          ? compute<StockValueResult>('COMPUTE_STOCK_VALUE', {
              stocks: stockItems.map((s: any) => ({
                qty: s.quantity ?? s.qty ?? 0,
                unitCost: Number(s.product?.baseCost || s.unitCost || s.cost || 0),
                capacity: Number(s.capacity || 100),
                locationId: s.locationId || '',
                locationName: s.location?.name || s.locationName || 'General'
              }))
            })
          : Promise.resolve(null),
        compute<TrendsResult>('COMPUTE_TRENDS', {
          values: dailyBuckets.map(d => d.count),
          labels: dailyBuckets.map(d => d.label)
        })
      ])

      setStockVal(svResult)
      setTransferTrend(trendResult)
    } catch (err: any) {
      logger.error('useWarehouseDashboardData error:', err)
    } finally {
      setLoading(false)
    }
  }, [compute])

  useEffect(() => {
    loadData()
  }, [loadData, refreshSignal])

  // Processed sparkline chart points
  const trendData: DailyBucketPoint[] = useMemo(() => {
    if (!transferTrend) return []
    return transferTrend.movingAvg.map((v, i) => ({
      v: Number(v.toFixed(1)),
      label: transferTrend.labels[i] || `Day ${i + 1}`,
      count: Number(v.toFixed(1))
    }))
  }, [transferTrend])

  // Aggregated KPIs
  const kpis: DashboardKPIData = useMemo(() => {
    const pendingTransfers = raw.todayTransfers.filter(t => t.status === 'draft' || t.status === 'pending').length
    const fallbackValue = raw.stockItems.reduce((sum, item) => {
      const cost = Number(item.unitCost || 0)
      return sum + Number(item.quantity || 0) * cost
    }, 0)

    return {
      totalLocations: raw.locations.length,
      lowStockLocations: raw.locations.filter(l => l.hasLowStock).length,
      stockValue: stockVal?.totalValue ?? fallbackValue,
      totalSKUs: raw.stockItems.length,
      utilizationPct: stockVal?.utilization ?? 0,
      totalCapacity: stockVal?.totalCapacity ?? 0,
      totalUnits: stockVal?.totalQty ?? raw.stockItems.reduce((s, i) => s + Number(i.quantity || 0), 0),
      todayTransfersCount: raw.todayTransfers.length,
      pendingTransfersCount: pendingTransfers,
      criticalItemsCount: raw.criticalItems.length
    }
  }, [raw, stockVal])

  const topLocations: LocationMetric[] = useMemo(() => {
    if (stockVal?.topLocations) {
      return stockVal.topLocations.map((loc: any) => ({
        id: loc.id || loc.locationId || loc.name,
        name: loc.name || loc.locationName || 'General Node',
        utilization: loc.utilization || 0,
        value: loc.value || 0,
        qty: loc.qty || 0
      }))
    }
    return []
  }, [stockVal])

  return {
    raw,
    kpis,
    trendData,
    transferTrend,
    topLocations,
    loading,
    refresh: loadData
  }
}