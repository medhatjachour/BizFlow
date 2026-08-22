import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Locker, LockerZoneFilter, LockerViewMode } from '../types'
import { isLockerOccupied } from '../utils'

export function useLockers() {
  const toast = useToast()
  const [lockers, setLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)
  const [zone, setZone] = useState<LockerZoneFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<LockerViewMode>('grid')

  // Modals & Action Targets
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Locker | null>(null)
  const [assignTarget, setAssignTarget] = useState<Locker | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Locker | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadLockers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await (window.api as any).gym?.lockers?.getAll()
      setLockers(Array.isArray(res) ? res : [])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load lockers')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadLockers()
  }, [loadLockers])

  const handleUnassign = async (locker: Locker) => {
    const memberName = locker.assignments?.[0]?.trainee?.name || 'member'
    try {
      await (window.api as any).gym?.lockers?.unassign(locker.id)
      toast.success(`Locker ${locker.number} released from ${memberName}`)
      loadLockers()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to unassign locker')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await (window.api as any).gym?.lockers?.delete(deleteTarget.id)
      toast.success(`Locker ${deleteTarget.number} deleted`)
      setDeleteTarget(null)
      loadLockers()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete locker')
    } finally {
      setDeleting(false)
    }
  }

  const filteredLockers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return lockers
      .filter(l => zone === 'all' || l.zone === zone)
      .filter(l => {
        if (!q) return true
        const matchesNumber = l.number.toLowerCase().includes(q)
        const matchesMember = l.assignments?.[0]?.trainee?.name?.toLowerCase().includes(q)
        const matchesPhone = l.assignments?.[0]?.trainee?.phone?.includes(q)
        return matchesNumber || matchesMember || matchesPhone
      })
  }, [lockers, zone, searchQuery])

  const stats = useMemo(() => {
    const total = lockers.length
    const occupied = lockers.filter(isLockerOccupied).length
    const available = total - occupied
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0
    return { total, occupied, available, rate }
  }, [lockers])

  return {
    lockers: filteredLockers,
    rawLockers: lockers,
    stats,
    loading,
    zone,
    setZone,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    assignTarget,
    setAssignTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleUnassign,
    handleDelete,
    reload: loadLockers
  }
}