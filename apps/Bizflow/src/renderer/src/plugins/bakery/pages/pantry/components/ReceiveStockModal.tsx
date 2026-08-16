import React, { useState } from 'react'
import { CheckCircle2, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PantryIngredient } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  target: PantryIngredient | null
  onClose: () => void
  onConfirm: (
    target: PantryIngredient,
    qtyReceived: number,
    purchasePrice?: number
  ) => Promise<void>
}

export const ReceiveStockModal: React.FC<Props> = ({ target, onClose, onConfirm }) => {
  const { t } = useLanguage()

  const [qty, setQty] = useState(
    target?.reorderQuantity ? target.reorderQuantity.toString() : ''
  )
  const [price, setPrice] = useState(
    target && target.costPerUnit > 0 ? target.costPerUnit.toString() : ''
  )
  const [saving, setSaving] = useState(false)

  if (!target) return null

  const qtyNum = parseFloat(qty) || 0
  const priceNum = parseFloat(price) || 0
  const totalCost = qtyNum * priceNum

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (qtyNum <= 0) return

    setSaving(true)
    try {
      await onConfirm(target, qtyNum, priceNum > 0 ? priceNum : undefined)
    } finally {
      setSaving(false)
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
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('bakeryMarkReordered') || 'Receive Stock Delivery'}
            </h3>
            <p className="text-xs text-slate-400">{target.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Qty Received ({target.unit}) *
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                required
                autoFocus
                value={qty}
                onChange={e => setQty(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Purchase Price ($/unit)
              </label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {totalCost > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Total Delivery Cost
              </span>
              <span className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                ${formatCurrency(totalCost)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={qtyNum <= 0 || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm Delivery</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}