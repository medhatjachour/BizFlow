import { useState, useCallback, useEffect } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Store, StoreFormData } from '../types'
import { getToggledStatus } from '../utils'
import logger from '@/shared/utils/logger'

export function useStores() {
  const { t } = useLanguage()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)

  const loadStores = useCallback(async () => {
    try {
      setLoading(true)
      const data = await ipc.stores.getAll()
      setStores(data)
    } catch (error) {
      logger.error('Failed to load stores:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStores()
  }, [loadStores])

  const updateStore = useCallback(
    async (id: string, data: Partial<StoreFormData> | Store) => {
      try {
        const result = await ipc.stores.update(id, data)
        if (result.success) {
          await loadStores()
          return true
        }
        return false
      } catch (error) {
        logger.error('Failed to update store:', error)
        return false
      }
    },
    [loadStores]
  )

  const deleteStore = useCallback(
    async (id: string) => {
      if (!confirm(t('confirmDeleteStore'))) return false

      try {
        const result = await ipc.stores.delete(id)
        if (result.success) {
          await loadStores()
          return true
        }
        return false
      } catch (error) {
        logger.error('Failed to delete store:', error)
        alert(t('failedToDeleteStore'))
        return false
      }
    },
    [loadStores, t]
  )

  const toggleStatus = useCallback(
    async (store: Store) => {
      const newStatus = getToggledStatus(store)
      try {
        const result = await ipc.stores.update(store.id, { ...store, status: newStatus })
        if (result.success) {
          await loadStores()
          return true
        }
        return false
      } catch (error) {
        logger.error('Failed to toggle store status:', error)
        alert(t('failedToToggleStatus'))
        return false
      }
    },
    [loadStores, t]
  )

  return {
    stores,
    loading,
    loadStores,
    updateStore,
    deleteStore,
    toggleStatus,
  }
}