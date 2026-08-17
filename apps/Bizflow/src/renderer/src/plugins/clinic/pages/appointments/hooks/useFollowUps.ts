import { useState, useCallback, useEffect, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { daysDiff } from '../utils'
import type { FollowUp, FollowUpFilter } from '../types'

const PAGE_SIZE = 20

export function useFollowUps() {
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [filter, setFilter] = useState<FollowUpFilter>('today')
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [clearingId, setClearingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.clinic.appointments.getAllFollowUps({ filter: 'all' })
      setAllFollowUps(data ?? [])
    } catch {
      showToast('error', t('failedLoadFollowUps'))
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setPage(1)
  }, [filter])

  const markDone = async (fu: FollowUp) => {
    setClearingId(fu.id)
    try {
      await window.api.clinic.appointments.clearFollowUp(fu.id)
      showToast('success', t('followUpMarkedDone').replace('{name}', fu.patient.name))
      setAllFollowUps((prev) => prev.filter((f) => f.id !== fu.id))
    } catch {
      showToast('error', t('followUpClearFailed'))
    } finally {
      setClearingId(null)
    }
  }

  // Summary counts
  const counts = useMemo(
    () => ({
      today: allFollowUps.filter((f) => daysDiff(f.followUpDate) === 0).length,
      overdue: allFollowUps.filter((f) => daysDiff(f.followUpDate) < 0).length,
      upcoming: allFollowUps.filter((f) => daysDiff(f.followUpDate) > 0).length,
      all: allFollowUps.length
    }),
    [allFollowUps]
  )

  const filtered = useMemo(() => {
    if (filter === 'today') return allFollowUps.filter((f) => daysDiff(f.followUpDate) === 0)
    if (filter === 'overdue') return allFollowUps.filter((f) => daysDiff(f.followUpDate) < 0)
    if (filter === 'upcoming') return allFollowUps.filter((f) => daysDiff(f.followUpDate) > 0)
    return allFollowUps
  }, [filter, allFollowUps])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return {
    filter,
    setFilter,
    counts,
    loading,
    clearingId,
    pageItems,
    totalPages,
    safePage,
    totalItems: filtered.length,
    setPage,
    markDone,
    reload: loadData
  }
}