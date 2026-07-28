import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Category, CategoryForm } from '../types'

export function useCategories() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cats = await window.api.coffee.categories.getAll()
      setCategories(cats ?? [])
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const createCategory = useCallback(
    async (form: CategoryForm) => {
      if (!form.name?.trim()) {
        toast.error('Category name required')
        return false
      }
      try {
        await window.api.coffee.categories.create({
          name: form.name.trim(),
          color: form.color,
          icon: form.icon || undefined,
          description: form.description || undefined
        })
        await load()
        toast.success('Category created')
        return true
      } catch (err: any) {
        toast.error(err?.message ?? 'Save failed')
        return false
      }
    },
    [toast, load]
  )

  const updateCategory = useCallback(
    async (id: string, form: CategoryForm) => {
      if (!form.name?.trim()) {
        toast.error('Category name required')
        return false
      }
      try {
        await window.api.coffee.categories.update({
          id,
          name: form.name.trim(),
          color: form.color,
          icon: form.icon || undefined,
          description: form.description || undefined
        })
        await load()
        toast.success('Category updated')
        return true
      } catch (err: any) {
        toast.error(err?.message ?? 'Update failed')
        return false
      }
    },
    [toast, load]
  )

  const deleteCategory = useCallback(
    async (category: Category) => {
      if (!confirm(`Delete category "${category.name}"?`)) return false
      try {
        await window.api.coffee.categories.delete(category.id)
        await load()
        toast.success('Category deleted')
        return true
      } catch (err: any) {
        toast.error(err?.message ?? 'Cannot delete — may have products attached')
        return false
      }
    },
    [toast, load]
  )

  return {
    categories,
    loading,
    load,
    createCategory,
    updateCategory,
    deleteCategory
  }
}
