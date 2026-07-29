import { useState, useCallback } from 'react'
import type { Store, StoreFormData } from '../types'
import { DEFAULT_STORE_FORM } from '../constants'

export function useStoreForm() {
  const [formData, setFormData] = useState<StoreFormData>(DEFAULT_STORE_FORM)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_STORE_FORM)
  }, [])

  const openAddModal = useCallback(() => {
    resetForm()
    setShowAddModal(true)
  }, [resetForm])

  const closeAddModal = useCallback(() => {
    setShowAddModal(false)
  }, [])

  const openEditModal = useCallback((store: Store) => {
    setSelectedStore(store)
    setFormData({
      name: store.name,
      location: store.location,
      phone: store.phone,
      hours: store.hours,
      manager: store.manager,
      status: store.status,
    })
    setShowEditModal(true)
  }, [])

  const closeEditModal = useCallback(() => {
    setShowEditModal(false)
    setSelectedStore(null)
    resetForm()
  }, [resetForm])

  const updateField = useCallback(
    <K extends keyof StoreFormData>(field: K, value: StoreFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  return {
    formData,
    setFormData,
    selectedStore,
    showAddModal,
    showEditModal,
    resetForm,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    updateField,
  }
}