// src/pages/shifts/hooks/useShiftsManagement.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { RestaurantShiftData, ZReportData, OpenShiftFormData, CloseShiftFormData } from '../types'
import { sounds } from '../../utils/sound'

export function useShiftsManagement() {
  const [activeShift, setActiveShift] = useState<RestaurantShiftData | null>(null)
  const [shiftHistory, setShiftHistory] = useState<RestaurantShiftData[]>([])
  const [zReport, setZReport] = useState<ZReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [current, history] = await Promise.all([
        window.api.restaurant.getActiveShift(),
        window.api.restaurant.getShiftHistory({ limit: 40 })
      ])
      setActiveShift(current || null)
      setShiftHistory(history || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load shift records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-Time Event Bus Listener: Updates automatically when a shift opens or closes
  useEffect(() => {
    const unsub = window.api.restaurant.onEvent('shift:changed', () => {
      loadData()
    })
    return () => unsub()
  }, [loadData])

  const filteredHistory = useMemo(() => {
    return shiftHistory.filter((s) => {
      const query = searchQuery.trim().toLowerCase()
      return (
        query === '' ||
        s.serverName.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      )
    })
  }, [shiftHistory, searchQuery])

  // Aggregate Stats across past closed shifts
  const historyStats = useMemo(() => {
    const closed = shiftHistory.filter((s) => s.status === 'closed')
    const totalSales = closed.reduce((acc, s) => acc + (s.totalSales || 0), 0)
    const totalTips = closed.reduce((acc, s) => acc + (s.totalTips || 0), 0)
    return {
      closedShiftsCount: closed.length,
      totalSales,
      totalTips
    }
  }, [shiftHistory])

  const openShift = async (data: OpenShiftFormData) => {
    try {
      sounds.playSuccess()
      const shift = await window.api.restaurant.openShift({
        serverId: data.serverId || 'server_1',
        serverName: data.serverName || 'Lead Server',
        startCash: Number(data.startCash || 0)
      })
      setActiveShift(shift)
      loadData()
      return true
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to open shift')
      return false
    }
  }

  const closeShift = async (shiftId: string, data: CloseShiftFormData) => {
    try {
      sounds.playSuccess()
      await window.api.restaurant.closeShift({
        id: shiftId,
        endCash: Number(data.endCash || 0),
        notes: data.notes || undefined
      })
      const report = await window.api.restaurant.getZReportData(shiftId)
      setZReport(report)
      setActiveShift(null)
      loadData()
      return true
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to balance and close shift')
      return false
    }
  }

  const fetchZReport = async (shiftId: string) => {
    try {
      sounds.playBump()
      const report = await window.api.restaurant.getZReportData(shiftId)
      setZReport(report)
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to fetch Z-Report')
    }
  }

  return {
    activeShift,
    shiftHistory: filteredHistory,
    historyStats,
    zReport,
    setZReport,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refreshShifts: loadData,
    openShift,
    closeShift,
    fetchZReport
  }
}