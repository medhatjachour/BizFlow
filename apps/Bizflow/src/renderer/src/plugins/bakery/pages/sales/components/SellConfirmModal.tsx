import React, { useState } from 'react'
import { X, Package, Tag, Calendar, ShoppingBag, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { QTY_QUICK_PRESETS } from '../constants'
import { RecipeGroup } from '../types'
import { formatCurrency, formatDate, daysUntil, getTodayDateString } from '../utils'

interface Props {
  group: RecipeGroup
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

export const SellConfirmModal: React.FC<Props> = ({ group, onClose, onSell }) => {
  const { t } = useLanguage()

  const [selectedBatchId, setSelectedBatchId] = useState(group.batches[0]?.id ?? '')
  const [saleQty, setSaleQty] = useState(1)
  const [priceInput, setPriceInput] = useState(
    group.recipe.sellingPrice ? group.recipe.sellingPrice.toString() : ''
  )
  const [saleDate, setSaleDate] = useState(getTodayDateString())
  const [saleNotes, setSaleNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBatch = group.batches.find(b => b.id === selectedBatchId) ?? group.batches[0]
  const maxQty = selectedBatch?.unitsAvailable ?? 0
  const isOverstock = saleQty > maxQty

  const effectivePrice = priceInput !== '' ? parseFloat(priceInput) : group.recipe.sellingPrice ?? 0
  const saleTotal = saleQty * (isNaN(effectivePrice) ? 0 : effectivePrice)
  const isValid = saleQty > 0 && !isOverstock && effectivePrice >= 0 && selectedBatch != null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || !selectedBatch) return

    setSubmitting(true)
    setError(null)
    try {
      await onSell({
        recipeId: group.recipe.id,
        batchId: selectedBatch.id,
        itemName: group.recipe.name,
        quantity: saleQty,
        unitPrice: effectivePrice,
        saleDate,
        notes: saleNotes.trim() || undefined,
      })
    } catch (err: any) {
      setError(err?.message || (t('bakerySaleRecordFailed') || 'Failed to record transaction'))
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[240px]">
                {group.recipe.name}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {group.totalAvailable} {group.recipe.yieldUnit} in total stock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Batch Selector */}
          {group.batches.length > 1 ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <Package className="inline h-3.5 w-3.5 mr-1" /> Select Batch (FIFO Recommended)
              </label>
              <select
                value={selectedBatchId}
                onChange={e => {
                  setSelectedBatchId(e.target.value)
                  setSaleQty(1)
                }}
                className={`${inputClass} cursor-pointer`}
              >
                {group.batches.map(b => {
                  const exp = b.expiresAt ? daysUntil(b.expiresAt) : null
                  return (
                    <option key={b.id} value={b.id}>
                      Batch {formatDate(b.batchDate)} — {b.unitsAvailable} left
                      {exp !== null ? ` (Exp: ${exp}d)` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          ) : selectedBatch ? (
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <Package className="h-3.5 w-3.5 text-blue-500" /> Batch: {formatDate(selectedBatch.batchDate)}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {selectedBatch.unitsAvailable} {group.recipe.yieldUnit} available
              </span>
            </div>
          ) : null}

          {/* Quantity Stepper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Quantity to Sell
              </label>
              <span className="text-xs text-slate-400">Max: {maxQty}</span>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5 mb-2">
              {QTY_QUICK_PRESETS.filter(q => q <= maxQty).map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSaleQty(q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    saleQty === q
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {q}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSaleQty(maxQty)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 ml-auto"
              >
                Max ({maxQty})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSaleQty(q => Math.max(1, q - 1))}
                disabled={saleQty <= 1}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-lg leading-none disabled:opacity-40"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={maxQty}
                value={saleQty}
                onChange={e => {
                  const val = parseInt(e.target.value)
                  if (!isNaN(val) && val > 0) setSaleQty(val)
                }}
                className={`${inputClass} text-center font-bold text-base`}
              />
              <button
                type="button"
                onClick={() => setSaleQty(q => Math.min(maxQty, q + 1))}
                disabled={saleQty >= maxQty}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-lg leading-none disabled:opacity-40"
              >
                +
              </button>
            </div>

            {isOverstock && (
              <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" /> Exceeds batch inventory
              </p>
            )}
          </div>

          {/* Unit Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              <Tag className="inline h-3.5 w-3.5 mr-1" /> Unit Price ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={e => setPriceInput(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          {/* Sale Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              <Calendar className="inline h-3.5 w-3.5 mr-1" /> Transaction Date
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={e => setSaleDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Notes Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowNotes(v => !v)}
              className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold"
            >
              {showNotes ? '− Hide notes' : '+ Add order note / memo'}
            </button>
            {showNotes && (
              <textarea
                rows={2}
                value={saleNotes}
                onChange={e => setSaleNotes(e.target.value)}
                placeholder="e.g. Catering discount, invoice #1042…"
                className={`${inputClass} resize-none mt-1.5`}
              />
            )}
          </div>

          {/* Total & Confirmation */}
          <div className="pt-2">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 mb-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  {saleQty} {group.recipe.yieldUnit} × ${effectivePrice.toFixed(2)}
                </span>
                <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
                  ${formatCurrency(saleTotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isValid}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  <span>Confirm & Record Sale</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}