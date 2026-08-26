import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Medicine, BatchFilterKey, SortOption } from '../types'

export function useVetMedicines() {
  const toast = useToast()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [batchFilter, setBatchFilter] = useState<BatchFilterKey>(null)
  const [sortOption, setSortOption] = useState<SortOption>('name-asc')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const api = (window as any).api?.vet?.medicines

  const fetchMedicines = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api?.getAll?.({
        search: search.trim() || undefined,
        category: category !== 'all' ? category : undefined,
        take: 2000
      })
      setMedicines(res?.data ?? [])
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load medicines')
    } finally {
      setLoading(false)
    }
  }, [api, search, category, toast])

  useEffect(() => {
    fetchMedicines()
  }, [fetchMedicines])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(medicines.map(m => m.id)))
  }, [medicines])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const metrics = useMemo(() => {
    const totalCount = medicines.length
    const expiredCount = medicines.filter(m => m.hasExpired).length
    const expiringCount = medicines.filter(m => m.expiresWithin30Days && !m.hasExpired).length
    const lowStockCount = medicines.filter(m => m.isLowStock).length
    const totalValuation = medicines.reduce((acc, med) => {
      const val = med.batches?.reduce((sum, b) => sum + b.quantity * (b.costPerUnit || 0), 0) ?? 0
      return acc + val
    }, 0)

    return { totalCount, expiredCount, expiringCount, lowStockCount, totalValuation }
  }, [medicines])

  const processedMedicines = useMemo(() => {
    let result = [...medicines]

    if (batchFilter === 'expired') {
      result = result.filter(m => m.hasExpired)
    } else if (batchFilter === 'expiring') {
      result = result.filter(m => m.expiresWithin30Days && !m.hasExpired)
    } else if (batchFilter === 'low_stock') {
      result = result.filter(m => m.isLowStock)
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'stock-desc':
          return b.totalStock - a.totalStock
        case 'stock-asc':
          return a.totalStock - b.totalStock
        case 'expiry-asc': {
          if (!a.nearestExpiry) return 1
          if (!b.nearestExpiry) return -1
          return new Date(a.nearestExpiry).getTime() - new Date(b.nearestExpiry).getTime()
        }
        default:
          return 0
      }
    })

    return result
  }, [medicines, batchFilter, sortOption])

  return {
    medicines: processedMedicines,
    rawCount: medicines.length,
    loading,
    search,
    setSearch,
    category,
    setCategory,
    batchFilter,
    setBatchFilter,
    sortOption,
    setSortOption,
    expandedIds,
    toggleExpand,
    expandAll,
    collapseAll,
    metrics,
    refresh: fetchMedicines
  }
}