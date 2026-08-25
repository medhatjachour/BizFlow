// src/pages/waste/components/LogWasteModal.tsx
import React, { useState, useMemo } from 'react'
import { X, Trash2, DollarSign } from 'lucide-react'
import { WasteFormData } from '../types'
import { sounds } from '../../utils/sound'

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
  { value: 'customer_returned', label: 'Customer Returned' },
  { value: 'prep_trim', label: 'Excess Prep Trim' }
]

export const LogWasteModal: React.FC<Props> = ({ isOpen, onClose, ingredients, onLog }) => {
  const [form, setForm] = useState<WasteFormData>({
    ingredientId: '',
    itemName: '',
    quantity: '1',
    unit: 'g',
    reason: 'expired',
    loggedBy: 'Line Cook',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Live estimated cost calculation
  const selectedIng = useMemo(
    () => ingredients.find((i) => i.id === form.ingredientId),
    [ingredients, form.ingredientId]
  )

  const estimatedLoss = useMemo(() => {
    if (!selectedIng) return 0
    return (Number(form.quantity) || 0) * (selectedIng.costPerUnit || 0)
  }, [selectedIng, form.quantity])

  if (!isOpen) return null

  const handleSelectIngredient = (id: string) => {
    sounds.playBump()
    const ing = ingredients.find((i) => i.id === id)
    if (ing) {
      setForm((f) => ({
        ...f,
        ingredientId: id,
        itemName: ing.name,
        unit: ing.unit
      }))
    } else {
      setForm((f) => ({ ...f, ingredientId: id }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.itemName || Number(form.quantity) <= 0) {
      sounds.playError()
      return
    }
    setIsSubmitting(true)
    try {
      sounds.playSuccess()
      const ok = await onLog(form)
      if (ok) onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Log Food Waste & Spoilage
              </h3>
              <p className="text-xs text-slate-400">Deducts inventory stock & records loss expense</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Loss Metric Strip */}
        {selectedIng && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span>Direct COGS Shrinkage:</span>
            <span className="text-base font-black flex items-center">
              <DollarSign className="w-4 h-4" />
              {estimatedLoss.toFixed(2)}
            </span>
          </div>
        )}

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Select Linked Inventory Ingredient (Optional)
          </span>
          <select
            value={form.ingredientId || ''}
            onChange={(e) => handleSelectIngredient(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Custom Item / Prepared Dish</option>
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name} ({ing.unit}) — ${ing.costPerUnit.toFixed(2)}/{ing.unit}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Item Name *
            </span>
            <input
              type="text"
              required
              value={form.itemName}
              onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
              placeholder="e.g. Ribeye Cut"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Quantity Wasted *
            </span>
            <div className="flex gap-1.5">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-black focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <span className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-500">
                {form.unit}
              </span>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Waste Reason *
            </span>
            <select
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {WASTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Logged By
            </span>
            <input
              type="text"
              value={form.loggedBy}
              onChange={(e) => setForm((f) => ({ ...f, loggedBy: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Incident Notes
          </span>
          <input
            type="text"
            value={form.notes || ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Fridge temperature rose above 8°C overnight"
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </label>

        <div className="flex gap-2 pt-2">
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
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-rose-500/20 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? 'Recording...' : 'Confirm Waste Log'}
          </button>
        </div>
      </form>
    </div>
  )
}