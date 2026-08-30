import { useState, useCallback } from 'react'
import type { Store, StoreFormData } from '../types'
import { DEFAULT_STORE_FORM } from '../constants'

export function useStoreForm() {
  const [formData, setFormData] = useState<StoreFormData>(DEFAULT_STORE_FORM)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_STORE_FORM)
    setSelectedStore(null)
  }, [])

  const openCreateModal = useCallback(() => {
    resetForm()
    setIsEditMode(false)
    setIsModalOpen(true)
  }, [resetForm])

  const openEditModal = useCallback((store: Store) => {
    setSelectedStore(store)
    setIsEditMode(true)
    setFormData({
      name: store.name || '',
      location: store.location || '',
      phone: store.phone || '',
      hours: store.hours || '09:00 AM - 10:00 PM',
      manager: store.manager || '',
      status: (store.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active')
    })
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
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
    isModalOpen,
    isEditMode,
    openCreateModal,
    openEditModal,
    closeModal,
    updateField
  }
}