import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { IngredientData, IngredientFormData, AdjustStockFormData } from '../types'

/**
 * Background refetches are coalesced: selling one dish touches every ingredient
 * on the recipe, and each of those writes broadcasts its own event.
 */
const REFRESH_DEBOUNCE_MS = 350

export function useInventory() {
  const [ingredients, setIngredients] = useState<IngredientData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadIngredients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await window.api.restaurant.getIngredients()
      setIngredients(data || [])
      setError('')
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Failed to load pantry ingredients')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIngredients()
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [loadIngredients])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      void loadIngredients(true)
    }, REFRESH_DEBOUNCE_MS)
  }, [loadIngredients])

  // Stock moves from POS sales, waste logging, restocking and audit counts —
  // all of which happen on other screens, so the pantry must follow the bus.
  useEffect(() => {
    const offInventory = window.api.restaurant.onEvent('inventory:updated', scheduleRefresh)
    const offLowStock = window.api.restaurant.onEvent('inventory:low_stock', scheduleRefresh)
    const offWasteLogged = window.api.restaurant.onEvent('waste:logged', scheduleRefresh)
    const offWasteDeleted = window.api.restaurant.onEvent('waste:deleted', scheduleRefresh)
    const offMenu = window.api.restaurant.onEvent('menu:updated', scheduleRefresh)

    return () => {
      offInventory()
      offLowStock()
      offWasteLogged()
      offWasteDeleted()
      offMenu()
    }
  }, [scheduleRefresh])

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

  const saveIngredient = useCallback(
    async (data: IngredientFormData, editingId?: string): Promise<boolean> => {
      setActionError('')
      try {
        if (editingId) {
          const before = ingredients.find((i) => i.id === editingId)
          const nextStock = Number(data.currentStock)
          const unitChanged = Boolean(before && before.unit !== data.unit)

          await window.api.restaurant.updateIngredient({
            id: editingId,
            name: data.name,
            category: data.category,
            unit: data.unit,
            minStockAlert: Number(data.minStockAlert),
            costPerUnit: Number(data.costPerUnit),
            ...(data.supplierName ? { supplierName: data.supplierName } : {}),
            ...(data.notes ? { notes: data.notes } : {})
          })

          // Stock only ever moves through adjustStock so every change leaves a
          // movement row behind. Writing currentStock directly from this form
          // would silently overwrite the on-hand count with no audit record.
          //
          // A unit change is excluded on purpose: updateIngredient already
          // restates the stored quantity into the new unit, so the form value is
          // no longer comparable with what we read before the save.
          if (
            !unitChanged &&
            before &&
            Number.isFinite(nextStock) &&
            nextStock !== before.currentStock
          ) {
            await window.api.restaurant.adjustStock({
              ingredientId: editingId,
              type: 'manual_adjustment',
              quantity: nextStock,
              notes: 'Corrected from the ingredient editor'
            })
          }
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
        await loadIngredients(true)
        return true
      } catch (err: any) {
        setActionError(err?.message || 'Failed to save ingredient')
        return false
      }
    },
    [ingredients, loadIngredients]
  )

  const adjustStock = useCallback(
    async (data: AdjustStockFormData): Promise<boolean> => {
      setActionError('')
      try {
        await window.api.restaurant.adjustStock({
          ingredientId: data.ingredientId,
          type: data.type,
          quantity: Number(data.quantity),
          unitCost: data.unitCost ? Number(data.unitCost) : undefined,
          notes: data.notes || undefined
        })
        await loadIngredients(true)
        return true
      } catch (err: any) {
        setActionError(err?.message || 'Failed to adjust stock')
        return false
      }
    },
    [loadIngredients]
  )

  /**
   * Deletion is irreversible from this screen, so the caller confirms first and
   * we only report back. The handler refuses while a recipe still uses the
   * ingredient, and its message is what the user needs to see.
   */
  const deleteIngredient = useCallback(
    async (id: string): Promise<boolean> => {
      setActionError('')
      try {
        await window.api.restaurant.deleteIngredient(id)
        await loadIngredients(true)
        return true
      } catch (err: any) {
        setActionError(err?.message || 'Failed to delete ingredient')
        return false
      }
    },
    [loadIngredients]
  )

  return {
    ingredients: filtered,
    allIngredients: ingredients,
    categories,
    loading,
    error,
    actionError,
    clearActionError: () => setActionError(''),
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
