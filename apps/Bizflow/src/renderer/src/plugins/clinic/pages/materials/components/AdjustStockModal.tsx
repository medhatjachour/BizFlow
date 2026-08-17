import React, { useState } from 'react'
import { RefreshCw, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Material, Batch } from '../types'

interface Props {
  material: Material
  batch?: Batch | null
  onClose: () => void
  onSaved: () => void
}

export const AdjustStockModal: React.FC<Props> = ({ material, batch, onClose, onSaved }) => {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [delta, setDelta] = useState('')
  const [saving, setSaving] = useState(false)

  const currentQty = batch ? batch.quantity : material.quantity

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const d = parseFloat(delta)
    if (!delta.trim() || isNaN(d) || d === 0) {
      showToast('error', t('materialAdjustInvalid') || 'Please enter a valid non-zero adjustment')
      return
    }

    setSaving(true)
    try {
      if (batch) {
        const newQty = Math.max(0, batch.quantity + d)
        await window.api.clinic.materialBatches.logAdjustment({
          batchId: batch.id,
          materialId: material.id,
          quantityBefore: batch.quantity,
          quantityAfter: newQty,
          reason: 'recount'
        })
      } else {
        await window.api.clinic.materials.adjustStock(material.id, d)
      }
      showToast('success', t('updatedSuccessfully') || 'Inventory stock adjusted')
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <RefreshCw className="h-4 w-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t('clinicMaterialAdjustStock') || 'Adjust Stock Quantity'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{material.name}</p>
            {batch?.batchNumber && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Lot #{batch.batchNumber}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Current Available:{' '}
              <span className="font-extrabold text-teal-600 dark:text-teal-400">
                {currentQty} {material.unit}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('materialAdjustDelta') || 'Stock Delta (e.g. +5 or -2)'}
              </label>
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+10 or -5"
                autoFocus
                required
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                {t('materialAdjustHint') || 'Use positive number to add stock, negative to subtract.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving || !delta.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t('save') || 'Apply Adjustment'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}