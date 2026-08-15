import React, { useState, useEffect } from 'react'
import { Package, Warehouse, DollarSign, Bell, RotateCcw, AlertTriangle, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { QUICK_UNITS, EMPTY_PANTRY_FORM } from '../constants'
import { PantryIngredient, PantryFormData } from '../types'

interface Props {
  isOpen: boolean
  existing: PantryIngredient | null
  allItems: PantryIngredient[]
  onClose: () => void
  onSave: (data: PantryFormData) => Promise<void>
}

export const PantryFormModal: React.FC<Props> = ({
  isOpen,
  existing,
  allItems,
  onClose,
  onSave,
}) => {
  const { t } = useLanguage()

  const [form, setForm] = useState<PantryFormData>({ ...EMPTY_PANTRY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (existing) {
      setForm({
        id: existing.id,
        name: existing.name,
        currentStock: existing.currentStock,
        unit: existing.unit,
        costPerUnit: existing.costPerUnit,
        lowStockThreshold: existing.lowStockThreshold ?? '',
        reorderPoint: existing.reorderPoint ?? '',
        reorderQuantity: existing.reorderQuantity ?? '',
        supplierName: existing.supplierName ?? '',
        notes: existing.notes ?? '',
      })
    } else {
      setForm({ ...EMPTY_PANTRY_FORM })
    }
    setFormError('')
  }, [existing, isOpen])

  if (!isOpen) return null

  const isDuplicateName =
    form.name.trim() !== '' &&
    allItems.some(
      i =>
        i.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        i.id !== form.id
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError(t('bakeryIngredientNameRequired') || 'Ingredient name is required.')
      return
    }
    if (isDuplicateName) {
      setFormError(t('bakeryDuplicateIngredient') || 'An ingredient with this name already exists.')
      return
    }
    if (!form.unit.trim()) {
      setFormError(t('bakeryUnitRequired') || 'Unit of measurement is required.')
      return
    }

    setSaving(true)
    try {
      await onSave(form)
    } catch (err: any) {
      setFormError(err?.message || (t('bakerySaveInputError') || 'Failed to save ingredient.'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm'
  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5'

  const currentNum = Number(form.currentStock) || 0
  const costNum = Number(form.costPerUnit) || 0
  const stockVal = currentNum * costNum

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] border border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {form.id
                  ? t('bakeryEditIngredient') || 'Edit Ingredient'
                  : t('bakeryAddIngredient') || 'Add Pantry Ingredient'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage raw inventory stocks and automated deduction rules
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Section 1: Basic Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Warehouse className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('bakeryBasicInfo') || 'Basic Information'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>
                    {t('bakeryIngredientName') || 'Ingredient Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Organic Bread Flour"
                    className={`${inputClass} ${
                      isDuplicateName ? 'border-rose-400 ring-rose-300' : ''
                    }`}
                  />
                  {isDuplicateName && (
                    <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {t('bakeryDuplicateIngredient') || 'Name already exists in pantry.'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-3">
                    <label className={labelClass}>{t('bakeryCurrentStock') || 'Current Stock'}</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={form.currentStock}
                      onChange={e => setForm(prev => ({ ...prev, currentStock: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>{t('bakeryUnit') || 'Unit'} *</label>
                    <input
                      list="pantry-unit-datalist"
                      value={form.unit}
                      onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="kg, g, L…"
                      className={inputClass}
                    />
                    <datalist id="pantry-unit-datalist">
                      {QUICK_UNITS.map(u => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Quick Unit Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_UNITS.map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, unit: u }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                        form.unit === u
                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-amber-300'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Pricing */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('bakeryPricing') || 'Cost & Valuation'}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>
                    Cost per Unit ($) / {form.unit || 'unit'}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={form.costPerUnit}
                    onChange={e => setForm(prev => ({ ...prev, costPerUnit: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                {stockVal > 0 && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Calculated Inventory Value: ${stockVal.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Section 3: Stock Alert Thresholds */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('bakeryStockAlertsSection') || 'Thresholds & Reordering'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Low Stock Alert Level</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="—"
                    value={form.lowStockThreshold}
                    onChange={e => setForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Reorder Trigger Point</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="—"
                    value={form.reorderPoint}
                    onChange={e => setForm(prev => ({ ...prev, reorderPoint: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Supplier & Reorder Setup */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('bakeryReorderSettings') || 'Supplier Information'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Default Reorder Qty ({form.unit || 'unit'})</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 50"
                    value={form.reorderQuantity}
                    onChange={e => setForm(prev => ({ ...prev, reorderQuantity: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('bakerySupplierName') || 'Supplier Name'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Millers Ltd."
                    value={form.supplierName}
                    onChange={e => setForm(prev => ({ ...prev, supplierName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>
                {t('bakeryNotesLabel') || 'Storage & Handling Notes'}
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Storage temperature, shelf life notes, bin location…"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-4">
            {formError && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {t('bakeryCancelBtn') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving || isDuplicateName}
                className="flex items-center gap-2 px-5 py-2.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{form.id ? t('bakerySaveChanges') || 'Save Changes' : t('bakeryAddIngredient') || 'Add Ingredient'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}