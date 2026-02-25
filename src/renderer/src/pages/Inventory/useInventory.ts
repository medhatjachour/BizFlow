/**
 * useInventory Hook
 * Custom hook for inventory data management with caching
 */

import { useState, useEffect, useCallback } from 'react'
import { InventoryItem, InventoryMetrics } from '../../../../shared/types'
import logger from '../../../../shared/utils/logger'

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Use globalThis for API access
      const api = (globalThis as any).api
      if (!api?.inventory) {
        throw new Error('Inventory API not available')
      }

      const [inventoryData, metricsData] = await Promise.all([
        api.inventory.getAll(),
        api.inventory.getMetrics()
      ])

      setItems(inventoryData)
      setMetrics(metricsData)
    } catch (err) {
      logger.error('Error loading inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const refresh = useCallback(() => {
    loadInventory()
  }, [loadInventory])

  return {
    items,
    metrics,
    loading,
    error,
    refresh
  }
}
