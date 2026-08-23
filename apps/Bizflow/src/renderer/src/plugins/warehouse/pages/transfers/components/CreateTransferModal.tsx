import React, { useState } from 'react'
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { LocationRef, CreateTransferFormData } from '../types'
import { DEFAULT_CREATE_FORM } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  locations: LocationRef[]
  onSubmit: (data: CreateTransferFormData) => Promise<boolean>
}

export const CreateTransferModal: React.FC<Props> = ({
  isOpen,
  onClose,
  locations,
  onSubmit
}) => {
  const { t } = useLanguage()
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreateTransferFormData>(DEFAULT_CREATE_FORM)

  if (!isOpen) return null

  const handleAddLine = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { productName: '', sku: '', quantity: '1', unit: 'pcs', notes: '' }]
    }))
  }

  const handleRemoveLine = (idx: number) => {
    setForm(f => ({
      ...f,
      items: f.items.length === 1 ? f.items : f.items.filter((_, i) => i !== idx)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fromLocationId || !form.toLocationId) {
      toast.warning('Please select both Origin and Destination facilities.')
      return
    }

    if (form.fromLocationId === form.toLocationId) {
      toast.warning('Origin and Destination facilities must be different.')
      return
    }

    setSubmitting(true)
    const success = await onSubmit(form)
    setSubmitting(false)
    if (success) {
      setForm(DEFAULT_CREATE_FORM)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('warehouseNewStockTransfer') || 'Create Internal Stock Transfer'}
            </h3>
            <p className="text-xs text-slate-400">Initiate cargo movement between designated facilities</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Origin and Destination Facilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Origin Facility (From) *
            </label>
            <select
              required
              value={form.fromLocationId}
              onChange={e => setForm(f => ({ ...f, fromLocationId: e.target.value }))}
              className="w-full rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              <option value="">Select Origin...</option>
              {locations
                .filter(l => l.id !== form.toLocationId)
                .map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Destination Facility (To) *
            </label>
            <select
              required
              value={form.toLocationId}
              onChange={e => setForm(f => ({ ...f, toLocationId: e.target.value }))}
              className="w-full rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              <option value="">Select Destination...</option>
              {locations
                .filter(l => l.id !== form.fromLocationId)
                .map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Transfer Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Dispatch Reference / Notes
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Replenishment transfer for East Bay fulfillment"
            className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Line Items */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Transfer Manifest Lines
            </span>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {form.items.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  required
                  type="text"
                  value={line.productName}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      items: f.items.map((it, i) => (i === idx ? { ...it, productName: e.target.value } : it))
                    }))
                  }
                  placeholder={t('warehouseProductNamePlaceholder') || 'Product Name'}
                  className="flex-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2"
                />
                <input
                  type="text"
                  value={line.sku}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      items: f.items.map((it, i) => (i === idx ? { ...it, sku: e.target.value } : it))
                    }))
                  }
                  placeholder="SKU"
                  className="flex-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono"
                />
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      items: f.items.map((it, i) => (i === idx ? { ...it, quantity: e.target.value } : it))
                    }))
                  }
                  placeholder="Qty"
                  className="w-16 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-2 text-center"
                />
                <input
                  type="text"
                  value={line.unit}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      items: f.items.map((it, i) => (i === idx ? { ...it, unit: e.target.value } : it))
                    }))
                  }
                  placeholder="Unit"
                  className="w-16 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-2 text-center"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLine(idx)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('warehouseCancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Dispatching...' : t('warehouseCreateTransfer') || 'Dispatch Transfer'}
          </button>
        </div>
      </form>
    </div>
  )
}