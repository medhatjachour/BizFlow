import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { ReportPeriod, GymReportStats, GymSessionRecord, SessionFilterOptions } from '../types'

export function useGymReports(refreshSignal?: number) {
  const toast = useToast()
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [stats, setStats] = useState<GymReportStats | null>(null)
  const [sessions, setSessions] = useState<GymSessionRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [filters, setFilters] = useState<SessionFilterOptions>({
    type: 'all',
    searchQuery: ''
  })

  const loadReportData = useCallback(async () => {
    setLoading(true)
    try {
      // Passes either the period name ('today', 'yesterday', 'month') or specific target date
      const [statsRes, sessionsRes] = await Promise.all([
        (window.api as any)?.gym?.stats?.overview?.(period, { date: selectedDate }),
        (window.api as any)?.gym?.sessions?.getAll?.({
          period,
          date: selectedDate,
          skip: 0,
          take: 100
        })
      ])

      setStats(statsRes ?? null)
      const rawSessions = Array.isArray(sessionsRes) ? sessionsRes : sessionsRes?.data ?? []
      setSessions(rawSessions)
    } catch (err: any) {
      toast.error(err?.message ?? 'Unable to fetch gym report dataset')
    } finally {
      setLoading(false)
    }
  }, [period, selectedDate, toast])

  useEffect(() => {
    loadReportData()
  }, [loadReportData, refreshSignal])

  // Filtered session records in memory
  const filteredSessions = sessions.filter((sess) => {
    const matchesType = filters.type === 'all' || sess.type === filters.type
    const traineeName = sess.trainee?.name?.toLowerCase() ?? ''
    const coachName = sess.coach?.name?.toLowerCase() ?? ''
    const q = filters.searchQuery.toLowerCase().trim()
    const matchesSearch = !q || traineeName.includes(q) || coachName.includes(q)
    return matchesType && matchesSearch
  })

  return {
    period,
    setPeriod,
    selectedDate,
    setSelectedDate,
    stats,
    sessions: filteredSessions,
    totalSessionsCount: sessions.length,
    loading,
    filters,
    setFilters,
    refresh: loadReportData
  }
}