// src/pages/menu/components/RecipeCostBreakdownDrawer.tsx
//
// Read-only view of a dish's recipe (bill of materials): what it costs per
// portion, which raw material is the bottleneck, and what each line contributes.
// The "edit" button hands off to `RecipeEditorModal`, which is the only place a
// recipe can be authored.
import React from 'react'
import { X, Utensils, Package, AlertTriangle, Edit2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { MenuItemData } from '../types'
import { analyzeDishFinancials, calculateAvailablePortions, formatCurrency } from '../utils'
import { computeLineCost } from '../costing'
import { sounds } from '../../utils/sound'

interface Props {
  item: MenuItemData | null
  onClose: () => void
  onOpenEditRecipe: (item: MenuItemData) => void
}

export const RecipeCostBreakdownDrawer: React.FC<Props> = ({ item, onClose, onOpenEditRecipe }) => {
  const { t } = useLanguage()

  if (!item) return null

  const financials = analyzeDishFinancials(item.price, item.cost)
  const { availablePortions, bottleneckIngredient } = calculateAvailablePortions(item)
  const recipe = item.recipe
  const recipeLines = recipe?.ingredients || []
  const yieldCount = recipe?.yieldCount || 1

  // Priced per portion, from the same unit-aware maths the main process uses to
  // write `menuItem.cost`.
  const lines = recipeLines.map((line) => {
    const ingredientUnit = line.ingredient?.unit || line.unit
    const batchLineCost = computeLineCost(
      line.quantity,
      line.unit,
      ingredientUnit,
      line.ingredient?.costPerUnit || 0
    )
    return {
      key: line.id || `${line.ingredientId}-${line.unit}`,
      name: line.ingredient?.name || t('restRecipePickIngredient'),
      quantity: line.quantity,
      unit: line.unit,
      stock: line.ingredient?.currentStock ?? 0,
      stockUnit: ingredientUnit,
      portionCost: batchLineCost / (yieldCount > 0 ? yieldCount : 1)
    }
  })

  const batchCost = lines.reduce((sum, line) => sum + line.portionCost * yieldCount, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full sm:max-w-md h-full bg-white dark:bg-slate-900 border-s-0 sm:border-s border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 select-none">
        {/* ─── Drawer Header ─────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              {t('restMenuCostBreakdownTitle')}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {item.name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  financials.rating === 'high'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : financials.rating === 'medium'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {t('restMenuFoodCostPercent', { percent: financials.costPercent })}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {item.category} • {item.station}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('restRecipeCancel')}
            className="p-2 -m-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Financial Telemetry Strip ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Margin Summary Grid */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:text-center text-xs">
            {[
              {
                key: 'price',
                label: t('restMenuSellingPrice'),
                value: formatCurrency(item.price),
                tone: 'text-slate-900 dark:text-white'
              },
              {
                key: 'cost',
                label: t('restMenuIngredientCost'),
                value: formatCurrency(item.cost),
                tone: 'text-emerald-600'
              },
              {
                key: 'profit',
                label: t('restMenuGrossProfit'),
                value: `+${formatCurrency(financials.profit)}`,
                tone: 'text-amber-600'
              }
            ].map((metric) => (
              <div key={metric.key} className="flex items-center justify-between gap-2 sm:block">
                <span className="text-[10px] font-black uppercase text-slate-400 sm:block">
                  {metric.label}
                </span>
                <span className={`text-sm sm:text-base font-black ${metric.tone}`}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>

          {/* Live Inventory Portions Bottleneck Card */}
          {availablePortions !== null ? (
            <div
              className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                availablePortions === 0
                  ? 'bg-rose-50/60 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
                  : availablePortions <= 5
                    ? 'bg-amber-50/60 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black block">
                    {availablePortions === 0
                      ? t('restMenuPortionsOut')
                      : t('restMenuPortionsAvailable', { count: availablePortions })}
                  </span>
                  {bottleneckIngredient && (
                    <span className="text-[10px] opacity-75 block truncate">
                      {t('restMenuBottleneck', { name: bottleneckIngredient })}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xl font-black shrink-0">{availablePortions}</span>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
              <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                {t('restMenuNoRecipeTitle')}
              </h4>
              <p className="text-[11px] text-slate-400">{t('restMenuNoRecipeBody')}</p>
            </div>
          )}

          {/* Bill of Materials (BOM) Ingredient List */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {t('restMenuIngredientsCount', { count: lines.length })}
              </h4>
              {recipe && (
                <span className="text-[10px] font-bold text-slate-400">
                  {t('restMenuBatchYield', { count: recipe.yieldCount })}
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-2xs">
              {lines.map((line) => {
                const costShare =
                  batchCost > 0
                    ? Math.round(((line.portionCost * yieldCount) / batchCost) * 100)
                    : 0

                return (
                  <div
                    key={line.key}
                    className="p-3.5 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-black text-slate-900 dark:text-white block truncate">
                        {line.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {line.quantity} {line.unit} •{' '}
                        {t('restMenuStockRemaining', {
                          stock: line.stock,
                          unit: line.stockUnit
                        })}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 dark:text-white block">
                        {t('restMenuLineCost', { cost: formatCurrency(line.portionCost) })}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {costShare}% {t('restMenuIngredientCost')}
                      </span>
                    </div>
                  </div>
                )
              })}

              {lines.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  {t('restMenuNoRecipeTitle')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Drawer Action Footer ─────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => {
              sounds.playBump()
              onOpenEditRecipe(item)
            }}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            {recipe ? <Edit2 className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
            <span>{recipe ? t('restMenuEditRecipe') : t('restMenuAddRecipe')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
