import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2, Link2, AlertTriangle, CheckCircle2, Package, Unlink } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

type Ingredient = {
  name: string
  quantity: number
  unit: string
  costPerUnit: number
  pantryIngredientId?: string
}

type RecipeFormData = {
  id?: string
  name: string
  description: string
  outputProductId: string
  yieldQty: number
  yieldUnit: string
  sellingPrice: string | number
  expiryDays: string | number
  notes: string
  ingredients: Ingredient[]
}

const emptyIngredient = (): Ingredient => ({
  name: '', quantity: 1, unit: 'g', costPerUnit: 0, pantryIngredientId: ''
})

const defaultForm = (): RecipeFormData => ({
  name: '', description: '', outputProductId: '', yieldQty: 1,
  yieldUnit: 'pcs', sellingPrice: '', expiryDays: '', notes: '', ingredients: [emptyIngredient()]
})

interface Props {
  open: boolean
  recipe: any | null
  onClose: () => void
  onSaved: () => void
}

export default function RecipeFormModal({ open, recipe, onClose, onSaved }: Props) {
  const [form, setForm]       = useState<RecipeFormData>(defaultForm())
  const [products, setProducts] = useState<any[]>([])
  const [pantryItems, setPantryItems] = useState<any[]>([])
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const { t } = useLanguage()

  /* Populate from existing recipe when editing */
  useEffect(() => {
    if (!open) return
    if (recipe) {
      setForm({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description ?? '',
        outputProductId: recipe.outputProductId ?? '',
        yieldQty: recipe.yieldQty,
        yieldUnit: recipe.yieldUnit,
        sellingPrice: recipe.sellingPrice ?? '',
        expiryDays: recipe.expiryDays ?? '',
        notes: recipe.notes ?? '',
        ingredients: recipe.ingredients.length
          ? recipe.ingredients.map((i: any) => ({
              name: i.name, quantity: i.quantity, unit: i.unit, costPerUnit: i.costPerUnit,
              pantryIngredientId: i.pantryIngredientId ?? ''
            }))
          : [emptyIngredient()]
      })
    } else {
      setForm(defaultForm())
    }
    setErrors({})
  }, [open, recipe])

  /* Load products for the "output product" dropdown */
  useEffect(() => {
    if (!open) return
    ;(window as any).api.products.getAll({ includeImages: false })
      .then((data: any) => setProducts(Array.isArray(data) ? data : (data?.products ?? [])))
      .catch(() => setProducts([]))
    ;window.api.bakery.getPantry()
      .then((items: any[]) => setPantryItems(items ?? []))
      .catch(() => setPantryItems([]))
  }, [open])

  const setField = (key: keyof RecipeFormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }))

  const setIngredient = (idx: number, key: keyof Ingredient, value: any) =>
    setForm(f => {
      const ings = [...f.ingredients]
      ings[idx] = { ...ings[idx], [key]: value }
      return { ...f, ingredients: ings }
    })

  const addIngredient    = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }))
  const removeIngredient = (idx: number) =>
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('bakeryNameRequired')
    if (form.yieldQty <= 0) e.yieldQty = t('bakeryYieldRequired')
    if (form.ingredients.some(i => !i.name.trim())) e.ingredients = t('bakeryIngredientNameRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        outputProductId: form.outputProductId || undefined,
        sellingPrice: form.sellingPrice !== '' ? Number(form.sellingPrice) : undefined,
        expiryDays: form.expiryDays !== '' ? Number(form.expiryDays) : undefined,
        ingredients: form.ingredients.map(i => ({
          ...i,
          quantity: Number(i.quantity),
          costPerUnit: Number(i.costPerUnit)
        }))
      }
      if (form.id) {
        await window.api.bakery.updateRecipe(payload)
      } else {
        await window.api.bakery.createRecipe(payload)
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setErrors({ submit: e.message ?? t('bakerySaveFailed') })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const totalCost = form.ingredients.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.costPerUnit), 0
  )
  const costPerUnit = form.yieldQty > 0 ? totalCost / form.yieldQty : 0
  const sellingPriceNum = form.sellingPrice !== '' ? Number(form.sellingPrice) : null
  const margin = sellingPriceNum && sellingPriceNum > 0
    ? ((sellingPriceNum - costPerUnit) / sellingPriceNum) * 100
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {form.id ? t('bakeryEditRecipe') : t('bakeryNewRecipe')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('bakeryRecipeName')} <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="e.g. Sourdough Bread"
                className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.name ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('bakeryDescription')}</label>
              <input
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder={t('bakeryDescriptionPlaceholder')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('bakeryYield')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0.01" step="0.01"
                value={form.yieldQty}
                onChange={e => setField('yieldQty', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.yieldQty ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.yieldQty && <p className="text-xs text-red-500 mt-1">{errors.yieldQty}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('bakeryYieldUnit')}</label>
              <select
                value={form.yieldUnit}
                onChange={e => setField('yieldUnit', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {['pcs', 'loaves', 'kg', 'g', 'dozen', 'trays', 'units'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('bakeryExpiryDays')}</label>
              <input
                type="number" min="1" step="1"
                placeholder="e.g. 3"
                value={form.expiryDays}
                onChange={e => setField('expiryDays', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-xs text-slate-400 mt-1">{t('bakeryExpiryDaysHint')}</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('bakeryOutputProduct')}
              </label>
              <select
                value={form.outputProductId}
                onChange={e => setField('outputProductId', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">{t('bakeryOutputProductNone')}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {t('bakeryOutputProductHint')}
              </p>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('bakeryIngredients')}</h3>
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> {t('bakeryAddIngredient')}
              </button>
            </div>
            {errors.ingredients && (
              <p className="text-xs text-red-500 mb-2">{errors.ingredients}</p>
            )}

            <div className="space-y-3">
              {form.ingredients.map((ing, idx) => {
                const linkedItem = pantryItems.find(p => p.id === ing.pantryIngredientId)
                const autoMatch = !ing.pantryIngredientId
                  ? pantryItems.find(p => p.name.toLowerCase() === ing.name.toLowerCase())
                  : null
                const unitMismatch = linkedItem && linkedItem.unit !== ing.unit
                const unitMatch   = linkedItem && linkedItem.unit === ing.unit

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 space-y-2.5 transition-colors ${
                      linkedItem
                        ? unitMismatch
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                          : 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/30'
                    }`}
                  >
                    {/* Row 1: name / qty / unit / cost / delete */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Ingredient *</label>
                        <input
                          value={ing.name}
                          onChange={e => {
                            setIngredient(idx, 'name', e.target.value)
                            const match = pantryItems.find(p => p.name.toLowerCase() === e.target.value.toLowerCase())
                            if (match && !ing.pantryIngredientId) {
                              setIngredient(idx, 'pantryIngredientId', match.id)
                              // Auto-fill unit from pantry item
                              setIngredient(idx, 'unit', match.unit)
                            }
                          }}
                          placeholder="e.g. Flour"
                          className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Qty *</label>
                        <input
                          type="number" min="0" step="any"
                          value={ing.quantity}
                          onChange={e => setIngredient(idx, 'quantity', e.target.value)}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm text-right dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Unit</label>
                        <select
                          value={ing.unit}
                          onChange={e => setIngredient(idx, 'unit', e.target.value)}
                          className={`w-full rounded-md border px-2 py-1.5 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                            unitMismatch
                              ? 'border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {['g', 'kg', 'ml', 'L', 'oz', 'lb', 'pcs', 'tsp', 'tbsp', 'cup'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Cost / {ing.unit || 'unit'}</label>
                        <input
                          type="number" min="0" step="any"
                          value={ing.costPerUnit}
                          onChange={e => setIngredient(idx, 'costPerUnit', e.target.value)}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm text-right dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="col-span-1 pt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeIngredient(idx)}
                          disabled={form.ingredients.length === 1}
                          className="text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Pantry link */}
                    {pantryItems.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link2 className={`h-3.5 w-3.5 ${
                            linkedItem ? (unitMismatch ? 'text-amber-500' : 'text-green-500') : 'text-slate-300 dark:text-slate-600'
                          }`} />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pantry link</span>
                        </div>

                        <select
                          value={ing.pantryIngredientId ?? ''}
                          onChange={e => {
                            const val = e.target.value
                            setIngredient(idx, 'pantryIngredientId', val)
                            if (val) {
                              const pi = pantryItems.find((p: any) => p.id === val)
                              if (pi) setIngredient(idx, 'unit', pi.unit)
                            }
                          }}
                          className={`flex-1 min-w-0 text-xs rounded-lg border px-2 py-1.5 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                            linkedItem
                              ? unitMismatch
                                ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                                : 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <option value="">— not linked to pantry —</option>
                          {pantryItems.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name} · {p.currentStock} {p.unit} in stock
                            </option>
                          ))}
                        </select>

                        {/* Auto-match suggestion */}
                        {autoMatch && (
                          <button
                            type="button"
                            onClick={() => {
                              setIngredient(idx, 'pantryIngredientId', autoMatch.id)
                              setIngredient(idx, 'unit', autoMatch.unit)
                            }}
                            className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-1 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors font-medium shrink-0"
                          >
                            <Package className="h-3 w-3" />
                            Link "{autoMatch.name}"
                          </button>
                        )}

                        {/* Linked status badge */}
                        {linkedItem && (
                          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border shrink-0 ${
                            unitMismatch
                              ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                              : 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                          }`}>
                            {unitMismatch
                              ? <AlertTriangle className="h-3 w-3 shrink-0" />
                              : <CheckCircle2 className="h-3 w-3 shrink-0" />
                            }
                            <span className="font-semibold">
                              {linkedItem.currentStock} {linkedItem.unit} in stock
                            </span>
                            {unitMismatch && (
                              <span className="text-amber-700 dark:text-amber-400">
                                — pantry uses <strong>{linkedItem.unit}</strong>, recipe uses <strong>{ing.unit}</strong>
                              </span>
                            )}
                            {unitMatch && (
                              <span className="opacity-60">— units match ✓</span>
                            )}
                          </div>
                        )}

                        {/* Unlink button */}
                        {linkedItem && (
                          <button
                            type="button"
                            onClick={() => setIngredient(idx, 'pantryIngredientId', '')}
                            className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                            title="Remove pantry link"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cost preview */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Pricing</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Selling Price / {form.yieldUnit || 'unit'}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={e => setField('sellingPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-6 pr-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {sellingPriceNum !== null && sellingPriceNum > 0 && sellingPriceNum < costPerUnit && (
                  <p className="text-xs text-red-500 mt-1">⚠ Below cost (${costPerUnit.toFixed(2)})</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Batch cost</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Cost / {form.yieldUnit || 'unit'}</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">${costPerUnit.toFixed(3)}</span>
                </div>
                {margin !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Margin</span>
                    <span className={`font-bold ${
                      margin < 0   ? 'text-red-600 dark:text-red-400' :
                      margin < 20  ? 'text-orange-600 dark:text-orange-400' :
                      margin < 40  ? 'text-amber-600 dark:text-amber-400' :
                                    'text-emerald-600 dark:text-emerald-400'
                    }`}>{margin.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('bakeryNotesLabel')}</label>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={2}
              placeholder={t('bakeryNotesPlaceholder')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('bakeryCancelBtn')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {form.id ? t('bakerySaveChanges') : t('bakeryCreateRecipe')}
          </button>
        </div>
      </div>
    </div>
  )
}
