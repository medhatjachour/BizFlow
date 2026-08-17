import React from 'react'
import { Package, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useMaterialForm } from '../hooks/useMaterialForm'
import { STANDARD_UNITS } from '../constants'
import type { Material, Category } from '../types'

interface Props {
  existing?: Material | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export const MaterialFormModal: React.FC<Props> = ({ existing, categories, onClose, onSaved }) => {
  const { t } = useLanguage()
  const { form, saving, setField, save } = useMaterialForm(existing, onSaved)

  const inputCls =
    'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs overflow-y-auto py-8 px-4 animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {existing ? t('editMaterial') || 'Edit Material' : t('newMaterial') || 'Add Material'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>{t('materialName') || 'Material Name'} *</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Composite Resin A2"
                required
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>{t('materialCategory') || 'Category'}</label>
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
              >
                <option value="">{t('select') || '— Select Category —'}</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('description') || 'Description'}</label>
            <textarea
              className={`${inputCls} resize-none h-16`}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="e.g. Light-cure restorative material for anterior teeth..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <label className={labelCls}>{t('unit') || 'Unit'}</label>
              <select
                className={inputCls}
                value={form.unit}
                onChange={(e) => setField('unit', e.target.value)}
              >
                {STANDARD_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('materialQuantity') || 'Initial Stock'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{t('materialMinQty') || 'Min Alert Qty'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.minQuantity}
                onChange={(e) => setField('minQuantity', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>{t('materialCostPerUnit') || 'Cost / Unit ($)'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.costPerUnit}
                onChange={(e) => setField('costPerUnit', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>{t('supplier') || 'Supplier / Vendor'}</label>
              <input
                className={inputCls}
                value={form.supplier}
                onChange={(e) => setField('supplier', e.target.value)}
                placeholder="e.g. 3M Dental Supply"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('notes') || 'Internal Notes'}</label>
            <textarea
              className={`${inputCls} resize-none h-14`}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Storage temperature, shelf number, etc."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
              className="h-4 w-4 rounded accent-teal-600"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('materialActive') || 'Material is active and available in session selector'}
            </span>
          </label>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{t('save') || 'Save Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}