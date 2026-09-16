import { useState, useEffect, useCallback, useRef } from 'react'
import { MenuItemRecipeData, RecipeFormData } from '../types'

/** A price change ripples to every dish built on the ingredient — coalesce. */
const REFRESH_DEBOUNCE_MS = 350

export function useRecipes() {
  const [recipes, setRecipes] = useState<MenuItemRecipeData[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [recList, mList, ingList] = await Promise.all([
        window.api.restaurant.getRecipes(),
        window.api.restaurant.getMenuItems(),
        window.api.restaurant.getIngredients()
      ])
      setRecipes(recList || [])
      setMenuItems(mList || [])
      setIngredients(ingList || [])
      setError('')
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Failed to load recipe bill of materials')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [loadData])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      void loadData(true)
    }, REFRESH_DEBOUNCE_MS)
  }, [loadData])

  // Restocking an ingredient rewrites the stored cost of every dish that uses
  // it, and the menu can be edited from another screen entirely, so the recipe
  // book has to follow the bus to stay in step with the menu it prices.
  useEffect(() => {
    const offMenu = window.api.restaurant.onEvent('menu:updated', scheduleRefresh)
    const offInventory = window.api.restaurant.onEvent('inventory:updated', scheduleRefresh)

    return () => {
      offMenu()
      offInventory()
    }
  }, [scheduleRefresh])

  const saveRecipe = useCallback(
    async (data: RecipeFormData): Promise<boolean> => {
      setActionError('')
      try {
        await window.api.restaurant.saveRecipe(data)
        await loadData(true)
        return true
      } catch (err: any) {
        setActionError(err?.message || 'Failed to save recipe')
        return false
      }
    },
    [loadData]
  )

  const deleteRecipe = useCallback(
    async (recipeId: string): Promise<boolean> => {
      setActionError('')
      try {
        await window.api.restaurant.deleteRecipe(recipeId)
        await loadData(true)
        return true
      } catch (err: any) {
        setActionError(err?.message || 'Failed to delete recipe')
        return false
      }
    },
    [loadData]
  )

  return {
    recipes,
    menuItems,
    ingredients,
    loading,
    error,
    actionError,
    clearActionError: () => setActionError(''),
    refreshRecipes: loadData,
    saveRecipe,
    deleteRecipe
  }
}
