import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Plan } from '../types'

export function usePlans() {
  const toast = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Modals & Action Targets
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Plan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await (window.api as any).gym?.plans?.getAll()
      setPlans(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load membership plans')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const handlePlanSaved = (savedPlan: Plan) => {
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === savedPlan.id)
      return idx >= 0 ? prev.map(p => (p.id === savedPlan.id ? savedPlan : p)) : [savedPlan, ...prev]
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await (window.api as any).gym?.plans?.delete(deleteTarget.id)
      setPlans(prev => prev.filter(p => p.id !== deleteTarget.id))
      toast.success('Membership plan deleted')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete plan')
    } finally {
      setDeleting(false)
    }
  }

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.features?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [plans, filterCategory, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of plans) {
      counts[p.category] = (counts[p.category] ?? 0) + 1
    }
    return counts
  }, [plans])

  return {
    plans: filteredPlans,
    rawPlans: plans,
    loading,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    categoryCounts,
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handlePlanSaved,
    handleDelete,
    reload: loadPlans
  }
}