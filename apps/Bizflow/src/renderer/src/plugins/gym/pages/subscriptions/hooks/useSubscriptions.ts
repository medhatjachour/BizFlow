import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Subscription, SubscriptionFilter, SubscriptionViewMode } from '../types'
import { PAGE_SIZE } from '../constants'

export function useSubscriptions() {
  const toast = useToast()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [filter, setFilter] = useState<SubscriptionFilter>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<SubscriptionViewMode>('cards')
  const [expiringSoonCount, setExpiringSoonCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)

  // Modals & Action Targets
  const [formOpen, setFormOpen] = useState(false)
  const [renewTarget, setRenewTarget] = useState<Subscription | null>(null)
  const [freezeTarget, setFreezeTarget] = useState<Subscription | null>(null)
  const [freezeDays, setFreezeDays] = useState(7)
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const loadSubscriptions = useCallback(async (pg = 0, currentFilter = filter) => {
    setLoading(true)
    try {
      const res = await (window.api as any).gym?.subscriptions?.getAll({
        status: currentFilter === 'all' ? undefined : currentFilter === 'expiring' ? 'active' : currentFilter,
        skip: pg * PAGE_SIZE,
        take: PAGE_SIZE
      })
      let data: Subscription[] = Array.isArray(res) ? res : res?.data ?? []

      // Client-side filter for expiring (≤ 7 days remaining)
      if (currentFilter === 'expiring') {
        data = data.filter(s => {
          const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000)
          return daysLeft >= 0 && daysLeft <= 7
        })
      }

      setSubs(data)

      // Count expiring total in the background
      const expRes = await (window.api as any).gym?.subscriptions?.getAll({ status: 'active', skip: 0, take: 500 })
      const expData: Subscription[] = Array.isArray(expRes) ? expRes : expRes?.data ?? []
      const count = expData.filter(s => {
        const dl = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000)
        return dl >= 0 && dl <= 7
      }).length
      setExpiringSoonCount(count)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [filter, toast])

  useEffect(() => {
    setPage(0)
    loadSubscriptions(0, filter)
  }, [filter, loadSubscriptions])

  const handleFreeze = async () => {
    if (!freezeTarget) return
    setActingId(freezeTarget.id)
    try {
      await (window.api as any).gym?.subscriptions?.freeze(freezeTarget.id, {
        days: freezeDays,
        reason: 'Manual freeze'
      })
      toast.success(`Subscription frozen for ${freezeDays} days`)
      setFreezeTarget(null)
      loadSubscriptions(page, filter)
    } catch (err: any) {
      toast.error(err.message ?? 'Freeze failed')
    } finally {
      setActingId(null)
    }
  }

  const handleUnfreeze = async (id: string) => {
    setActingId(id)
    try {
      await (window.api as any).gym?.subscriptions?.unfreeze(id)
      toast.success('Subscription reactivated')
      loadSubscriptions(page, filter)
    } catch (err: any) {
      toast.error(err.message ?? 'Unfreeze failed')
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await (window.api as any).gym?.subscriptions?.delete(deleteTarget.id)
      toast.success('Subscription deleted')
      setDeleteTarget(null)
      loadSubscriptions(page, filter)
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    }
  }

  const handleRenew = (sub: Subscription) => {
    setRenewTarget(sub)
    setFormOpen(true)
  }

  const filteredSubs = useMemo(() => {
    if (!searchQuery.trim()) return subs
    const q = searchQuery.toLowerCase()
    return subs.filter(
      s =>
        s.trainee?.name.toLowerCase().includes(q) ||
        s.plan?.name.toLowerCase().includes(q) ||
        s.coach?.name.toLowerCase().includes(q) ||
        s.trainee?.phone?.includes(q)
    )
  }, [subs, searchQuery])

  return {
    subs: filteredSubs,
    rawCount: subs.length,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    expiringSoonCount,
    loading,
    page,
    setPage,
    formOpen,
    setFormOpen,
    renewTarget,
    setRenewTarget,
    freezeTarget,
    setFreezeTarget,
    freezeDays,
    setFreezeDays,
    deleteTarget,
    setDeleteTarget,
    actingId,
    handleFreeze,
    handleUnfreeze,
    handleDelete,
    handleRenew,
    reload: () => loadSubscriptions(page, filter)
  }
}