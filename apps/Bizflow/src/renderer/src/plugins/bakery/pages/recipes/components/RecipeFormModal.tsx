import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Unlink,
  Package,
  BookOpen,
  Layers,
  DollarSign,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { YIELD_UNITS, INGREDIENT_UNITS } from '../constants'
import { Recipe, PantryItem, RecipeFormData } from '../types'
import { convertCost } from '../utils'

interface Props {
  open: boolean
  recipe: Recipe | null
  onClose: () => void
  onSave: (data: RecipeFormData) => Promise<void>
}

const emptyIngredient = () => ({
  name: '',
  quantity: 1,
  unit: 'g',
  costPerUnit: 0,
  pantryIngredientId: '',
})

const defaultFormData = (): RecipeFormData => ({
  name: '',
  description: '',
  yieldQty: 1,
  yieldUnit: 'pcs',
  sellingPrice: '',
  expiryDays: '',
  notes: '',
  ingredients: [emptyIngredient()],
})

export const RecipeFormModal: React.FC<Props> = ({ open, recipe, onClose, onSave }) => {
  const { t } = useLanguage()

  const [form, setForm] = useState<RecipeFormData>(defaultFormData())
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [useCustomYieldUnit, setUseCustomYieldUnit] = useState(false)
  const customYieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (recipe) {
      const isCustomUnit = Boolean(recipe.yieldUnit && !YIELD_UNITS.includes(recipe.yieldUnit))
      setUseCustomYieldUnit(isCustomUnit)
      setForm({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description ?? '',
        yieldQty: recipe.yieldQty,
        yieldUnit: recipe.yieldUnit,
        sellingPrice: recipe.sellingPrice ?? '',
        expiryDays: recipe.expiryDays ?? '',
        notes: recipe.notes ?? '',
        ingredients: recipe.ingredients.length
          ? recipe.ingredients.map(i => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              costPerUnit: i.costPerUnit,
              pantryIngredientId: i.pantryIngredientId ?? '',
            }))
          : [emptyIngredient()],
      })
    } else {
      setUseCustomYieldUnit(false)
      setForm(defaultFormData())
    }
    setErrors({})
  }, [open, recipe])

  useEffect(() => {
    if (!open) return
    window.api.bakery
      .getPantry()
      .then((items: PantryItem[]) => setPantryItems(items ?? []))
      .catch(() => setPantryItems([]))
  }, [open])

  if (!open) return null

  const setField = (key: keyof RecipeFormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }))

  const setIngredient = (idx: number, key: string, value: any) =>
    setForm(f => {
      const ings = [...f.ingredients]
      ings[idx] = { ...ings[idx], [key]: value }
      return { ...f, ingredients: ings }
    })

  const addIngredient = () =>
    setForm(f => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }))

  const removeIngredient = (idx: number) =>
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('bakeryNameRequired') || 'Recipe name is required.'
    if (Number(form.yieldQty) <= 0) e.yieldQty = t('bakeryYieldRequired') || 'Yield must be > 0.'
    if (form.ingredients.some(i => !i.name.trim())) {
      e.ingredients = t('bakeryIngredientNameRequired') || 'All ingredients must have a name.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await onSave(form)
    } catch (err: any) {
      setErrors({ submit: err?.message || (t('bakerySaveFailed') || 'Failed to save recipe formula.') })
    } finally {
      setSaving(false)
    }
  }

  const totalCost = form.ingredients.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.costPerUnit) || 0),
    0
  )
  const costPerUnit = Number(form.yieldQty) > 0 ? totalCost / Number(form.yieldQty) : 0
  const sellingPriceNum = form.sellingPrice !== '' ? Number(form.sellingPrice) : null
  const margin =
    sellingPriceNum && sellingPriceNum > 0 ? ((sellingPriceNum - costPerUnit) / sellingPriceNum) * 100 : null

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm'
  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl flex flex-col max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {form.id ? t('bakeryEditRecipe') || 'Edit Recipe Formula' : t('bakeryNewRecipe') || 'New Recipe Formula'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure ingredients, pantry links, yield estimations and margins
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className={labelClass}>
                  {t('bakeryRecipeName') || 'Recipe Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Traditional Sourdough Boule"
                  className={`${inputClass} ${errors.name ? 'border-rose-500 ring-rose-400' : ''}`}
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
              </div>

              <div className="sm:col-span-3">
                <label className={labelClass}>{t('bakeryDescription') || 'Description'}</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Short description or flavor profile…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={labelClass}>{t('bakeryYield') || 'Yield Quantity'} *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={form.yieldQty}
                  onChange={e => setField('yieldQty', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t('bakeryYieldUnit') || 'Yield Unit'}</label>
                {!useCustomYieldUnit ? (
                  <select
                    value={form.yieldUnit}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        setUseCustomYieldUnit(true)
                        setField('yieldUnit', '')
                        setTimeout(() => customYieldRef.current?.focus(), 50)
                      } else {
                        setField('yieldUnit', e.target.value)
                      }
                    }}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {YIELD_UNITS.map(u => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="__custom__">✏ Custom Unit…</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      ref={customYieldRef}
                      value={form.yieldUnit}
                      onChange={e => setField('yieldUnit', e.target.value)}
                      placeholder="e.g. baguettes, loaves…"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-amber-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomYieldUnit(false)
                        setField('yieldUnit', 'pcs')
                      }}
                      className="px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ↩
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>{t('bakeryExpiryDays') || 'Shelf Life (Days)'}</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 3"
                  value={form.expiryDays}
                  onChange={e => setField('expiryDays', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Ingredients Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('bakeryIngredients') || 'Formula Ingredients'} ({form.ingredients.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('bakeryAddIngredient') || 'Add Ingredient'}</span>
                </button>
              </div>

              {errors.ingredients && (
                <p className="text-xs text-rose-500 mb-2 font-medium">{errors.ingredients}</p>
              )}

              <datalist id="recipe-ingredient-units">
                {INGREDIENT_UNITS.map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>

              <div className="space-y-3">
                {form.ingredients.map((ing, idx) => {
                  const linkedItem = pantryItems.find(p => p.id === ing.pantryIngredientId)
                  const unitMismatch = linkedItem && linkedItem.unit !== ing.unit
                  const canConvert = unitMismatch
                    ? convertCost(linkedItem.costPerUnit, linkedItem.unit, ing.unit) !== null
                    : false

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-800/40"
                    >
                      {/* Ingredient Inputs */}
                      <div className="grid grid-cols-12 gap-2.5 items-center">
                        <div className="col-span-3">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                            Ingredient *
                          </label>
                          <input
                            type="text"
                            required
                            value={ing.name}
                            onChange={e => {
                              setIngredient(idx, 'name', e.target.value)
                              const match = pantryItems.find(
                                p => p.name.toLowerCase() === e.target.value.toLowerCase()
                              )
                              if (match && !ing.pantryIngredientId) {
                                setIngredient(idx, 'pantryIngredientId', match.id)
                                setIngredient(idx, 'unit', match.unit)
                                setIngredient(idx, 'costPerUnit', match.costPerUnit)
                              }
                            }}
                            placeholder="e.g. Bread Flour"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 font-bold"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                            Qty *
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={ing.quantity}
                            onChange={e => setIngredient(idx, 'quantity', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-right bg-white dark:bg-slate-800 font-bold"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                            Unit
                          </label>
                          <input
                            list="recipe-ingredient-units"
                            value={ing.unit}
                            onChange={e => {
                              const newUnit = e.target.value
                              setIngredient(idx, 'unit', newUnit)
                              if (ing.pantryIngredientId) {
                                const pi = pantryItems.find(p => p.id === ing.pantryIngredientId)
                                if (pi) {
                                  const converted = convertCost(pi.costPerUnit, pi.unit, newUnit)
                                  if (converted !== null) setIngredient(idx, 'costPerUnit', converted)
                                }
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                            Cost/{ing.unit || 'u'}
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={ing.costPerUnit}
                            onChange={e => setIngredient(idx, 'costPerUnit', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-right bg-white dark:bg-slate-800 font-medium"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                            Subtotal
                          </label>
                          <div className="px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs text-right bg-slate-100/60 dark:bg-slate-800 font-bold text-amber-600 dark:text-amber-400">
                            ${(Number(ing.quantity || 0) * Number(ing.costPerUnit || 0)).toFixed(2)}
                          </div>
                        </div>

                        <div className="col-span-1 pt-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeIngredient(idx)}
                            disabled={form.ingredients.length === 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Pantry Link Selector */}
                      {pantryItems.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                          <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <select
                            value={ing.pantryIngredientId ?? ''}
                            onChange={e => {
                              const val = e.target.value
                              setIngredient(idx, 'pantryIngredientId', val)
                              if (val) {
                                const pi = pantryItems.find(p => p.id === val)
                                if (pi) {
                                  setIngredient(idx, 'unit', pi.unit)
                                  setIngredient(idx, 'costPerUnit', pi.costPerUnit)
                                }
                              }
                            }}
                            className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <option value="">— Link to physical pantry stock —</option>
                            {pantryItems.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.currentStock} {p.unit} in stock)
                              </option>
                            ))}
                          </select>

                          {linkedItem && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Linked</span>
                              {unitMismatch && canConvert && (
                                <span className="text-[10.5px] text-blue-600">
                                  ({linkedItem.unit}→{ing.unit} converted)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setIngredient(idx, 'pantryIngredientId', '')}
                                className="text-slate-400 hover:text-rose-600 ml-1"
                              >
                                <Unlink className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pricing and Profit Margins */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target Pricing & Margins
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Selling Price / {form.yieldUnit || 'unit'} ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.sellingPrice}
                    onChange={e => setField('sellingPrice', e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                  {sellingPriceNum !== null && sellingPriceNum > 0 && sellingPriceNum < costPerUnit && (
                    <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5" /> Below Cost (${costPerUnit.toFixed(2)})
                    </p>
                  )}
                </div>

                <div className="flex flex-col justify-center space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Batch Cost:</span>
                    <strong className="text-slate-900 dark:text-white">${totalCost.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unit Cost:</span>
                    <strong className="text-amber-600 dark:text-amber-400">${costPerUnit.toFixed(3)}</strong>
                  </div>
                  {margin !== null && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-bold">Estimated Margin:</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Formula Notes */}
            <div>
              <label className={labelClass}>{t('bakeryNotesLabel') || 'Baking Steps & Temperature Notes'}</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Proofing times, oven steam settings, shelf storage…"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-4 flex items-center justify-between">
            {errors.submit && (
              <div className="flex items-center gap-2 text-xs text-rose-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{errors.submit}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('bakeryCancelBtn') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{form.id ? t('bakerySaveChanges') || 'Save Formula' : t('bakeryCreateRecipe') || 'Create Recipe'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}