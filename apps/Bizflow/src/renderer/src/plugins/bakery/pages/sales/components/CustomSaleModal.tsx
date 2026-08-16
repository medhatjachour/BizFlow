import React, { useState, useEffect } from 'react'
import { X, Plus, AlertTriangle, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Recipe, CustomSaleFormData } from '../types'
import { formatCurrency, getTodayDateString } from '../utils'

interface Props {
  isOpen: boolean
  recipes: Recipe[]
  onClose: () => void
  onSave: (data: CustomSaleFormData) => Promise<void>
}

export const CustomSaleModal: React.FC<Props> = ({ isOpen, recipes, onClose, onSave }) => {
  const { t } = useLanguage()

  const [form, setForm] = useState<CustomSaleFormData>({
    recipeId: '',
    itemName: '',
    quantity: '1',
    unitPrice: '',
    saleDate: getTodayDateString(),
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (form.recipeId) {
      const r = recipes.find(rec => rec.id === form.recipeId)
      if (r) {
        setForm(prev => ({
          ...prev,
          itemName: r.name,
          unitPrice: r.sellingPrice ? r.sellingPrice.toString() : prev.unitPrice,
        }))
      }
    }
  }, [form.recipeId, recipes])

  if (!isOpen) return null

  const qty = parseFloat(form.quantity) || 0
  const price = parseFloat(form.unitPrice) || 0
  const total = qty * price

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.itemName.trim()) {
      setError(t('bakerySaleItemRequired') || 'Item name is required.')
      return
    }
    if (qty <= 0 || price < 0) {
      setError(t('bakerySaleInvalidNumbers') || 'Enter valid quantity and price.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err: any) {
      setError(err?.message || (t('bakerySaleRecordFailed') || 'Failed to record custom sale.'))
    } finally {
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
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('bakeryCustomSale') || 'Custom Sale'}
            </h3>
            <p className="text-xs text-slate-400">Record a sale without inventory batch tracking</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Link Recipe (Optional)
            </label>
            <select
              value={form.recipeId}
              onChange={e => setForm(prev => ({ ...prev, recipeId: e.target.value }))}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">— No recipe link —</option>
              {recipes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.sellingPrice ? `· $${r.sellingPrice.toFixed(2)}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={form.itemName}
              onChange={e => setForm(prev => ({ ...prev, itemName: e.target.value }))}
              placeholder="e.g. Sourdough Special Loaf"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Quantity *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={form.quantity}
                onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Unit Price ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.unitPrice}
                onChange={e => setForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Sale Date
            </label>
            <input
              type="date"
              value={form.saleDate}
              onChange={e => setForm(prev => ({ ...prev, saleDate: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any details, customer name…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {total > 0 && (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3.5 flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Calculated Total
              </span>
              <span className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                ${formatCurrency(total)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              {t('bakeryCancelBtn') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              <span>{t('bakeryRecordSaleBtn') || 'Record Sale'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}