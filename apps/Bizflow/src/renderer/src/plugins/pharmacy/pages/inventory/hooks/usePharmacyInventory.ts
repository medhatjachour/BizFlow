import { useState, useEffect, useCallback, useMemo } from 'react'
import { pharma } from '../../components/_shared'
import { ExpiringBatchItem, InventoryStats, ExpiryWindowDays } from '../types'

export function usePharmacyInventory(toast: any) {
  const [days, setDays] = useState<ExpiryWindowDays>(30)
  const [search, setSearch] = useState('')
  const [batches, setBatches] = useState<ExpiringBatchItem[]>([])
  const [summary, setSummary] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [expiringList, stats] = await Promise.all([
        pharma()?.batches.getExpiring({ days, includeExpired: true }),
        pharma()?.stats.inventory(),
      ])
      setBatches(expiringList ?? [])
      setSummary(stats ?? null)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch inventory data')
    } finally {
      setLoading(false)
    }
  }, [days, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return batches
    const q = search.toLowerCase()
    return batches.filter(
      b =>
        b.product?.name?.toLowerCase().includes(q) ||
        b.product?.genericName?.toLowerCase().includes(q) ||
        b.batchNumber?.toLowerCase().includes(q)
    )
  }, [batches, search])

  const atRiskTotalValue = useMemo(() => {
    return filteredBatches.reduce((acc, b) => acc + (b.value || 0), 0)
  }, [filteredBatches])

  return {
    days,
    search,
    batches: filteredBatches,
    rawBatchesCount: batches.length,
    summary,
    loading,
    atRiskTotalValue,
    setDays,
    setSearch,
    reload: loadData,
  }
}