import React, { useState, useEffect } from 'react'
import { Factory, ChefHat, Hash, Clock, FileText, PackageCheck, TrendingDown, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { BATCH_QTY_PRESETS } from '../constants'
import { Recipe, AvailableBatchCapacity } from '../types'
import { getTodayDateString } from '../utils'

interface Props {
  isOpen: boolean
  recipes: Recipe[]
  capacity: AvailableBatchCapacity[]
  preselectedRecipeId?: string
  onClose: () => void
  onProceedToConfirm: (data: {
    recipeId: string
    quantity: number
    batchDate: string
    notes?: string
  }) => void
}

export const LogProductionModal: React.FC<Props> = ({
  isOpen,
  recipes,
  capacity,
  preselectedRecipeId,
  onClose,
  onProceedToConfirm,
}) => {
  const { t } = useLanguage()

  const [recipeId, setRecipeId] = useState(preselectedRecipeId || (recipes[0]?.id ?? ''))
  const [quantity, setQuantity] = useState('1')
  const [batchDate, setBatchDate] = useState(getTodayDateString())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (preselectedRecipeId) {
      setRecipeId(preselectedRecipeId)
    } else if (recipes.length > 0 && !recipeId) {
      setRecipeId(recipes[0].id)
    }
  }, [preselectedRecipeId, recipes])

  if (!isOpen) return null

  const selectedRecipe = recipes.find(r => r.id === recipeId)
  const selectedCap = capacity.find(c => c.recipeId === recipeId)
  const qtyNumber = parseFloat(quantity) || 0
  const previewUnits = selectedRecipe ? qtyNumber * selectedRecipe.yieldQty : 0

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeId || qtyNumber <= 0) return

    onProceedToConfirm({
      recipeId,
      quantity: qtyNumber,
      batchDate,
      notes: notes.trim() || undefined,
    })
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm'
  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('bakeryLogProduction') || 'Log Production Run'}
              </h3>
              <p className="text-xs text-slate-400">Start a new baking run and stock units</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleNext} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Recipe Selection */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5" />
                  {t('bakerySelectRecipe') || 'Recipe'} *
                </span>
              </label>
              <select
                value={recipeId}
                onChange={e => setRecipeId(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Yield: {r.yieldQty} {r.yieldUnit}/batch)
                  </option>
                ))}
              </select>

              {/* Real-time Capacity Badge */}
              {selectedCap && (
                <div
                  className={`mt-2 p-3 rounded-xl border text-xs ${
                    selectedCap.availableBatches === null
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
                      : selectedCap.availableBatches > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {selectedCap.availableBatches === null ? (
                    <span className="italic">No pantry links — stock not automatically verified</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 font-bold">
                        {selectedCap.availableBatches > 0 ? (
                          <PackageCheck className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span>
                          {selectedCap.availableBatches} batch
                          {selectedCap.availableBatches !== 1 ? 'es' : ''} possible based on current stock
                        </span>
                      </div>
                      {selectedCap.limitedBy && (
                        <p className="opacity-80 mt-1">
                          Stock bottleneck: <strong>{selectedCap.limitedBy}</strong>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Batch Count Stepper */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  {t('bakeryBatchesCount') || 'Batches to Produce'} *
                </span>
              </label>

              <div className="flex gap-1.5 mb-2 flex-wrap">
                {BATCH_QTY_PRESETS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(String(q))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                      quantity === String(q)
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                    }`}
                  >
                    {q} {q === 1 ? 'batch' : 'batches'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(q => String(Math.max(0.5, Math.round((parseFloat(q) - 0.5) * 100) / 100)))
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-lg leading-none"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className={`${inputClass} text-center font-bold text-base`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(q => String(Math.round((parseFloat(q) + 0.5) * 100) / 100))
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-lg leading-none"
                >
                  +
                </button>
              </div>

              {previewUnits > 0 && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                  <PackageCheck className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Expected Output:{' '}
                    <strong className="font-bold">
                      {previewUnits.toLocaleString()} {selectedRecipe?.yieldUnit ?? 'units'}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('bakeryProductionDate') || 'Production Date'} *
                </span>
              </label>
              <input
                type="date"
                value={batchDate}
                onChange={e => setBatchDate(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {t('bakeryNotesLabel') || 'Bake Notes / Shift Details'}
                </span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Baker shift notes, temperature tweaks, special handling…"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              {t('bakeryCancelBtn') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!recipeId || qtyNumber <= 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              <Factory className="h-4 w-4" />
              <span>Review Ingredients & Bake</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}