import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { VetOwnerWithPets, OwnerSortField, OwnerViewMode } from '../types'

const PAGE_SIZE = 30

export function useVetOwners() {
  const toast = useToast()
  const [owners, setOwners] = useState<VetOwnerWithPets[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Controls
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<OwnerSortField>('createdAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [viewMode, setViewMode] = useState<OwnerViewMode>('grid')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadOwners = useCallback(
    async (reset = false) => {
      const currentPage = reset ? 0 : page
      if (reset) {
        setPage(0)
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }

      try {
        const result = (await window.api.vet?.owners.getAll({
          search: search.trim() || undefined,
          skip: currentPage * PAGE_SIZE,
          take: PAGE_SIZE
        })) as any

        if (result) {
          const list: VetOwnerWithPets[] = result.data ?? []
          setOwners((prev) => (reset || currentPage === 0 ? list : [...prev, ...list]))
          setTotal(result.total ?? list.length)
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load pet owners')
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [page, search, toast]
  )

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      loadOwners(true)
    }, search ? 300 : 0)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [search])

  return {
    owners,
    total,
    page,
    setPage,
    loading,
    isRefreshing,
    refresh: () => loadOwners(true),
    loadMore: () => {
      const next = page + 1
      setPage(next)
    },
    search,
    setSearch,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode
  }
}