import { useState, useEffect, useCallback, useMemo } from 'react'
import type { MedicineLite, CatalogViewMode, CatalogQuickFilter } from '../types'
import { daysUntil } from '../utils'

export function useVetCatalog() {
  const [medicines, setMedicines] = useState<MedicineLite[]>([])
  const [categories, setCategories] = useState<string[]>(['all'])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [quickFilter, setQuickFilter] = useState<CatalogQuickFilter>('all')
  const [viewMode, setViewMode] = useState<CatalogViewMode>('grid')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [medRes, catRes] = await Promise.all([
        (window as any).api?.vet?.medicines?.getAll({ skip: 0, take: 500 }),
        (window as any).api?.vet?.medicineCategories?.getAll().catch(() => [])
      ])
      setMedicines(medRes?.data ?? [])
      if (Array.isArray(catRes)) {
        setCategories(['all', ...catRes.map(c => c.name)])
      }
    } catch {
      // safe fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase()
    return medicines.filter(m => {
      // 1. Search Query Match
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.batches.some(b => b.batchNumber?.toLowerCase().includes(q))

      // 2. Category Match
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory

      // 3. Quick Status Filter
      let matchQuick = true
      if (quickFilter === 'in_stock') matchQuick = m.totalStock > 0
      if (quickFilter === 'low_stock') matchQuick = m.isLowStock && m.totalStock > 0
      if (quickFilter === 'expiring') {
        matchQuick = m.batches.some(b => {
          const days = daysUntil(b.expiryDate)
          return days >= 0 && days <= 30
        })
      }

      return matchSearch && matchCat && matchQuick
    })
  }, [medicines, search, selectedCategory, quickFilter])

  // Category items count lookup
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: medicines.length }
    for (const m of medicines) {
      map[m.category] = (map[m.category] || 0) + 1
    }
    return map
  }, [medicines])

  return {
    medicines,
    filteredMedicines,
    categories,
    categoryCounts,
    loading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    quickFilter,
    setQuickFilter,
    viewMode,
    setViewMode,
    refreshCatalog: loadData
  }
}