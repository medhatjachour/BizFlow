import { useState, useEffect, useCallback, useMemo } from 'react'
import { WarehouseReportData, LocationValueChartItem } from '../types'
import { useDashboardWorker, StockValueResult } from '@renderer/hooks/useDashboardWorker'
import { useToast } from '@renderer/contexts/ToastContext'

const EMPTY_DATA: WarehouseReportData = {
  locations: [],
  todayTransfers: [],
  allStockItems: [],
  criticalItems: []
}

export function useWarehouseReportData(refreshSignal?: number) {
  const [data, setData] = useState<WarehouseReportData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [stockValueResult, setStockValueResult] = useState<StockValueResult | null>(null)

  const { compute } = useDashboardWorker()
  const toast = useToast()

  const loadReportData = useCallback(async () => {
    setLoading(true)
    try {
      const api = window.api.warehouse
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const [locsRes, transfersRes, stockRes, criticalRes] = await Promise.allSettled([
        api.getLocations ? api.getLocations() : Promise.resolve([]),
        api.getTransfers ? api.getTransfers({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }) : Promise.resolve([]),
        api.getStock ? api.getStock() : Promise.resolve([]),
        api.getLowStock ? api.getLowStock() : Promise.resolve([])
      ])

      const locations = locsRes.status === 'fulfilled' ? locsRes.value || [] : []
      const todayTransfers = transfersRes.status === 'fulfilled' ? transfersRes.value || [] : []
      const allStockItems = stockRes.status === 'fulfilled' ? stockRes.value || [] : []
      const criticalItems = criticalRes.status === 'fulfilled' ? criticalRes.value || [] : []

      setData({ locations, todayTransfers, allStockItems, criticalItems })

      // Compute heavy stock valuation in worker thread
      if (allStockItems.length > 0 && locations.length > 0) {
        const stocks = allStockItems.map((item: any) => ({
          locationId: item.locationId || '',
          locationName: locations.find((l: any) => l.id === item.locationId)?.name || 'General',
          quantity: Number(item.quantity || 0),
          capacity: Number(item.capacity || 100),
          unitValue: Number(item.product?.baseCost || item.unitCost || 0)
        }))

        const workerResult = await compute<StockValueResult>('COMPUTE_STOCK_VALUE', { stocks })
        if (workerResult) {
          setStockValueResult(workerResult)
        }
      }
    } catch (err: any) {
      console.error('[useWarehouseReportData] Error loading data:', err)
      toast.error('Failed to load warehouse report metrics')
    } fontally: {
      setLoading(false)
    }
  }, [compute, toast])

  useEffect(() => {
    loadReportData()
  }, [loadReportData, refreshSignal])

  const chartData: LocationValueChartItem[] = useMemo(() => {
    if (stockValueResult?.topLocations) {
      return stockValueResult.topLocations.slice(0, 8)
    }

    // Fallback in-memory rollup
    const map = new Map<string, number>()
    const locationMap = new Map(data.locations.map(l => [l.id, l.name]))

    data.allStockItems.forEach(item => {
      const locName = locationMap.get(item.locationId) || 'General'
      const cost = Number(item.product?.baseCost || item.unitCost || 0)
      const total = Number(item.quantity || 0) * cost
      map.set(locName, (map.get(locName) || 0) + total)
    })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [stockValueResult, data])

  const totalValue = useMemo(() => {
    if (stockValueResult?.totalValue) return stockValueResult.totalValue
    return data.allStockItems.reduce((acc, item) => {
      const cost = Number(item.product?.baseCost || item.unitCost || 0)
      return acc + Number(item.quantity || 0) * cost
    }, 0)
  }, [stockValueResult, data])

  return {
    data,
    loading,
    totalValue,
    chartData,
    refresh: loadReportData
  }
}