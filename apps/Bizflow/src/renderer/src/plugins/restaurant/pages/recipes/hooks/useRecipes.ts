import { useState, useEffect, useCallback } from 'react'
import { MenuItemRecipeData, RecipeFormData } from '../types'

export function useRecipes() {
  const [recipes, setRecipes] = useState<MenuItemRecipeData[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [recList, mList, ingList] = await Promise.all([
        window.api.restaurant.getRecipes(),
        window.api.restaurant.getMenuItems(),
        window.api.restaurant.getIngredients()
      ])
      setRecipes(recList || [])
      setMenuItems(mList || [])
      setIngredients(ingList || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load recipe bill of materials')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const saveRecipe = async (data: RecipeFormData) => {
    try {
      await window.api.restaurant.saveRecipe(data)
      loadData()
      return true
    } catch (err: any) {
      alert(err?.message || 'Failed to save recipe')
      return false
    }
  }

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe definition?')) return
    try {
      await window.api.restaurant.deleteRecipe(recipeId)
      loadData()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete recipe')
    }
  }

  return {
    recipes,
    menuItems,
    ingredients,
    loading,
    error,
    refreshRecipes: loadData,
    saveRecipe,
    deleteRecipe
  }
}