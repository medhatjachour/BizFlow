import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Loader2, Link2, AlertTriangle, CheckCircle2, Unlink, Package, BookOpen, Layers, DollarSign } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

const YIELD_UNITS = ['pcs', 'loaves', 'kg', 'g', 'dozen', 'trays', 'units', 'portions', 'boxes', 'bags', 'slices', 'rolls', 'buns', 'sheets', 'cakes']
const INGREDIENT_UNITS = ['g', 'kg', 'ml', 'L', 'oz', 'lb', 'pcs', 'tsp', 'tbsp', 'cup', 'bunch', 'clove', 'pinch', 'stalk', 'sheet', 'slice']

// ─── Unit conversion helpers ──────────────────────────────────────────────────
const WEIGHT_TO_G: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 }
const VOLUME_TO_ML: Record<string, number> = { ml: 1, L: 1000, tsp: 4.92892, tbsp: 14.7868, cup: 236.588 }

/**
 * Convert a cost-per-unit from one unit to another.
 * e.g. convertCost(2, 'kg', 'g') → 0.002   ($2/kg = $0.002/g)
 * Returns null if units are incompatible (e.g. kg → ml).
 */
function convertCost(cost: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return cost
  if (fromUnit in WEIGHT_TO_G && toUnit in WEIGHT_TO_G)
    return cost * WEIGHT_TO_G[toUnit] / WEIGHT_TO_G[fromUnit]
  if (fromUnit in VOLUME_TO_ML && toUnit in VOLUME_TO_ML)
    return cost * VOLUME_TO_ML[toUnit] / VOLUME_TO_ML[fromUnit]
  return null
}

const FIELD_CLS = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors'
const LABEL_CLS = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide'

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
  name: '', description: '', yieldQty: 1,
  yieldUnit: 'pcs', sellingPrice: '', expiryDays: '', notes: '', ingredients: [emptyIngredient()]
})

interface Props {
  open: boolean
  recipe: any | null
  onClose: () => void
  onSaved: () => void
}

export default function RecipeFormModal({ open, recipe, onClose, onSaved }: Props) {
  const [form, setForm]             = useState<RecipeFormData>(defaultForm())
  const [pantryItems, setPantryItems] = useState<any[]>([])
  const [saving, setSaving]         = useState(false)
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [useCustomYieldUnit, setUseCustomYieldUnit] = useState(false)
  const customYieldRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  /* Populate from existing recipe when editing */
  useEffect(() => {
    if (!open) return
    if (recipe) {
      const isCustomUnit = !!recipe.yieldUnit && !YIELD_UNITS.includes(recipe.yieldUnit)
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
          ? recipe.ingredients.map((i: any) => ({
              name: i.name, quantity: i.quantity, unit: i.unit, costPerUnit: i.costPerUnit,
              pantryIngredientId: i.pantryIngredientId ?? ''
            }))
          : [emptyIngredient()]
      })
    } else {
      setUseCustomYieldUnit(false)
      setForm(defaultForm())
    }
    setErrors({})
  }, [open, recipe])

  /* Load pantry items for ingredient linking */
  useEffect(() => {
    if (!open) return
    window.api.bakery.getPantry()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl flex flex-col max-h-[92vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {form.id ? t('bakeryEditRecipe') : t('bakeryNewRecipe')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{form.id ? 'Update recipe details and ingredients' : 'Define ingredients, yield, and pricing'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className={LABEL_CLS}>
                {t('bakeryRecipeName')} <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="e.g. Sourdough Bread"
                className={`${FIELD_CLS} ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="sm:col-span-3">
              <label className={LABEL_CLS}>{t('bakeryDescription')}</label>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder={t('bakeryDescriptionPlaceholder')}
                rows={2}
                className={`${FIELD_CLS} resize-none`}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>
                {t('bakeryYield')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0.01" step="0.01"
                value={form.yieldQty}
                onChange={e => setField('yieldQty', e.target.value)}
                className={`${FIELD_CLS} ${errors.yieldQty ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.yieldQty && <p className="text-xs text-red-500 mt-1">{errors.yieldQty}</p>}
            </div>

            <div>
              <label className={LABEL_CLS}>{t('bakeryYieldUnit')}</label>
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
                  className={FIELD_CLS}
                >
                  {YIELD_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="__custom__">✏ Custom unit…</option>
                </select>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    ref={customYieldRef}
                    value={form.yieldUnit}
                    onChange={e => setField('yieldUnit', e.target.value)}
                    placeholder="e.g. baguettes, muffins…"
                    className="flex-1 rounded-xl border border-[color:var(--accent)] px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { setUseCustomYieldUnit(false); setField('yieldUnit', 'pcs') }}
                    title="Switch back to preset units"
                    className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs transition-colors"
                  >
                    ↩
                  </button>
                </div>
              )}
              {useCustomYieldUnit && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Typing a custom unit — click ↩ to switch back to presets</p>
              )}
            </div>

            <div>
              <label className={LABEL_CLS}>{t('bakeryExpiryDays')}</label>
              <input
                type="number" min="1" step="1"
                placeholder="e.g. 3"
                value={form.expiryDays}
                onChange={e => setField('expiryDays', e.target.value)}
                className={FIELD_CLS}
              />
              <p className="text-xs text-slate-400 mt-1">{t('bakeryExpiryDaysHint')}</p>
            </div>

            {/* Live yield preview */}
            {form.yieldQty > 0 && form.yieldUnit && (
              <div className="sm:col-span-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  ✓ Makes {form.yieldQty} {form.yieldUnit} per batch
                </span>
                {costPerUnit > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs">
                    Cost: <strong>${costPerUnit.toFixed(3)} / {form.yieldUnit}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Hidden datalists for unit autocomplete */}
          <datalist id="ingredient-units">
            {INGREDIENT_UNITS.map(u => <option key={u} value={u} />)}
          </datalist>
          <datalist id="pantry-ingredient-names">
            {pantryItems.map(p => <option key={p.id} value={p.name} />)}
          </datalist>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t('bakeryIngredients')}</span>
                <span className="text-xs text-slate-400 font-normal">({form.ingredients.length})</span>
              </div>
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
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
                const unitMismatch  = linkedItem && linkedItem.unit !== ing.unit
                const unitMatch    = linkedItem && linkedItem.unit === ing.unit
                const canConvert   = unitMismatch ? convertCost(linkedItem.costPerUnit, linkedItem.unit, ing.unit) !== null : false

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 space-y-2.5 transition-colors ${
                      linkedItem
                        ? unitMismatch
                          ? canConvert
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                          : 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/30'
                    }`}
                  >
                    {/* Row 1: name / qty / unit / cost / subtotal / delete */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Ingredient *</label>
                        <input
                          list="pantry-ingredient-names"
                          value={ing.name}
                          onChange={e => {
                            setIngredient(idx, 'name', e.target.value)
                            const match = pantryItems.find(p => p.name.toLowerCase() === e.target.value.toLowerCase())
                            if (match && !ing.pantryIngredientId) {
                              setIngredient(idx, 'pantryIngredientId', match.id)
                              setIngredient(idx, 'unit', match.unit)
                              setIngredient(idx, 'costPerUnit', match.costPerUnit)
                            }
                          }}
                          placeholder="e.g. Flour"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Qty *</label>
                        <input
                          type="number" min="0" step="any"
                          value={ing.quantity}
                          onChange={e => setIngredient(idx, 'quantity', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-sm text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Unit</label>
                        <input
                          list="ingredient-units"
                          value={ing.unit}
                          onChange={e => {
                            const newUnit = e.target.value
                            setIngredient(idx, 'unit', newUnit)
                            // If linked to pantry, auto-convert cost to match new unit
                            if (ing.pantryIngredientId) {
                              const pi = pantryItems.find(p => p.id === ing.pantryIngredientId)
                              if (pi) {
                                const converted = convertCost(pi.costPerUnit, pi.unit, newUnit)
                                if (converted !== null) setIngredient(idx, 'costPerUnit', converted)
                              }
                            }
                          }}
                          placeholder="g, kg…"
                          className={`w-full rounded-xl border px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-colors ${
                            unitMismatch
                              ? 'border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                              : 'border-slate-200 dark:border-slate-600'
                          }`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Cost / {ing.unit || 'unit'}</label>
                        <input
                          type="number" min="0" step="any"
                          value={ing.costPerUnit}
                          onChange={e => setIngredient(idx, 'costPerUnit', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-sm text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Subtotal</label>
                        <div className="w-full rounded-xl border border-slate-100 dark:border-slate-600 px-2 py-1.5 text-sm text-right bg-slate-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-semibold select-none">
                          ${(Number(ing.quantity) * Number(ing.costPerUnit)).toFixed(3)}
                        </div>
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
                              if (pi) {
                                setIngredient(idx, 'unit', pi.unit)
                                setIngredient(idx, 'costPerUnit', pi.costPerUnit)
                              }
                            }
                          }}
                          className={`flex-1 min-w-0 text-xs rounded-xl border px-2 py-1.5 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-colors ${
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
                              setIngredient(idx, 'costPerUnit', autoMatch.costPerUnit)
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
                              ? canConvert
                                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                              : 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300'
                          }`}>
                            {unitMismatch
                              ? canConvert
                                ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                                : <AlertTriangle className="h-3 w-3 shrink-0" />
                              : <CheckCircle2 className="h-3 w-3 shrink-0" />
                            }
                            <span className="font-semibold">
                              {linkedItem.currentStock} {linkedItem.unit} in stock
                            </span>
                            {unitMismatch && canConvert && (
                              <span className="text-blue-700 dark:text-blue-400">
                                — cost auto-converted <strong>{linkedItem.unit}→{ing.unit}</strong>
                              </span>
                            )}
                            {unitMismatch && !canConvert && (
                              <span className="text-amber-700 dark:text-amber-400">
                                — can't convert <strong>{linkedItem.unit}</strong>↔<strong>{ing.unit}</strong>, enter cost manually
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

          {/* Pricing */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-700/80">
              <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Pricing</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>
                  Selling Price / {form.yieldUnit || 'unit'}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="float"
                    value={form.sellingPrice}
                    onChange={e => setField('sellingPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 pl-6 pr-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors"
                  />
                </div>
                {sellingPriceNum !== null && sellingPriceNum > 0 && sellingPriceNum < costPerUnit && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Below cost (${costPerUnit.toFixed(2)})
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Batch cost</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Cost / {form.yieldUnit || 'unit'}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">${costPerUnit.toFixed(3)}</span>
                </div>
                {margin !== null && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Margin</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                      margin < 0   ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      margin < 20  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      margin < 40  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    }`}>{margin.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL_CLS}>{t('bakeryNotesLabel')}</label>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={2}
              placeholder={t('bakeryNotesPlaceholder')}
              className={`${FIELD_CLS} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex-1">
            {errors.submit && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {errors.submit}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('bakeryCancelBtn')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.id ? t('bakerySaveChanges') : t('bakeryCreateRecipe')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
