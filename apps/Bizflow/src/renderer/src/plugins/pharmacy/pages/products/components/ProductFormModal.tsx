import React, { useState } from 'react'
import { X, Layers } from 'lucide-react'
import { PharmacyProductItem, ProductFormData } from '../types'
import { initialProductForm } from '../utils'
import { DEFAULT_SELLING_UNITS, DEFAULT_SUBUNITS } from '../constants'
import { pharma, inputCls } from '../../components/_shared'
import { Button } from '../../components/ui'

interface ProductFormModalProps {
  initial: PharmacyProductItem | null
  categories: string[]
  onClose: () => void
  onSaved: () => void
  toast: any
  t: (k: string) => string
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  initial,
  categories,
  onClose,
  onSaved,
  toast,
  t,
}) => {
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<ProductFormData>(() => initialProductForm(initial))

  const setField = (key: keyof ProductFormData) => (e: any) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        ...form,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        minimumStock: parseFloat(form.minimumStock) || 0,
        subUnit: form.subUnit.trim() || null,
        subUnitsPerContainer:
          form.subUnit.trim() && parseFloat(form.subUnitsPerContainer) > 0
            ? parseFloat(form.subUnitsPerContainer)
            : null,
        subUnitPrice:
          form.subUnit.trim() && form.subUnitPrice !== ''
            ? parseFloat(form.subUnitPrice)
            : null,
      }

      if (initial) {
        await pharma()?.products.update(initial.id, payload)
      } else {
        await pharma()?.products.create(payload)
      }

      toast.success(initial ? t('phProductUpdated') || 'Product updated' : t('phProductAdded') || 'Product added')
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save product')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            {initial ? t('phEditProduct') || 'Edit Product' : t('phAddProduct') || 'Add Product'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Medicine Name *
            </label>
            <input
              value={form.name}
              onChange={setField('name')}
              required
              placeholder="e.g. Augmentin 1g Tablets"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Generic Formula
              </label>
              <input
                value={form.genericName}
                onChange={setField('genericName')}
                placeholder="e.g. Amoxicillin / Clavulanate"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Barcode
              </label>
              <input
                value={form.barcode}
                onChange={setField('barcode')}
                placeholder="Scan or type code"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Category</label>
              <input
                value={form.category}
                onChange={setField('category')}
                list="cats-list"
                className={inputCls}
              />
              <datalist id="cats-list">
                {categories.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Primary Unit</label>
              <input
                value={form.unit}
                onChange={setField('unit')}
                list="units-list"
                placeholder="box, bottle, strip..."
                className={inputCls}
              />
              <datalist id="units-list">
                {DEFAULT_SELLING_UNITS.map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Selling Price ($)</label>
              <input
                value={form.sellingPrice}
                onChange={setField('sellingPrice')}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Min Stock Alert Level</label>
              <input
                value={form.minimumStock}
                onChange={setField('minimumStock')}
                type="number"
                min="0"
                placeholder="10"
                className={inputCls}
              />
            </div>
          </div>

          {/* Sub-unit fractional selling */}
          <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-950/20 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-bold">
              <Layers size={13} />
              <span>Fractional / Sub-Unit Selling (Optional)</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Allows cashiers to sell strips from a box or tablets from a strip at POS.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Sub-Unit</label>
                <input
                  value={form.subUnit}
                  onChange={setField('subUnit')}
                  list="subunits-list"
                  placeholder="strip, tablet"
                  className={`${inputCls} py-1 text-xs`}
                />
                <datalist id="subunits-list">
                  {DEFAULT_SUBUNITS.map(u => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                  Qty per 1 {form.unit || 'unit'}
                </label>
                <input
                  value={form.subUnitsPerContainer}
                  onChange={setField('subUnitsPerContainer')}
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  className={`${inputCls} py-1 text-xs`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Sub Price ($)</label>
                <input
                  value={form.subUnitPrice}
                  onChange={setField('subUnitPrice')}
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Auto-calculated"
                  className={`${inputCls} py-1 text-xs`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Notes / Description</label>
            <textarea
              value={form.description}
              onChange={setField('description')}
              rows={2}
              className={inputCls}
            />
          </div>

          {initial && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Available for sales (Active)</span>
            </label>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" loading={busy}>
              Save Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}