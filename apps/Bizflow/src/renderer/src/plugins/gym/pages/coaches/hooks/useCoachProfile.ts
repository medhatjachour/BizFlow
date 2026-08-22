import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Coach, CoachStats, CoachProfileTab } from '../types'

export function useCoachProfile(initialCoach: Coach, onEdited: (c: Coach) => void) {
  const toast = useToast()
  const [coach, setCoach] = useState<Coach>(initialCoach)
  const [tab, setTab] = useState<CoachProfileTab>('info')
  const [stats, setStats] = useState<CoachStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Sub modals
  const [editOpen, setEditOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const s = await (window.api as any).gym?.coaches?.getStats(coach.id)
      setStats(s)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load coach metrics')
    } finally {
      setLoadingStats(false)
    }
  }, [coach.id, toast])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleEdited = (updatedCoach: Coach) => {
    setCoach(updatedCoach)
    onEdited(updatedCoach)
    setEditOpen(false)
    loadStats()
  }

  return {
    coach,
    tab,
    setTab,
    stats,
    loadingStats,
    editOpen,
    setEditOpen,
    qrOpen,
    setQrOpen,
    handleEdited,
    reloadStats: loadStats
  }
}