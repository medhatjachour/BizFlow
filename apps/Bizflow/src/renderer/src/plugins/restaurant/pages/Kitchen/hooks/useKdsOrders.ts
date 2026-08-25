import { useState, useEffect, useCallback } from 'react'
import { KdsTicket, KdsStation, OverviewMetrics } from '../types'

export function useKdsOrders(initialStation: KdsStation = 'All') {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [tickets, setTickets] = useState<KdsTicket[]>([])
  const [station, setStation] = useState<KdsStation>(initialStation)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [overviewData, kdsData] = await Promise.all([
        window.api.restaurant.getOverview(),
        window.api.restaurant.getKdsActiveTickets(station === 'All' ? undefined : station)
      ])
      setMetrics(overviewData)
      setTickets(kdsData || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch restaurant live operations data')
    } finally {
      setLoading(false)
    }
  }, [station])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 8000) // 8s auto-refresh
    return () => clearInterval(interval)
  }, [loadData])

  const bumpItem = async (itemId: string) => {
    try {
      await window.api.restaurant.bumpKdsItem(itemId)
      loadData()
    } catch (err) {
      console.error('Failed to bump item', err)
    }
  }

  const bumpTicket = async (orderId: string) => {
    try {
      await window.api.restaurant.bumpKdsTicket(orderId)
      loadData()
    } catch (err) {
      console.error('Failed to bump ticket', err)
    }
  }

  return {
    metrics,
    tickets,
    station,
    setStation,
    soundEnabled,
    setSoundEnabled,
    loading,
    error,
    refreshData: loadData,
    bumpItem,
    bumpTicket
  }
}