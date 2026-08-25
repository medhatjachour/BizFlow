// src/pages/Kitchen/hooks/useKdsOrders.ts
import { useState, useEffect, useCallback } from 'react'
import { sounds } from '../../utils/sound'
import { KdsStation, KdsTicket, OverviewMetrics } from '../../Kitchen/types'

export function useKdsOrders(initialStation: KdsStation = 'All') {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [tickets, setTickets] = useState<KdsTicket[]>([])
  const [station, setStation] = useState<KdsStation>(initialStation)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [overviewData, kdsData] = await Promise.all([
        window.api.restaurant.getOverview(),
        window.api.restaurant.getKdsActiveTickets(station === 'All' ? undefined : station)
      ])
      setMetrics(overviewData)
      setTickets(kdsData || [])
    } finally {
      setLoading(false)
    }
  }, [station])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-Time Event Bus Listeners: Instantly update without polling
  useEffect(() => {
    const unsubBumpItem = window.api.restaurant.onEvent('kds:item_bumped', () => {
      if (soundEnabled) sounds.playBump()
      loadData()
    })

    const unsubBumpTicket = window.api.restaurant.onEvent('kds:ticket_bumped', () => {
      if (soundEnabled) sounds.playSuccess()
      loadData()
    })

    const unsubNewOrder = window.api.restaurant.onEvent('order:created', () => {
      if (soundEnabled) sounds.playSuccess()
      loadData()
    })

    const unsubOrderUpdated = window.api.restaurant.onEvent('order:updated', () => {
      loadData()
    })

    return () => {
      unsubBumpItem()
      unsubBumpTicket()
      unsubNewOrder()
      unsubOrderUpdated()
    }
  }, [soundEnabled, loadData])

  const bumpItem = async (itemId: string) => {
    try {
      sounds.playBump()
      await window.api.restaurant.bumpKdsItem(itemId)
      loadData()
    } catch {}
  }

  const bumpTicket = async (orderId: string) => {
    try {
      sounds.playSuccess()
      await window.api.restaurant.bumpKdsTicket(orderId)
      loadData()
    } catch {}
  }

  return {
    metrics,
    tickets,
    station,
    setStation,
    soundEnabled,
    setSoundEnabled,
    loading,
    refreshData: loadData,
    bumpItem,
    bumpTicket
  }
}