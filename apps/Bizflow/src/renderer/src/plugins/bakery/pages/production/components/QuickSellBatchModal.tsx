import React, { useState } from 'react'
import { ShoppingBag, X, CheckCircle2, Loader2 } from 'lucide-react'
import { ProductionBatch } from '../types'
import { formatCurrency, formatDate, getTodayDateString } from '../utils'

interface Props {
  batch: ProductionBatch | null
  onClose: () => void
  onSell: (payload: {
    batchId: string
    recipeId: string
    itemName: string
    quantity: number
    unitPrice: number
    saleDate: string
    notes?: string
  }) => Promise<void>
}

export const QuickSellBatchModal: React.FC<Props> = ({ batch, onClose, onSell }) => {

  const [sellQty, setSellQty] = useState(1)
  const [sellPrice, setSellPrice] = useState(
    batch?.recipe.sellingPrice ? batch.recipe.sellingPrice.toString() : ''
  )
  const [saleDate, setSaleDate] = useState(getTodayDateString())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!batch) return null

  const maxQty = batch.unitsAvailable ?? 0
  const priceNum = parseFloat(sellPrice) || 0
  const total = sellQty * priceNum
  const isValid = sellQty > 0 && sellQty <= maxQty && priceNum >= 0

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setSubmitting(true)
    try {
      await onSell({
        batchId: batch.id,
        recipeId: batch.recipeId,
        itemName: batch.recipe.name,
        quantity: sellQty,
        unitPrice: priceNum,
        saleDate,
        notes: notes.trim() || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <h3 className="text-sm font-bold">Sell from Batch</h3>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              {batch.recipe.name} · {formatDate(batch.batchDate)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Quantity Stepper */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Quantity (Max {maxQty} {batch.recipe.yieldUnit})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSellQty(q => Math.max(1, q - 1))}
                disabled={sellQty <= 1}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={maxQty}
                value={sellQty}
                onChange={e => setSellQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
                className={`${inputClass} text-center font-bold`}
              />
              <button
                type="button"
                onClick={() => setSellQty(q => Math.min(maxQty, q + 1))}
                disabled={sellQty >= maxQty}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Unit Price */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Unit Price ($)
              </label>
              {batch.recipe.sellingPrice && (
                <button
                  type="button"
                  onClick={() => setSellPrice(batch.recipe.sellingPrice!.toString())}
                  className="text-xs text-emerald-600 hover:underline font-semibold"
                >
                  Preset: ${batch.recipe.sellingPrice.toFixed(2)}
                </button>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          {/* Total Display */}
          {total > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Total</span>
              <span className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                ${formatCurrency(total)}
              </span>
            </div>
          )}

          {/* Date & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={e => setSaleDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Walk-in, wholesale invoice…"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Record Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}