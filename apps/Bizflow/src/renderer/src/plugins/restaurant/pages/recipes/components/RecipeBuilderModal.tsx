// src/pages/recipes/components/RecipeBuilderModal.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Percent } from 'lucide-react'
import { MenuItemRecipeData, RecipeFormData } from '../types'
import { sounds } from '../../utils/sound'

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

  // Live Food Cost Calculation
  const selectedItem = useMemo(() => menuItems.find((m) => m.id === menuItemId), [menuItems, menuItemId])

  const calculatedCost = useMemo(() => {
    const totalBatch = ingredients.reduce((sum, item) => {
      const ing = ingredientsList.find((i) => i.id === item.ingredientId)
      const costPerUnit = ing?.costPerUnit || 0
      return sum + (Number(item.quantity) || 0) * costPerUnit
    }, 0)
    return totalBatch / Math.max(1, yieldCount)
  }, [ingredients, ingredientsList, yieldCount])

  const foodCostPercent = useMemo(() => {
    if (!selectedItem?.price || selectedItem.price <= 0) return 0
    return Math.round((calculatedCost / selectedItem.price) * 100)
  }, [selectedItem, calculatedCost])

  if (!isOpen) return null

  const handleAddIngredientRow = () => {
    sounds.playBump()
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

      if (field === 'ingredientId') {
        const found = ingredientsList.find((i) => i.id === value)
        if (found) copy[idx].unit = found.unit
      }
      return copy
    })
  }

  const handleRemoveRow = (idx: number) => {
    sounds.playBump()
    setIngredients((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!menuItemId || !ingredients.length) {
      sounds.playError()
      alert('Please select a target menu dish and add at least one ingredient.')
      return
    }
    setIsSubmitting(true)
    try {
      sounds.playSuccess()
      const ok = await onSave({
        menuItemId,
        yieldCount,
        prepNotes,
        ingredients
      })
      if (ok) onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Recipe Bill of Materials (BOM)
            </h3>
            <p className="text-xs text-slate-400">Map ingredients for automated stock depletion</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Dish & Yield */}
        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-2 block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Target Menu Item *
            </span>
            <select
              required
              disabled={Boolean(editingRecipe)}
              value={menuItemId}
              onChange={(e) => setMenuItemId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Portion Yield
            </span>
            <input
              type="number"
              min="1"
              required
              value={yieldCount}
              onChange={(e) => setYieldCount(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Live Food Cost Telemetry Strip */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Selling Price</span>
            <span className="font-black text-slate-900 dark:text-white">
              ${selectedItem?.price?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Calculated Cost</span>
            <span className="font-black text-emerald-600">
              ${calculatedCost.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Food Cost %</span>
            <span
              className={`font-black flex items-center justify-center gap-0.5 ${
                foodCostPercent <= 30
                  ? 'text-emerald-600'
                  : foodCostPercent <= 40
                    ? 'text-amber-600'
                    : 'text-rose-600'
              }`}
            >
              <Percent className="w-3 h-3" />
              {foodCostPercent}%
            </span>
          </div>
        </div>

        {/* Ingredients Matrix */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Required Raw Materials
            </span>
            <button
              type="button"
              onClick={handleAddIngredientRow}
              className="text-[11px] font-black text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Ingredient
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {ingredients.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
              >
                <select
                  value={row.ingredientId}
                  onChange={(e) => handleUpdateRow(idx, 'ingredientId', e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 text-xs font-bold focus:outline-none"
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
                    step="1"
                    min="1"
                    required
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => handleUpdateRow(idx, 'quantity', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 text-xs font-black focus:outline-none"
                  />
                </div>

                <span className="text-xs text-slate-400 font-bold w-8 truncate">{row.unit}</span>

                <button
                  type="button"
                  onClick={() => handleRemoveRow(idx)}
                  className="text-slate-400 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black shadow-md shadow-orange-500/20 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? 'Calculating...' : 'Save & Link Recipe'}
          </button>
        </div>
      </form>
    </div>
  )
}