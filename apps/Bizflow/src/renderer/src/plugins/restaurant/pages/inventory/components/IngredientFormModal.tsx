import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { IngredientData, IngredientFormData } from '../types'
import { INGREDIENT_CATEGORIES, UNIT_OPTIONS } from '../constants'

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
  }, [editingIngredient, isOpen])

  if (!isOpen) return null

  const allCategories = Array.from(new Set([...INGREDIENT_CATEGORIES, ...existingCategories]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onSave(form, editingIngredient?.id)
    setIsSubmitting(false)
    if (ok) onClose()
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
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ingredient Name *</span>
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

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit *</span>
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
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
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock Qty *</span>
            <input
              type="number"
              step="0.01"
              required
              value={form.currentStock}
              onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cost/Unit ($)</span>
            <input
              type="number"
              step="0.01"
              value={form.costPerUnit}
              onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Low Stock Alert</span>
            <input
              type="number"
              step="0.01"
              value={form.minStockAlert}
              onChange={(e) => setForm((f) => ({ ...f, minStockAlert: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Supplier Name</span>
            <input
              type="text"
              placeholder="e.g. Metro Meats Co."
              value={form.supplierName}
              onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
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
            {isSubmitting ? 'Saving...' : 'Save Ingredient'}
          </button>
        </div>
      </form>
    </div>
  )
}