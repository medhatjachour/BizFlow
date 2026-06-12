/**
 * RecipeCardModal – Printable recipe card with ingredients table
 */
import { X, Printer } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Ingredient {
  name: string
  quantity: number
  unit: string
  costPerUnit: number
}

interface Recipe {
  id: string
  name: string
  description?: string | null
  yieldQty: number
  yieldUnit: string
  expiryDays?: number | null
  notes?: string | null
  ingredients: Ingredient[]
}

interface Props {
  recipe: Recipe
  onClose: () => void
}

export default function RecipeCardModal({ recipe, onClose }: Props) {
  const { t } = useLanguage()

  const totalCost = recipe.ingredients.reduce(
    (s, i) => s + i.quantity * i.costPerUnit,
    0
  )
  const costPerUnit = recipe.yieldQty > 0 ? totalCost / recipe.yieldQty : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        id="recipe-card-print"
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden print:shadow-none print:rounded-none print:max-w-none"
      >
        {/* Header (hidden in print) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 print:hidden">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('bakeryRecipeCard')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
            >
              <Printer className="h-4 w-4" />
              {t('bakeryPrintRecipe')}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white print:text-black">{recipe.name}</h1>
            {recipe.description && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 print:text-slate-700">{recipe.description}</p>
            )}
          </div>

          {/* Meta row */}
          <div className="flex gap-4 text-sm">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 print:border print:border-amber-300">
              <p className="text-xs text-amber-600 uppercase tracking-wide">{t('bakeryYield')}</p>
              <p className="font-bold text-amber-700 print:text-amber-800">{recipe.yieldQty} {recipe.yieldUnit}</p>
            </div>
            {recipe.expiryDays && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2 print:border print:border-slate-300">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{t('bakeryExpiryDays')}</p>
                <p className="font-bold text-slate-700 print:text-slate-800">{recipe.expiryDays} {t('bakeryDays')}</p>
              </div>
            )}
          </div>

          {/* Ingredients table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 print:text-slate-700">
              {t('bakeryIngredients')}
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-600 print:border-slate-400">
                  <th className="text-start pb-1.5 text-slate-600 dark:text-slate-400 font-semibold print:text-slate-700">{t('bakeryIngredientName')}</th>
                  <th className="text-end pb-1.5 text-slate-600 dark:text-slate-400 font-semibold print:text-slate-700">{t('bakeryIngredientQty')}</th>
                  <th className="text-start pb-1.5 pl-2 text-slate-600 dark:text-slate-400 font-semibold print:text-slate-700">{t('bakeryIngredientUnit')}</th>
                  <th className="text-end pb-1.5 text-slate-600 dark:text-slate-400 font-semibold print:text-slate-700">{t('bakeryCostPerUnit')}</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ing, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 dark:border-slate-700 print:border-slate-200"
                  >
                    <td className="py-1.5 text-slate-800 dark:text-slate-200 print:text-slate-900">{ing.name}</td>
                    <td className="py-1.5 text-end text-slate-700 dark:text-slate-300 print:text-slate-800">{ing.quantity}</td>
                    <td className="py-1.5 pl-2 text-slate-500 print:text-slate-700">{ing.unit}</td>
                    <td className="py-1.5 text-end text-slate-600 dark:text-slate-400 print:text-slate-700">{ing.costPerUnit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-600 print:border-slate-400">
                  <td colSpan={3} className="pt-2 font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
                    {t('bakeryTotalIngredientCost')}
                  </td>
                  <td className="pt-2 text-end font-bold text-amber-700 print:text-amber-800">{totalCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pb-1 text-xs text-slate-500 print:text-slate-600">
                    {t('bakeryCostPerUnit')} {recipe.yieldUnit}
                  </td>
                  <td className="pb-1 text-end text-xs font-medium text-slate-600 dark:text-slate-400 print:text-slate-700">{costPerUnit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {recipe.notes && (
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 print:border-slate-300">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 print:text-slate-600">
                {t('bakeryNotesLabel')}
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 print:text-slate-800 whitespace-pre-line">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
