import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, BookOpen, Calculator, FileText
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import RecipeFormModal from './RecipeFormModal'
import ScalingCalculatorModal from './ScalingCalculatorModal'
import RecipeCardModal from './RecipeCardModal'

type Ingredient = {
  id?: string
  name: string
  quantity: number
  unit: string
  costPerUnit: number
}

type Recipe = {
  id: string
  name: string
  description?: string
  yieldQty: number
  yieldUnit: string
  sellingPrice?: number | null
  notes?: string
  outputProductId?: string
  outputProduct?: { id: string; name: string; basePrice: number }
  ingredients: Ingredient[]
  _count?: { productionBatches: number }
}

export default function RecipesTab() {
  const [recipes, setRecipes]         = useState<Recipe[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editRecipe, setEditRecipe]   = useState<Recipe | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [scalingRecipe, setScalingRecipe] = useState<Recipe | null>(null)
  const [cardRecipe, setCardRecipe]   = useState<Recipe | null>(null)
  const { t } = useLanguage()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.bakery.getRecipes()
      setRecipes(data ?? [])
    } catch (e: any) {
      setError(e.message ?? t('bakeryLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm(t('bakeryArchiveConfirm'))) return
    setDeletingId(id)
    try {
      await window.api.bakery.deleteRecipe(id)
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  const ingredientCost = (recipe: Recipe) =>
    recipe.ingredients.reduce((s, i) => s + i.quantity * i.costPerUnit, 0)

  const costPerUnit = (recipe: Recipe) =>
    recipe.yieldQty > 0 ? ingredientCost(recipe) / recipe.yieldQty : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t('bakeryLoadingRecipes')}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => { setEditRecipe(null); setModalOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('bakeryNewRecipe')}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {recipes.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <BookOpen className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">{t('bakeryNoRecipes')}</p>
          <p className="text-xs mt-1">{t('bakeryNoRecipesDesc')}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {recipes.map(recipe => {
          const isOpen = expandedId === recipe.id
          const batchCost = ingredientCost(recipe)
          const unitCost  = costPerUnit(recipe)
          const sellPrice = recipe.sellingPrice ?? recipe.outputProduct?.basePrice ?? null
          const margin = sellPrice && sellPrice > 0 && unitCost > 0
            ? ((sellPrice - unitCost) / sellPrice) * 100
            : null

          return (
            <div
              key={recipe.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => setExpandedId(isOpen ? null : recipe.id)}
                >
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-white">{recipe.name}</span>
                    {recipe.description && (
                      <span className="ml-2 text-xs text-slate-400">{recipe.description}</span>
                    )}
                  </div>
                </button>

                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Yield</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {recipe.yieldQty} {recipe.yieldUnit}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">{t('bakeryCostPer')} {recipe.yieldUnit}</p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      ${unitCost.toFixed(2)}
                    </p>
                  </div>
                  {sellPrice !== null && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Sell price</p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">${sellPrice.toFixed(2)}</p>
                    </div>
                  )}
                  {margin !== null && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Margin</p>
                      <p className={`font-bold ${
                        margin < 0   ? 'text-red-600 dark:text-red-400' :
                        margin < 20  ? 'text-orange-600 dark:text-orange-400' :
                        margin < 40  ? 'text-amber-600 dark:text-amber-400' :
                                      'text-emerald-600 dark:text-emerald-400'
                      }`}>{margin.toFixed(1)}%</p>
                    </div>
                  )}
                  {recipe._count && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400">{t('bakeryBatch')}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        {recipe._count.productionBatches}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setScalingRecipe(recipe)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                    title={t('bakeryOpenScalingCalc')}
                  >
                    <Calculator className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCardRecipe(recipe)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    title={t('bakeryRecipeCard')}
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setEditRecipe(recipe); setModalOpen(true) }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    disabled={deletingId === recipe.id}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Archive"
                  >
                    {deletingId === recipe.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Expanded ingredients */}
              {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4">
                  {recipe.notes && (
                    <p className="text-xs text-slate-500 italic mb-3">{recipe.notes}</p>
                  )}
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    {t('bakeryIngredients')}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400">
                          <th className="pb-1 pr-4 font-medium">{t('bakeryIngredientName')}</th>
                          <th className="pb-1 pr-4 font-medium text-right">{t('bakeryIngredientQty')}</th>
                          <th className="pb-1 pr-4 font-medium">{t('bakeryIngredientUnit')}</th>
                          <th className="pb-1 pr-4 font-medium text-right">{t('bakeryCostPerUnit')}</th>
                          <th className="pb-1 font-medium text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {recipe.ingredients.map((ing, idx) => (
                          <tr key={ing.id ?? idx}>
                            <td className="py-1.5 pr-4 font-medium text-slate-700 dark:text-slate-200">{ing.name}</td>
                            <td className="py-1.5 pr-4 text-right text-slate-600 dark:text-slate-300">{ing.quantity}</td>
                            <td className="py-1.5 pr-4 text-slate-500">{ing.unit}</td>
                            <td className="py-1.5 pr-4 text-right text-slate-600 dark:text-slate-300">${ing.costPerUnit.toFixed(3)}</td>
                            <td className="py-1.5 text-right font-medium text-slate-700 dark:text-slate-200">
                              ${(ing.quantity * ing.costPerUnit).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 dark:border-slate-600">
                          <td colSpan={4} className="pt-2 text-right font-semibold text-sm text-slate-600 dark:text-slate-300">
                            {t('bakeryTotalBatchCost')}
                          </td>
                          <td className="pt-2 text-right font-bold text-amber-600 dark:text-amber-400">
                            ${batchCost.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {sellPrice !== null && (
                    <div className="mt-3 flex gap-6 text-sm flex-wrap">
                      <span className="text-slate-500">
                        Cost / {recipe.yieldUnit}: <strong className="text-amber-600 dark:text-amber-400">${unitCost.toFixed(3)}</strong>
                      </span>
                      <span className="text-slate-500">
                        Sell price: <strong className="text-emerald-600 dark:text-emerald-400">${sellPrice.toFixed(2)}</strong>
                      </span>
                      {margin !== null && (
                        <span className="text-slate-500">
                          Margin: <strong className={
                            margin < 0   ? 'text-red-600' :
                            margin < 20  ? 'text-orange-600' :
                            margin < 40  ? 'text-amber-600' :
                                          'text-emerald-600'
                          }>{margin.toFixed(1)}%</strong>
                        </span>
                      )}
                      {recipe.outputProduct && (
                        <span className="text-slate-500">
                          {t('bakeryLinkedTo')}: <strong className="text-slate-700 dark:text-slate-200">{recipe.outputProduct.name}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <RecipeFormModal
        open={modalOpen}
        recipe={editRecipe}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      {scalingRecipe && (
        <ScalingCalculatorModal
          recipe={scalingRecipe}
          onClose={() => setScalingRecipe(null)}
        />
      )}

      {cardRecipe && (
        <RecipeCardModal
          recipe={cardRecipe}
          onClose={() => setCardRecipe(null)}
        />
      )}
    </div>
  )
}
