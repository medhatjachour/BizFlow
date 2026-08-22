import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Program, CoachLite, ProgramViewMode } from '../types'

export function usePrograms() {
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [programs, setPrograms] = useState<Program[]>([])
  const [coaches, setCoaches] = useState<CoachLite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ProgramViewMode>('cards')

  // Modals & Active Program Selection
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Program | null>(null)
  const [detailTarget, setDetailTarget] = useState<Program | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [progsRes, coachRes] = await Promise.all([
        (window.api as any).gym?.programs?.getAll(),
        (window.api as any).gym?.coaches?.getAll({ take: 100 })
      ])
      setPrograms(Array.isArray(progsRes) ? progsRes : progsRes?.data ?? [])
      setCoaches(Array.isArray(coachRes) ? coachRes : coachRes?.data ?? [])
    } catch (err: any) {
      toastRef.current.error(err.message ?? 'Failed to load training programs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await (window.api as any).gym?.programs?.delete(deleteTarget.id)
      toastRef.current.success(`Program "${deleteTarget.name}" deleted`)
      setPrograms(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      if (detailTarget?.id === deleteTarget.id) {
        setDetailTarget(null)
      }
    } catch (err: any) {
      toastRef.current.error(err.message ?? 'Failed to delete program')
    } finally {
      setDeleting(false)
    }
  }

  const handleProgramSaved = useCallback((saved: Program) => {
    setPrograms(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      return idx >= 0 ? prev.map(p => (p.id === saved.id ? saved : p)) : [saved, ...prev]
    })
  }, [])

  const filteredPrograms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return programs.filter(p => {
      const matchesGoal = goalFilter === 'all' || p.goal.toLowerCase() === goalFilter.toLowerCase()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.coach?.name?.toLowerCase().includes(q) ||
        p.goal.toLowerCase().includes(q)
      return matchesGoal && matchesSearch
    })
  }, [programs, goalFilter, searchQuery])

  return {
    programs: filteredPrograms,
    rawPrograms: programs,
    coaches,
    loading,
    searchQuery,
    setSearchQuery,
    goalFilter,
    setGoalFilter,
    viewMode,
    setViewMode,
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    detailTarget,
    setDetailTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    handleProgramSaved,
    reload: loadData
  }
}