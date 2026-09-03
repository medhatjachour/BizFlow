import { useState, useCallback, useEffect, useMemo } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Store, StoreFormData, StoreFilters, StoreMetrics, ViewMode } from '../types'
import { getToggledStatus, isStoreActive } from '../utils'
import logger from '@/shared/utils/logger'

export function useStores() {
  const { t } = useLanguage()
  const toast = useToast()

  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  
  const [filters, setFilters] = useState<StoreFilters>({
    search: '',
    status: 'all',
    sortBy: 'name',
    sortDirection: 'asc'
  })

  const loadStores = useCallback(async () => {
    try {
      setLoading(true)
      const data = await ipc.stores.getAll()
      setStores(Array.isArray(data) ? data : [])
    } catch (error) {
      logger.error('Failed to load stores:', error)
      toast.error(t('failedToLoadStores') || 'Failed to load branch records')
      setStores([])
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadStores()
  }, [loadStores])

  const createStore = useCallback(
    async (data: StoreFormData): Promise<boolean> => {
      try {
        if (!data.name.trim()) {
          toast.error(t('storeNameRequired') || 'Branch name is required')
          return false
        }
        const result = await ipc.stores.create(data)
        if (result?.success || result?.id) {
          toast.success(t('storeCreatedSuccessfully') || 'New branch added successfully')
          await loadStores()
          return true
        }
        toast.error(result?.message || t('failedToCreateStore') || 'Failed to create store')
        return false
      } catch (error: any) {
        logger.error('Failed to create store:', error)
        toast.error(error?.message || 'Failed to create store')
        return false
      }
    },
    [loadStores, t, toast]
  )

  const updateStore = useCallback(
    async (id: string, data: Partial<StoreFormData> | Store): Promise<boolean> => {
      try {
        const result = await ipc.stores.update(id, data)
        if (result?.success !== false) {
          toast.success(t('storeUpdatedSuccessfully') || 'Branch details updated')
          await loadStores()
          return true
        }
        toast.error(t('failedToUpdateStore') || 'Failed to update store')
        return false
      } catch (error: any) {
        logger.error('Failed to update store:', error)
        toast.error(error?.message || 'Failed to update store')
        return false
      }
    },
    [loadStores, t, toast]
  )

  const deleteStore = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      try {
        const result = await ipc.stores.delete(id)
        if (result?.success !== false) {
          toast.success(`${name} ${t('storeDeleted') || 'branch removed'}`)
          await loadStores()
          return true
        }
        toast.error(t('failedToDeleteStore') || 'Failed to remove branch')
        return false
      } catch (error: any) {
        logger.error('Failed to delete store:', error)
        toast.error(error?.message || 'Failed to delete store')
        return false
      }
    },
    [loadStores, t, toast]
  )

  const toggleStatus = useCallback(
    async (store: Store): Promise<boolean> => {
      const newStatus = getToggledStatus(store)
      try {
        // Optimistic UI update
        setStores((prev) =>
          prev.map((s) => (s.id === store.id ? { ...s, status: newStatus } : s))
        )
        const result = await ipc.stores.update(store.id, { ...store, status: newStatus })
        if (result?.success !== false) {
          toast.success(
            `${store.name} ${newStatus === 'active' ? t('activated') || 'activated' : t('deactivated') || 'deactivated'}`
          )
          return true
        }
        await loadStores() // Revert
        return false
      } catch (error: any) {
        logger.error('Failed to toggle store status:', error)
        toast.error(t('failedToToggleStatus') || 'Status toggle failed')
        await loadStores()
        return false
      }
    },
    [loadStores, t, toast]
  )

  // Filtered & Sorted Records
  const filteredStores = useMemo(() => {
    const term = filters.search.toLowerCase().trim()

    return stores
      .filter((store) => {
        const matchesSearch =
          !term ||
          store.name?.toLowerCase().includes(term) ||
          store.location?.toLowerCase().includes(term) ||
          store.manager?.toLowerCase().includes(term) ||
          store.phone?.includes(term)

        const matchesStatus =
          filters.status === 'all'
            ? true
            : filters.status === 'active'
            ? isStoreActive(store)
            : !isStoreActive(store)

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const fieldA = (a[filters.sortBy] || '').toString().toLowerCase()
        const fieldB = (b[filters.sortBy] || '').toString().toLowerCase()
        if (filters.sortDirection === 'asc') {
          return fieldA.localeCompare(fieldB)
        }
        return fieldB.localeCompare(fieldA)
      })
  }, [stores, filters])

  // Executive Metrics
  const metrics: StoreMetrics = useMemo(() => {
    const activeCount = stores.filter(isStoreActive).length
    const managers = new Set(stores.map((s) => s.manager?.trim()).filter(Boolean))
    return {
      totalStores: stores.length,
      activeStores: activeCount,
      inactiveStores: stores.length - activeCount,
      totalManagers: managers.size
    }
  }, [stores])

  return {
    stores: filteredStores,
    rawStores: stores,
    loading,
    metrics,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    loadStores,
    createStore,
    updateStore,
    deleteStore,
    toggleStatus
  }
}