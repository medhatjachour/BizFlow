// src/pages/menu/components/RecipeEditorModal.tsx
//
// Authors the recipe (bill of materials) for one dish. The backend re-derives the
// dish food cost from these lines on save, so this modal only has to collect the
// quantities and show a faithful preview via `pages/menu/costing.ts`.
import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Plus, Trash2, Utensils, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { MenuItemData, RecipeLineData, RestaurantIngredientData } from '../types'
import { RECIPE_UNITS, computeDishCost } from '../costing'
import { formatCurrency } from '../utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  item: MenuItemData | null
  ingredients: RestaurantIngredientData[]
  onSave: (
    menuItemId: string,
    payload: {
      yieldCount: number
      prepNotes: string
      ingredients: Array<{ ingredientId: string; quantity: number; unit: string; notes?: string }>
    }
  ) => Promise<boolean>
  onDelete: (recipeId: string) => Promise<boolean>
}

const emptyLine = (unit: string): RecipeLineData => ({
  ingredientId: '',
  quantity: '',
  unit,
  notes: ''
})

export const RecipeEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
  ingredients,
  onSave,
  onDelete
}) => {
  const { t } = useLanguage()
  const [yieldCount, setYieldCount] = useState('1')
  const [prepNotes, setPrepNotes] = useState('')
  const [lines, setLines] = useState<RecipeLineData[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const defaultUnit = ingredients[0]?.unit || 'g'

  // Re-seed the form whenever a different dish is opened.
  useEffect(() => {
    if (!isOpen || !item) return
    const recipe = item.recipe
    setYieldCount(String(recipe?.yieldCount || 1))
    setPrepNotes(recipe?.prepNotes || '')
    setLines(
      recipe && recipe.ingredients.length > 0
        ? recipe.ingredients.map((ri) => ({
            ingredientId: ri.ingredientId,
            quantity: String(ri.quantity ?? ''),
            unit: ri.unit,
            notes: ri.notes || ''
          }))
        : [emptyLine(defaultUnit)]
    )
    setError('')
    setSaving(false)
  }, [isOpen, item, defaultUnit])

  const ingredientIndex = useMemo(() => {
    const map: Record<string, RestaurantIngredientData> = {}
    for (const ing of ingredients) map[ing.id] = ing
    return map
  }, [ingredients])

  const preview = useMemo(
    () => computeDishCost(lines, Number(yieldCount), ingredientIndex),
    [lines, yieldCount, ingredientIndex]
  )

  if (!isOpen || !item) return null

  const patchLine = (index: number, patch: Partial<RecipeLineData>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const handlePickIngredient = (index: number, ingredientId: string) => {
    // Switching ingredient usually means a different unit family, so adopt the
    // ingredient's own unit to keep the line convertible.
    const unit = ingredientIndex[ingredientId]?.unit
    patchLine(index, { ingredientId, unit: unit || lines[index]?.unit || defaultUnit })
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine(defaultUnit)])

  const removeLine = (index: number) =>
    setLines((prev) =>
      prev.length === 1 ? [emptyLine(defaultUnit)] : prev.filter((_, i) => i !== index)
    )

  const usableLines = lines.filter((line) => line.ingredientId && Number(line.quantity) > 0)

  const handleSave = async () => {
    if (usableLines.length === 0) {
      setError(t('restRecipeEmpty'))
      return
    }

    setSaving(true)
    setError('')
    const ok = await onSave(item.id, {
      yieldCount: Math.max(1, Number(yieldCount) || 1),
      prepNotes: prepNotes.trim(),
      ingredients: usableLines.map((line) => ({
        ingredientId: line.ingredientId,
        quantity: Number(line.quantity),
        unit: line.unit,
        notes: line.notes.trim() || undefined
      }))
    })
    setSaving(false)

    if (ok) onClose()
    else setError(t('restRecipeSaveFailed'))
  }

  const handleDelete = async () => {
    if (!item.recipe?.id) return
    if (!confirm(t('restRecipeDeleteConfirm'))) return

    setSaving(true)
    setError('')
    const ok = await onDelete(item.recipe.id)
    setSaving(false)

    if (ok) onClose()
    else setError(t('restRecipeSaveFailed'))
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none'

  const costPercent = item.price > 0 ? Math.round((preview.portionCost / item.price) * 100) : 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        {/* ─── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">{t('restRecipeTitle')}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('restRecipeSubtitle', { name: item.name })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('restRecipeCancel')}
            className="p-2 -m-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {ingredients.length === 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('restRecipeNoIngredients')}</span>
            </div>
          )}

          {/* Batch yield / prep notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t('restRecipeYield')}
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={yieldCount}
                onChange={(e) => setYieldCount(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {t('restRecipeYieldHint')}
              </span>
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {t('restRecipePrepNotes')}
              </span>
              <input
                type="text"
                value={prepNotes}
                placeholder={t('restRecipePrepNotesPlaceholder')}
                onChange={(e) => setPrepNotes(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          {/* Recipe lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                {t('restRecipeLineCount', { count: lines.length })}
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="text-[11px] font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('restRecipeAddLine')}
              </button>
            </div>

            {lines.map((line, index) => {
              const selected = ingredientIndex[line.ingredientId]
              // A stale unit (e.g. legacy data) must stay selectable so saving
              // does not silently rewrite it.
              const unitOptions = RECIPE_UNITS.includes(line.unit)
                ? RECIPE_UNITS
                : [line.unit, ...RECIPE_UNITS]

              return (
                <div
                  key={index}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <select
                      value={line.ingredientId}
                      onChange={(e) => handlePickIngredient(index, e.target.value)}
                      className={`${inputClass} flex-1 min-w-0`}
                    >
                      <option value="">{t('restRecipePickIngredient')}</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      aria-label={t('restRecipeRemoveLine')}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {t('restRecipeQty')}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={line.quantity}
                        onChange={(e) => patchLine(index, { quantity: e.target.value })}
                        className={`mt-0.5 ${inputClass}`}
                      />
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {t('restRecipeUnit')}
                      </span>
                      <select
                        value={line.unit}
                        onChange={(e) => patchLine(index, { unit: e.target.value })}
                        className={`mt-0.5 ${inputClass}`}
                      >
                        {unitOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block col-span-2">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {t('restRecipeLineNotes')}
                      </span>
                      <input
                        type="text"
                        value={line.notes}
                        placeholder={t('restRecipeLineNotesPlaceholder')}
                        onChange={(e) => patchLine(index, { notes: e.target.value })}
                        className={`mt-0.5 ${inputClass}`}
                      />
                    </label>
                  </div>

                  {selected && (
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {t('restMenuStockRemaining', {
                        stock: selected.currentStock,
                        unit: selected.unit
                      })}
                      {' · '}
                      {t('restRecipeUnitCost', {
                        cost: formatCurrency(selected.costPerUnit),
                        unit: selected.unit
                      })}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Live cost preview */}
          <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 grid grid-cols-2 gap-2 text-center">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                {t('restRecipeBatchCost')}
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(preview.batchCost)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                {t('restRecipePortionCost')}
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(preview.portionCost)}
              </span>
            </div>
            <div className="col-span-2 text-[10px] font-bold text-slate-400">
              {t('restMenuSellingPrice')}: {formatCurrency(item.price)} •{' '}
              {t('restMenuFoodCostPercent', { percent: costPercent })}
            </div>
          </div>

          {preview.incomplete && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('restRecipeIncomplete')}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 flex flex-col sm:flex-row gap-2 shrink-0">
          {item.recipe?.id && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="py-3 px-4 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-black hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 transition-colors"
            >
              {t('restRecipeDelete')}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-black hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors sm:ms-auto"
          >
            {t('restRecipeCancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 disabled:opacity-60 active:scale-98 transition-all"
          >
            {saving ? t('restRecipeSaving') : t('restRecipeSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
