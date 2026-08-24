import { useState, useEffect, useCallback } from 'react'
import { RestaurantShiftData, ZReportData, OpenShiftFormData, CloseShiftFormData } from '../types'

export function useShiftsManagement() {
  const [activeShift, setActiveShift] = useState<RestaurantShiftData | null>(null)
  const [zReport, setZReport] = useState<ZReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadActiveShift = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const shift = await window.api.restaurant.getActiveShift()
      setActiveShift(shift || null)
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch active server shift')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActiveShift()
  }, [loadActiveShift])

  const openShift = async (data: OpenShiftFormData) => {
    try {
      const shift = await window.api.restaurant.openShift({
        serverId: data.serverId || 'server_1',
        serverName: data.serverName || 'Lead Server',
        startCash: Number(data.startCash || 0)
      })
      setActiveShift(shift)
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to open shift')
      return false
    }
  }

  const closeShift = async (shiftId: string, data: CloseShiftFormData) => {
    try {
      await window.api.restaurant.closeShift({
        id: shiftId,
        endCash: Number(data.endCash || 0),
        notes: data.notes || undefined,
      })
      const report = await window.api.restaurant.getZReportData(shiftId)
      setZReport(report)
      setActiveShift(null)
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to close shift')
      return false
    }
  }

  const fetchZReport = async (shiftId: string) => {
    try {
      const report = await window.api.restaurant.getZReportData(shiftId)
      setZReport(report)
    } catch (err: any) {
      alert(err?.message || 'Failed to fetch Z-Report')
    }
  }

  return {
    activeShift,
    zReport,
    setZReport,
    loading,
    error,
    refreshShift: loadActiveShift,
    openShift,
    closeShift,
    fetchZReport
  }
}