import React, { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle, Info } from 'lucide-react'
import { IngredientData, IngredientFormData } from '../types'
import { INGREDIENT_CATEGORIES, UNIT_OPTIONS } from '../constants'
import { convertBetweenUnits, sameUnitFamily } from '@/shared/restaurantUnits'

interface Props {
  isOpen: boolean
  onClose: () => void
  editingIngredient: IngredientData | null
  existingCategories: string[]
  onSave: (data: IngredientFormData, editingId?: string) => Promise<boolean>
}

export const IngredientFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editingIngredient,
  existingCategories,
  onSave
}) => {
  const [form, setForm] = useState<IngredientFormData>({
    name: '',
    category: 'Fresh Produce',
    unit: 'kg',
    currentStock: '0',
    minStockAlert: '5',
    costPerUnit: '0',
    supplierName: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (editingIngredient) {
      setForm({
        name: editingIngredient.name,
        category: editingIngredient.category,
        unit: editingIngredient.unit,
        currentStock: String(editingIngredient.currentStock),
        minStockAlert: String(editingIngredient.minStockAlert),
        costPerUnit: String(editingIngredient.costPerUnit),
        supplierName: editingIngredient.supplierName || '',
        notes: editingIngredient.notes || ''
      })
    } else {
      setForm({
        name: '',
        category: existingCategories[0] || 'Fresh Produce',
        unit: 'kg',
        currentStock: '0',
        minStockAlert: '5',
        costPerUnit: '0',
        supplierName: '',
        notes: ''
      })
    }
    setFormError('')
  }, [editingIngredient, isOpen])

  const isEditing = Boolean(editingIngredient)
  const originalUnit = editingIngredient?.unit ?? 'kg'
  const unitChanged = isEditing && form.unit !== originalUnit
  const familiesDiffer = unitChanged && !sameUnitFamily(form.unit, originalUnit)

  const usedBy = editingIngredient?.recipeUsages ?? []

  // The alert threshold is stored in the ingredient's own unit, so re-labelling
  // the unit has to carry the number across or 5 kg silently becomes 5 g.
  const restatedAlert = useMemo(() => {
    if (!unitChanged || familiesDiffer) return null
    const current = Number(form.minStockAlert)
    if (!Number.isFinite(current)) return null
    return String(convertBetweenUnits(current, originalUnit, form.unit))
  }, [unitChanged, familiesDiffer, form.minStockAlert, form.unit, originalUnit])

  const handleUnitChange = (nextUnit: string) => {
    setForm((f) => {
      if (!isEditing || nextUnit === originalUnit) return { ...f, unit: nextUnit }
      if (!sameUnitFamily(nextUnit, originalUnit)) return { ...f, unit: nextUnit }
      const current = Number(f.minStockAlert)
      return {
        ...f,
        unit: nextUnit,
        minStockAlert: Number.isFinite(current)
          ? String(convertBetweenUnits(current, originalUnit, nextUnit))
          : f.minStockAlert
      }
    })
  }

  if (!isOpen) return null

  const allCategories = Array.from(new Set([...INGREDIENT_CATEGORIES, ...existingCategories]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (familiesDiffer) {
      setFormError(
        `${originalUnit} and ${form.unit} measure different things — pick a unit in the same ` +
          `family (kg/g, L/ml, or pieces).`
      )
      return
    }
    setIsSubmitting(true)
    const ok = await onSave(form, editingIngredient?.id)
    setIsSubmitting(false)
    if (ok) onClose()
    else setFormError('The ingredient could not be saved. Please try again.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {editingIngredient ? 'Edit Ingredient' : 'New Pantry Raw Material'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Ingredient Name *
            </span>
            <input
              type="text"
              required
              placeholder="e.g. Ground Beef 80/20"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Category *</span>
            <input
              type="text"
              list="ing-categories"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <datalist id="ing-categories">
              {allCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit *</span>
            <select
              value={form.unit}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Stock on hand ({form.unit}) {isEditing ? '' : '*'}
            </span>
            <input
              type="number"
              step="0.01"
              required={!isEditing}
              disabled={isEditing}
              value={form.currentStock}
              onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {isEditing && (
              <span className="mt-1 block text-[10px] text-slate-400 leading-tight">
                Stock only moves through <strong>Adjust Stock</strong> so every change keeps an
                audit trail.
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Cost per {form.unit} ($)
            </span>
            <input
              type="number"
              step="0.01"
              value={form.costPerUnit}
              onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {familiesDiffer && (
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {originalUnit} and {form.unit} measure different things. Switch within the same family
            (kg/g, L/ml, or pieces) or create a separate ingredient.
          </p>
        )}

        {unitChanged && restatedAlert !== null && !familiesDiffer && (
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
            The same physical quantity becomes {restatedAlert} {form.unit} for stock and the low
            stock alert.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Low Stock Alert ({form.unit})
            </span>
            <input
              type="number"
              step="0.01"
              value={form.minStockAlert}
              onChange={(e) => setForm((f) => ({ ...f, minStockAlert: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Supplier Name
            </span>
            <input
              type="text"
              placeholder="e.g. Metro Meats Co."
              value={form.supplierName}
              onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {isEditing && usedBy.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3 space-y-1.5">
            <p className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              Used by {usedBy.length} recipe{usedBy.length === 1 ? '' : 's'}
            </p>
            <ul className="space-y-1">
              {usedBy.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400"
                >
                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                    {u.recipe?.menuItem?.name || 'Unnamed dish'}
                  </span>
                  <span className="tabular-nums shrink-0">
                    {u.quantity} {u.unit}
                    {u.recipe?.yieldCount ? ` · yield ${u.recipe.yieldCount}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-400 leading-tight">
              Changing the cost or the unit re-prices every one of these dishes.
            </p>
          </div>
        )}

        {formError && (
          <div className="flex items-start gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>{formError}</span>
          </div>
        )}

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
            {isSubmitting ? 'Saving...' : 'Save Ingredient'}
          </button>
        </div>
      </form>
    </div>
  )
}
