import React, { useState } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { WASTE_TYPES, WASTE_REASON_OPTIONS } from '../constants'
import { WasteFormData, WasteType, PantryItem, Recipe } from '../types'
import { formatCurrency, getWasteTypeMeta } from '../utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: WasteFormData) => Promise<void>
  pantryItems: PantryItem[]
  recipes: Recipe[]
}

const INITIAL_FORM: WasteFormData = {
  wasteType: 'ingredient',
  pantryIngredientId: '',
  recipeId: '',
  productId: '',
  itemName: '',
  quantity: '',
  unit: 'kg',
  cost: '',
  reason: 'Spoilage',
  wasteDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

export const WasteFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  pantryItems,
  recipes,
}) => {
  const { t } = useLanguage()
  const [form, setForm] = useState<WasteFormData>({ ...INITIAL_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  if (!isOpen) return null

  const setField = <K extends keyof WasteFormData>(key: K, value: WasteFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (formError) setFormError('')
  }

  const handleTypeChange = (type: WasteType) => {
    setForm({
      ...INITIAL_FORM,
      wasteType: type,
      unit: type === 'ingredient' ? 'kg' : 'pcs',
    })
    setFormError('')
  }

  const handlePantrySelect = (id: string) => {
    const item = pantryItems.find(p => p.id === id)
    if (!item) {
      setForm(prev => ({ ...prev, pantryIngredientId: '', itemName: '' }))
      return
    }
    setForm(prev => ({
      ...prev,
      pantryIngredientId: id,
      itemName: item.name,
      unit: item.unit,
      cost: item.costPerUnit ? item.costPerUnit.toString() : prev.cost,
    }))
  }

  const handleRecipeSelect = (id: string) => {
    const recipe = recipes.find(r => r.id === id)
    if (!recipe) {
      setForm(prev => ({ ...prev, recipeId: '', productId: '', itemName: '' }))
      return
    }

    if (form.wasteType === 'finished_product') {
      setForm(prev => ({
        ...prev,
        recipeId: id,
        productId: recipe.outputProduct?.id ?? '',
        itemName: recipe.outputProduct?.name ?? recipe.name,
        unit: 'pcs',
      }))
    } else if (form.wasteType === 'production_batch') {
      setForm(prev => ({
        ...prev,
        recipeId: id,
        itemName: `Scrapped Batch: ${recipe.name}`,
        unit: 'batch',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.itemName.trim()) {
      setFormError(t('bakeryWasteItemRequired') || 'Item name or selection is required.')
      return
    }
    const qty = parseFloat(form.quantity)
    if (isNaN(qty) || qty <= 0) {
      setFormError(t('bakeryWasteQuantityRequired') || 'Please enter a valid loss quantity > 0.')
      return
    }

    setSaving(true)
    try {
      await onSave(form)
      setForm({ ...INITIAL_FORM })
      onClose()
    } catch (err: any) {
      setFormError(err?.message || t('bakeryWasteSaveFailed') || 'Failed to save waste record.')
    } finally {
      setSaving(false)
    }
  }

  const selectedPantry = pantryItems.find(p => p.id === form.pantryIngredientId)
  const currentTypeMeta = getWasteTypeMeta(form.wasteType)
  const CurrentIcon = currentTypeMeta.icon

  const qtyNumber = parseFloat(form.quantity) || 0
  const costNumber = parseFloat(form.cost) || 0
  const calculatedTotal = qtyNumber * costNumber

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all shadow-sm'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${currentTypeMeta.color}`}>
              <CurrentIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('bakeryLogWaste') || 'Log Bakery Waste'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Record losses to keep inventory & batch margins accurate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Waste Type Selector Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {t('bakeryWasteWhatLogging') || 'Select Waste Classification'   }
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WASTE_TYPES.map(wt => {
                  const Icon = wt.icon
                  const active = form.wasteType === wt.value
                  return (
                    <button
                      key={wt.value}
                      type="button"
                      onClick={() => handleTypeChange(wt.value)}
                      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                        active
                          ? `border-rose-500 ${wt.color} ring-2 ring-rose-200 dark:ring-rose-900/40 shadow-sm`
                          : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50/40 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-bold leading-tight">
                          {t(wt.labelKey) || wt.defaultLabel}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {t(wt.descKey) || wt.defaultDesc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contextual Selector based on waste type */}
            {form.wasteType === 'ingredient' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('bakeryWastePantryIngredient') || 'Pantry Ingredient'} *
                </label>
                <select
                  value={form.pantryIngredientId}
                  onChange={e => handlePantrySelect(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">{t('bakeryWasteSelectIngredient') || 'Select pantry stock item…'}</option>
                  {pantryItems.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.currentStock.toFixed(2)} {p.unit})
                    </option>
                  ))}
                </select>
                {selectedPantry && qtyNumber > selectedPantry.currentStock && (
                  <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('bakeryWasteExceedsStock') || 'Warning: Lost quantity exceeds current stock!'}
                  </p>
                )}
              </div>
            )}

            {(form.wasteType === 'finished_product' || form.wasteType === 'production_batch') && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('bakeryWasteRecipeProduct') || 'Target Recipe / Product'} *
                </label>
                <select
                  value={form.recipeId}
                  onChange={e => handleRecipeSelect(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">{t('bakeryWasteSelectRecipe') || 'Select Recipe…'}</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.outputProduct ? `→ ${r.outputProduct.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.wasteType === 'other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('bakeryWasteItemName') || 'Item Name / Description'} *
                </label>
                <input
                  type="text"
                  value={form.itemName}
                  onChange={e => setField('itemName', e.target.value)}
                  placeholder="e.g. Sourdough Loaf Tester"
                  className={inputClass}
                />
              </div>
            )}

            {/* Quantity & Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('bakeryWasteQuantity') || 'Lost Quantity'  } *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={form.quantity}
                  onChange={e => setField('quantity', e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('bakeryIngredientUnit') || 'Unit'  }
                </label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={e => setField('unit', e.target.value)}
                  readOnly={Boolean(selectedPantry)}
                  className={`${inputClass} ${selectedPantry ? 'bg-slate-50 dark:bg-slate-800/40 text-slate-400' : ''}`}
                />
              </div>
            </div>

            {/* Unit Cost and Reason */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('bakeryWasteCostPerUnit') || 'Estimated Unit Cost ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cost}
                  onChange={e => setField('cost', e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('bakeryWasteReason') || 'Reason'}
                </label>
                <select
                  value={form.reason}
                  onChange={e => setField('reason', e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {WASTE_REASON_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>
                      {t(r.key) || r.defaultLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                {t('bakeryWasteDate') || 'Date Occurred'    } *
              </label>
              <input
                type="date"
                value={form.wasteDate}
                onChange={e => setField('wasteDate', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                {t('bakeryWasteNotesLabel') || 'Notes'} (Optional)
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder={t('bakeryWasteOptionalNotes') || 'Add corrective actions, staff notes, etc…'}
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

            <div className="flex items-center justify-between">
              <div className="text-xs">
                {calculatedTotal > 0 && (
                  <span className="text-slate-500 dark:text-slate-400">
                    Est. Total Loss:{' '}
                    <strong className="text-rose-600 dark:text-rose-400 text-sm">
                      {formatCurrency(calculatedTotal)}
                    </strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  {t('bakeryCancelBtn') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{t('bakeryLogWaste') || 'Log Waste'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}