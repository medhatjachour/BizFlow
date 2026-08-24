import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { MenuItemRecipeData, RecipeFormData } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  editingRecipe: MenuItemRecipeData | null
  menuItems: any[]
  ingredientsList: any[]
  onSave: (data: RecipeFormData) => Promise<boolean>
}

export const RecipeBuilderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editingRecipe,
  menuItems,
  ingredientsList,
  onSave
}) => {
  const [menuItemId, setMenuItemId] = useState('')
  const [yieldCount, setYieldCount] = useState(1)
  const [prepNotes, setPrepNotes] = useState('')
  const [ingredients, setIngredients] = useState<
    Array<{ ingredientId: string; quantity: number; unit: string; notes?: string }>
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingRecipe) {
      setMenuItemId(editingRecipe.menuItemId)
      setYieldCount(editingRecipe.yieldCount || 1)
      setPrepNotes(editingRecipe.prepNotes || '')
      setIngredients(
        editingRecipe.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
          notes: i.notes || ''
        }))
      )
    } else {
      setMenuItemId(menuItems[0]?.id || '')
      setYieldCount(1)
      setPrepNotes('')
      setIngredients([])
    }
  }, [editingRecipe, isOpen, menuItems])

  if (!isOpen) return null

  const handleAddIngredientRow = () => {
    if (!ingredientsList.length) return
    const first = ingredientsList[0]
    setIngredients((prev) => [
      ...prev,
      { ingredientId: first.id, quantity: 1, unit: first.unit, notes: '' }
    ])
  }

  const handleUpdateRow = (idx: number, field: string, value: any) => {
    setIngredients((prev) => {
      const copy = [...prev]
      ;(copy[idx] as any)[field] = field === 'quantity' ? Number(value) : value

      // If ingredient changed, auto-update matching unit
      if (field === 'ingredientId') {
        const found = ingredientsList.find((i) => i.id === value)
        if (found) copy[idx].unit = found.unit
      }
      return copy
    })
  }

  const handleRemoveRow = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!menuItemId || !ingredients.length) {
      alert('Please select a menu dish and at least one raw ingredient')
      return
    }
    setIsSubmitting(true)
    const ok = await onSave({
      menuItemId,
      yieldCount,
      prepNotes,
      ingredients
    })
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Recipe & Bill of Materials Builder
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-2 block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Menu Dish *</span>
            <select
              required
              disabled={Boolean(editingRecipe)}
              value={menuItemId}
              onChange={(e) => setMenuItemId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">Select menu dish...</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (${m.price.toFixed(2)})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Portions Yield</span>
            <input
              type="number"
              min="1"
              required
              value={yieldCount}
              onChange={(e) => setYieldCount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Ingredients Matrix */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Required Ingredients
            </span>
            <button
              type="button"
              onClick={handleAddIngredientRow}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Ingredient
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {ingredients.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700">
                <select
                  value={row.ingredientId}
                  onChange={(e) => handleUpdateRow(idx, 'ingredientId', e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 text-xs font-semibold focus:outline-none"
                >
                  {ingredientsList.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>

                <div className="w-24">
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    required
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => handleUpdateRow(idx, 'quantity', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 text-xs font-bold focus:outline-none"
                  />
                </div>

                <span className="text-xs text-slate-400 font-bold w-10 truncate">{row.unit}</span>

                <button
                  type="button"
                  onClick={() => handleRemoveRow(idx)}
                  className="text-slate-400 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20"
          >
            {isSubmitting ? 'Calculating...' : 'Save & Link Recipe'}
          </button>
        </div>
      </form>
    </div>
  )
}