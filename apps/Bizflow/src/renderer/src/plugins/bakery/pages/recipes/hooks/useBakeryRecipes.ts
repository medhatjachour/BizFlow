import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { Recipe, RecipeFormData } from '../types'
import { calculateCostPerUnit, calculateMargin } from '../utils'

export function useBakeryRecipes() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [scalingRecipe, setScalingRecipe] = useState<Recipe | null>(null)
  const [cardRecipe, setCardRecipe] = useState<Recipe | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.bakery.getRecipes()
      setRecipes(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast('error', err?.message || (t('bakeryLoadFailed') || 'Failed to load recipes'))
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  // KPIs
  const summaryKpis = useMemo(() => {
    let totalUnitCost = 0
    let totalMargin = 0
    let marginCount = 0

    recipes.forEach(r => {
      const uCost = calculateCostPerUnit(r)
      totalUnitCost += uCost
      const price = r.sellingPrice ?? r.outputProduct?.basePrice ?? null
      const margin = calculateMargin(price, uCost)
      if (margin !== null) {
        totalMargin += margin
        marginCount++
      }
    })

    return {
      totalRecipes: recipes.length,
      avgUnitCost: recipes.length > 0 ? totalUnitCost / recipes.length : 0,
      avgMargin: marginCount > 0 ? totalMargin / marginCount : null,
      linkedProductsCount: recipes.filter(r => r.outputProduct).length,
    }
  }, [recipes])

  // Search filtered recipes
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes
    const q = searchQuery.toLowerCase().trim()
    return recipes.filter(
      r =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        r.ingredients.some(ing => ing.name.toLowerCase().includes(q))
    )
  }, [recipes, searchQuery])

  // Actions
  const handleSaveRecipe = async (formData: RecipeFormData) => {
    const payload = {
      ...formData,
      yieldQty: Number(formData.yieldQty),
      sellingPrice: formData.sellingPrice !== '' ? Number(formData.sellingPrice) : undefined,
      expiryDays: formData.expiryDays !== '' ? Number(formData.expiryDays) : undefined,
      ingredients: formData.ingredients.map(i => ({
        ...i,
        quantity: Number(i.quantity),
        costPerUnit: Number(i.costPerUnit),
      })),
    }

    if (formData.id) {
      await window.api.bakery.updateRecipe(payload)
      showToast('success', t('bakeryRecipeUpdated') || 'Recipe formula updated')
    } else {
      await window.api.bakery.createRecipe(payload)
      showToast('success', t('bakeryRecipeCreated') || 'New recipe created')
    }

    setFormModalOpen(false)
    setEditingRecipe(null)
    loadData()
  }

  const handleDeleteRecipe = async (id: string) => {
    try {
      await window.api.bakery.deleteRecipe(id)
      showToast('success', t('bakeryRecipeDeleted') || 'Recipe archived')
      setDeletingId(null)
      loadData()
    } catch (err: any) {
      showToast('error', err?.message || (t('bakeryRecipeDeleteFailed') || 'Failed to delete recipe'))
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return {
    recipes: filteredRecipes,
    rawRecipes: recipes,
    loading,
    summaryKpis,
    searchQuery,
    setSearchQuery,
    expandedId,
    toggleExpand,
    // Modals
    formModalOpen,
    setFormModalOpen,
    editingRecipe,
    openCreate: () => {
      setEditingRecipe(null)
      setFormModalOpen(true)
    },
    openEdit: (recipe: Recipe) => {
      setEditingRecipe(recipe)
      setFormModalOpen(true)
    },
    scalingRecipe,
    setScalingRecipe,
    cardRecipe,
    setCardRecipe,
    deletingId,
    setDeletingId,
    // Handlers
    handleSaveRecipe,
    handleDeleteRecipe,
    refresh: loadData,
  }
}