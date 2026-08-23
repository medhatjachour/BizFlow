import React, { useState, useEffect } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { LocationRef, StockUpsertFormData } from '../types'
import { DEFAULT_UPSERT_FORM, ITEM_TYPES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  locations: LocationRef[]
  defaultLocationId?: string
  onSubmit: (data: StockUpsertFormData) => Promise<boolean>
}

export const StockUpsertModal: React.FC<Props> = ({
  isOpen,
  onClose,
  locations,
  defaultLocationId,
  onSubmit
}) => {
  const { t } = useLanguage()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<StockUpsertFormData>(DEFAULT_UPSERT_FORM)

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...DEFAULT_UPSERT_FORM,
        locationId: defaultLocationId && defaultLocationId !== 'all' ? defaultLocationId : (locations[0]?.id || '')
      })
    }
  }, [isOpen, defaultLocationId, locations])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const success = await onSubmit(form)
    setSubmitting(false)
    if (success) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('warehouseAddStockEntry') || 'Register Warehouse Stock Entry'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location & Product Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseLocation') || 'Storage Location'} *
            </label>
            <select
              required
              value={form.locationId}
              onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              <option value="">Select Facility...</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseProductName') || 'Product Name'} *
            </label>
            <input
              required
              type="text"
              value={form.productName}
              onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
              placeholder="e.g. Organic Arabica Coffee"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* SKU, Barcode, Type */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
              placeholder="SKU-1002"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Barcode</label>
            <input
              type="text"
              value={form.barcode}
              onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
              placeholder="UPC/EAN"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Type</label>
            <select
              value={form.itemType}
              onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              {ITEM_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Qty *</label>
            <input
              type="number"
              min="0"
              required
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit</label>
            <input
              type="text"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              placeholder="pcs, kg, box"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Min Threshold</label>
            <input
              type="number"
              min="0"
              value={form.minQuantity}
              onChange={e => setForm(f => ({ ...f, minQuantity: e.target.value }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Traceability: Lot, Batch, Expiry */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Lot Number</label>
            <input
              type="text"
              value={form.lotNumber}
              onChange={e => setForm(f => ({ ...f, lotNumber: e.target.value }))}
              placeholder="LOT-901"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bin Location</label>
            <input
              type="text"
              value={form.binCode}
              onChange={e => setForm(f => ({ ...f, binCode: e.target.value }))}
              placeholder="BIN-A-04"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expiry Date</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Checkbox Flags */}
        <div className="flex items-center gap-4 pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isQuarantine}
              onChange={e => setForm(f => ({ ...f, isQuarantine: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Quarantine Inspection Hold
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isDamaged}
              onChange={e => setForm(f => ({ ...f, isDamaged: e.target.checked }))}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            Mark as Damaged
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('warehouseCancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Saving...' : t('warehouseSave') || 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}