import React, { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { WasteFormData } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  ingredients: any[]
  onLog: (data: WasteFormData) => Promise<boolean>
}

const WASTE_REASONS = [
  { value: 'expired', label: 'Expired / Spoiled' },
  { value: 'dropped_spill', label: 'Dropped / Spilled' },
  { value: 'overcooked', label: 'Overcooked / Burnt' },
  { value: 'customer_returned', label: 'Customer Returned / Wrong Order' },
  { value: 'prep_trim', label: 'Excess Prep Trim' }
]

export const LogWasteModal: React.FC<Props> = ({ isOpen, onClose, ingredients, onLog }) => {
  const [form, setForm] = useState<WasteFormData>({
    ingredientId: '',
    itemName: '',
    quantity: '1',
    unit: 'kg',
    reason: 'expired',
    loggedBy: 'Chef / Line Cook',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleIngredientSelect = (id: string) => {
    const found = ingredients.find((i) => i.id === id)
    if (found) {
      setForm((f) => ({
        ...f,
        ingredientId: id,
        itemName: found.name,
        unit: found.unit
      }))
    } else {
      setForm((f) => ({ ...f, ingredientId: id }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onLog(form)
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
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Log Kitchen Waste & Spoilage
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Select Pantry Ingredient (Optional)
          </span>
          <select
            value={form.ingredientId}
            onChange={(e) => handleIngredientSelect(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:outline-none"
          >
            <option value="">Custom Food Item / Unlisted</option>
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name} ({ing.unit})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Item Name *</span>
            <input
              type="text"
              required
              value={form.itemName}
              onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
              placeholder="e.g. Milk 1L or Ribeye Cut"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quantity Wasted *</span>
            <div className="flex gap-1.5 mt-1">
              <input
                type="number"
                step="0.01"
                required
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:outline-none"
              />
              <span className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500">
                {form.unit}
              </span>
            </div>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Waste Reason *</span>
          <select
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:outline-none"
          >
            {WASTE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Logged By</span>
          <input
            type="text"
            value={form.loggedBy}
            onChange={(e) => setForm((f) => ({ ...f, loggedBy: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:outline-none"
          />
        </label>

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
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
          >
            {isSubmitting ? 'Logging...' : 'Confirm Waste Log'}
          </button>
        </div>
      </form>
    </div>
  )
}