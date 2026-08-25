import { useState, useEffect, useCallback, useMemo } from 'react'
import { IngredientData, IngredientFormData, AdjustStockFormData } from '../types'

export function useInventory() {
  const [ingredients, setIngredients] = useState<IngredientData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const loadIngredients = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await window.api.restaurant.getIngredients()
      setIngredients(data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load pantry ingredients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIngredients()
  }, [loadIngredients])

  const categories = useMemo(() => {
    const set = new Set(ingredients.map((i) => i.category).filter(Boolean))
    return Array.from(set)
  }, [ingredients])

  const filtered = useMemo(() => {
    return ingredients.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory
      const matchLow = !showLowStockOnly || item.currentStock <= item.minStockAlert
      const query = searchQuery.trim().toLowerCase()
      const matchSearch =
        query === '' ||
        item.name.toLowerCase().includes(query) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(query))

      return matchCat && matchLow && matchSearch
    })
  }, [ingredients, selectedCategory, showLowStockOnly, searchQuery])

  const stats = useMemo(() => {
    const total = ingredients.length
    const lowStock = ingredients.filter((i) => i.currentStock <= i.minStockAlert).length
    const totalValuation = ingredients.reduce((acc, i) => acc + i.currentStock * i.costPerUnit, 0)

    return { total, lowStock, totalValuation }
  }, [ingredients])

  const saveIngredient = async (data: IngredientFormData, editingId?: string) => {
    try {
      if (editingId) {
        await window.api.restaurant.updateIngredient({
          id: editingId,
          name: data.name,
          category: data.category,
          unit: data.unit,
          currentStock: Number(data.currentStock),
          minStockAlert: Number(data.minStockAlert),
          costPerUnit: Number(data.costPerUnit),
          ...(data.supplierName ? { supplierName: data.supplierName } : {}),
          ...(data.notes ? { notes: data.notes } : {})
        })
      } else {
        await window.api.restaurant.createIngredient({
          name: data.name,
          category: data.category,
          unit: data.unit,
          currentStock: Number(data.currentStock),
          minStockAlert: Number(data.minStockAlert),
          costPerUnit: Number(data.costPerUnit),
          supplierName: data.supplierName || undefined,
          notes: data.notes || undefined
        })
      }
      loadIngredients()
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to save ingredient')
      return false
    }
  }

  const adjustStock = async (data: AdjustStockFormData) => {
    try {
      await window.api.restaurant.adjustStock({
        ingredientId: data.ingredientId,
        type: data.type,
        quantity: Number(data.quantity),
        unitCost: data.unitCost ? Number(data.unitCost) : undefined,
        notes: data.notes || undefined
      })
      loadIngredients()
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to adjust stock')
      return false
    }
  }

  const deleteIngredient = async (id: string) => {
    if (!confirm('Are you sure you want to remove this ingredient from the pantry?')) return
    try {
      await window.api.restaurant.deleteIngredient(id)
      loadIngredients()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete ingredient')
    }
  }

  return {
    ingredients: filtered,
    allIngredients: ingredients,
    categories,
    loading,
    error,
    stats,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    showLowStockOnly,
    setShowLowStockOnly,
    refreshInventory: loadIngredients,
    saveIngredient,
    adjustStock,
    deleteIngredient
  }
}