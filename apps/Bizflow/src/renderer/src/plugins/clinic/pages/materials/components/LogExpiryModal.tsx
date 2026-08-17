import React, { useState } from 'react'
import { AlertCircle, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { formatDate } from '../utils'
import type { Material, Batch } from '../types'

interface Props {
  material: Material
  batch?: Batch | null
  onClose: () => void
  onSaved: () => void
}

export const LogExpiryModal: React.FC<Props> = ({ material, batch, onClose, onSaved }) => {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const currentAvailable = batch ? batch.quantity : material.quantity
  const [qty, setQty] = useState(String(currentAvailable))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const costPerUnit = batch?.costPerUnit ?? material.costPerUnit
  const estimatedCost = parseFloat(qty) > 0 ? parseFloat(qty) * costPerUnit : 0
  const expiryDate = batch?.expiryDate ?? material.expiryDate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!qty.trim() || isNaN(q) || q <= 0 || q > currentAvailable) {
      showToast('error', t('materialAdjustInvalid') || 'Please enter a valid quantity')
      return
    }

    setSaving(true)
    try {
      const batchTag = batch?.batchNumber ? ` (Lot #${batch.batchNumber})` : ''
      await window.api.clinic.expenses.create({
        date: new Date().toISOString(),
        category: 'material_expiry',
        description: `${t('materialExpiryExpenseDesc') || 'Expired Material Disposal'} — ${material.name}${batchTag} (${q} ${material.unit})`,
        amount: estimatedCost > 0 ? estimatedCost : q,
        vendor: batch?.supplier ?? material.supplier ?? null,
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: notes.trim() || null
      })

      if (batch) {
        await window.api.clinic.materialBatches.logExpiry({
          batchId: batch.id,
          materialId: material.id,
          quantityExpired: q,
          expiryDate: batch.expiryDate ?? new Date().toISOString(),
          notes: notes.trim() || null
        })
      } else {
        await window.api.clinic.materials.adjustStock(material.id, -q)
      }

      showToast('success', t('expenseAdded') || 'Expiry write-off recorded and logged to clinic expenses')
      onSaved()
    } catch {
      showToast('error', t('failedSaveExpense') || 'Failed to record expired material')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t('logMaterialExpiryTitle') || 'Record Expiry Disposal'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-3.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{material.name}</p>
            {batch?.batchNumber && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">Lot #{batch.batchNumber}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Expired Stock:{' '}
              <span className="font-extrabold text-amber-600 dark:text-amber-400">
                {currentAvailable} {material.unit}
              </span>
            </p>
            {expiryDate && (
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                Expiry Date: {formatDate(expiryDate)}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('logExpiredQtyLabel') || 'Quantity to Write-Off'} ({material.unit}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={currentAvailable}
                className={inputCls}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                autoFocus
              />
              {estimatedCost > 0 && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Write-off Expense:{' '}
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                    ${estimatedCost.toFixed(2)}
                  </span>{' '}
                  (${costPerUnit.toFixed(2)} × {qty})
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('logExpiredNotes') || 'Disposal Notes'}
              </label>
              <textarea
                className={`${inputCls} resize-none h-16`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Disposed in biological waste bin"
              />
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
                disabled={saving || !qty}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t('logMaterialExpiry') || 'Dispose & Record'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}