import React, { useState } from 'react'
import { X, Plus, RotateCcw } from 'lucide-react'
import { IngredientData, AdjustStockFormData } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  ingredient: IngredientData | null
  onAdjust: (data: AdjustStockFormData) => Promise<boolean>
}

export const AdjustStockModal: React.FC<Props> = ({ isOpen, onClose, ingredient, onAdjust }) => {
  const [type, setType] = useState<'restock' | 'manual_adjustment'>('restock')
  const [quantity, setQuantity] = useState('10')
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !ingredient) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onAdjust({
      ingredientId: ingredient.id,
      type,
      quantity,
      unitCost: unitCost || undefined,
      notes
    })
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Adjust Pantry Stock</h3>
            <p className="text-xs text-slate-400">{ingredient.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('restock')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'restock'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Restock (+)
          </button>
          <button
            type="button"
            onClick={() => setType('manual_adjustment')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              type === 'manual_adjustment'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Set Audit Count
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {type === 'restock' ? `Quantity to Add (${ingredient.unit}) *` : `Delta Adjustment (+/- ${ingredient.unit}) *`}
          </span>
          <input
            type="number"
            step="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </label>

        {type === 'restock' && (
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              New Purchase Unit Cost ($)
            </span>
            <input
              type="number"
              step="0.01"
              placeholder={String(ingredient.costPerUnit)}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        )}

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes / PO Reference</span>
          <input
            type="text"
            placeholder="e.g. Received weekly delivery invoice #4092"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20"
          >
            {isSubmitting ? 'Adjusting...' : 'Confirm Stock'}
          </button>
        </div>
      </form>
    </div>
  )
}