import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Material, MaterialStats, StockFilter, ExpiryFilter, SortField, SortDirection } from '../types'

export function useMaterials() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [materials, setMaterials] = useState<Material[]>([])
  const [stats, setStats] = useState<MaterialStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter, stockFilter, expiryFilter, sortBy, sortDir, pageSize])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const skip = (page - 1) * pageSize
      const [res, s] = await Promise.all([
        window.api.clinic.materials.getAll({
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined,
          stockStatus: stockFilter,
          expiryStatus: expiryFilter,
          sortBy,
          sortDir,
          skip,
          take: pageSize
        }),
        window.api.clinic.materials.stats()
      ])

      setMaterials(res.data ?? [])
      setTotal(res.total ?? 0)
      setHasMore(Boolean(res.hasMore))
      setStats(s ?? null)
    } catch {
      showToast('error', t('errorLoadingData') || 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, categoryFilter, stockFilter, expiryFilter, sortBy, sortDir, page, pageSize, showToast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const deleteMaterial = async (id: string) => {
    try {
      await window.api.clinic.materials.delete(id)
      showToast('success', t('deletedSuccessfully') || 'Material deleted')
      await loadData()
    } catch (err: any) {
      if (err?.message?.includes('MATERIAL_IN_USE')) {
        showToast('error', t('materialInUseError') || 'Material is used in sessions and cannot be deleted.')
      } else {
        showToast('error', t('errorDeletingRecord') || 'Error deleting material')
      }
    }
  }

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('')
    setStockFilter('all')
    setExpiryFilter('all')
    setSortBy('name')
    setSortDir('asc')
    setPage(1)
  }

  const hasActiveFilters = Boolean(
    search.trim() ||
    categoryFilter ||
    stockFilter !== 'all' ||
    expiryFilter !== 'all' ||
    sortBy !== 'name' ||
    sortDir !== 'asc'
  )

  return {
    materials,
    stats,
    loading,
    total,
    hasMore,
    page,
    pageSize,
    search,
    categoryFilter,
    stockFilter,
    expiryFilter,
    sortBy,
    sortDir,
    hasActiveFilters,
    setSearch,
    setCategoryFilter,
    setStockFilter,
    setExpiryFilter,
    setSortBy,
    setSortDir,
    setPage,
    setPageSize,
    clearFilters,
    deleteMaterial,
    reload: loadData
  }
}