import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Category } from '../types'

export function useCategories() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.clinic.materialCategories.getAll()
      setCategories(data ?? [])
    } catch {
      showToast('error', t('errorLoadingData') || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const createCategory = async (name: string, color: string) => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await window.api.clinic.materialCategories.create({ name: name.trim(), color })
      showToast('success', t('createdSuccessfully') || 'Category created')
      await loadCategories()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Error creating category')
    } finally {
      setSaving(false)
    }
  }

  const updateCategory = async (id: string, name: string, color: string) => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await window.api.clinic.materialCategories.update(id, { name: name.trim(), color })
      showToast('success', t('updatedSuccessfully') || 'Category updated')
      await loadCategories()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Error updating category')
    } finally {
      setSaving(false)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!window.confirm(t('confirmDelete') || 'Delete category?')) return
    try {
      await window.api.clinic.materialCategories.delete(id)
      showToast('success', t('deletedSuccessfully') || 'Category deleted')
      await loadCategories()
    } catch {
      showToast('error', t('errorDeletingRecord') || 'Error deleting category')
    }
  }

  return {
    categories,
    loading,
    saving,
    createCategory,
    updateCategory,
    deleteCategory,
    reload: loadCategories
  }
}