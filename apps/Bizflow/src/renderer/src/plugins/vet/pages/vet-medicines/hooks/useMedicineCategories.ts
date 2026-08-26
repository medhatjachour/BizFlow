import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import type { CategoryItem } from '../types'

export function useMedicineCategories() {
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await (window as any).api?.vet?.medicineCategories?.getAll()
      setCategories(res ?? [])
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    loading,
    refreshCategories: fetchCategories
  }
}