import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, AlertTriangle, Factory, PackageCheck, TrendingDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import ProductionConfirmModal from './ProductionConfirmModal'

type Recipe = { id: string; name: string; yieldQty: number; yieldUnit: string }
type Batch = {
  id: string
  recipeId: string
  batchDate: string
  quantity: number
  unitsProduced: number
  totalCost: number
  notes?: string
  recipe: { id: string; name: string; yieldUnit: string }
}
type AvailableBatch = {
  recipeId: string
  recipeName: string
  yieldQty: number
  yieldUnit: string
  availableBatches: number | null
  expectedUnits: number | null
  limitedBy: string | null
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
    pantryStock: number | null
    pantryUnit: string | null
    maxBatches: number | null
  }>
}

export default function ProductionTab() {
  const [recipes, setRecipes]     = useState<Recipe[]>([])
  const [batches, setBatches]     = useState<Batch[]>([])
  const [capacity, setCapacity]   = useState<AvailableBatch[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { t } = useLanguage()

  // Form state
  const [recipeId, setRecipeId]   = useState('')
  const [quantity, setQuantity]   = useState('1')
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview]     = useState<{ units: number; cost: number } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, b, cap] = await Promise.all([
        window.api.bakery.getRecipes(),
        window.api.bakery.getProductionBatches({ limit: 100 }),
        window.api.bakery.getAvailableBatches()
      ])
      setRecipes(r ?? [])
      setBatches(b ?? [])
      setCapacity(cap ?? [])
      if (r && r.length > 0 && !recipeId) setRecipeId(r[0].id)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [recipeId])

  useEffect(() => { loadData() }, [])  // eslint-disable-line

  /* Live cost preview when recipe / quantity changes */
  useEffect(() => {
    const recipe = recipes.find(r => r.id === recipeId)
    if (recipe && quantity) {
      const qty = parseFloat(quantity)
      if (!isNaN(qty) && qty > 0) {
        setPreview({ units: qty * recipe.yieldQty, cost: 0 }) // cost computed server-side
      } else {
        setPreview(null)
      }
    }
  }, [recipeId, quantity, recipes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeId) return
    // Show confirm modal before recording
    setShowConfirm(true)
  }

  const doCreateBatch = async () => {
    if (!recipeId) return
    setSubmitting(true)
    try {
      await window.api.bakery.createProductionBatch({
        recipeId,
        quantity: parseFloat(quantity),
        batchDate,
        notes: notes || undefined
      })
      setQuantity('1')
      setNotes('')
      await loadData()
    } catch (e: any) {
      setError(e.message ?? t('bakeryLoadDataFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('bakeryDeleteBatchConfirm'))) return
    setDeletingId(id)
    try {
      await window.api.bakery.deleteProductionBatch(id)
      setBatches(b => b.filter(x => x.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t('bakeryLoadingRecipes')}
      </div>
    )
  }

  return (
    <>
      {showConfirm && recipeId && (
        <ProductionConfirmModal
          recipeId={recipeId}
          quantity={parseFloat(quantity) || 1}
          onConfirm={doCreateBatch}
          onClose={() => setShowConfirm(false)}
        />
      )}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Record new batch (left column) ── */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Factory className="h-4 w-4 text-amber-500" /> {t('bakeryLogProduction')}
          </h2>

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {recipes.length === 0 ? (
            <p className="text-sm text-slate-400">
              {t('bakeryNoRecipes')}. {t('bakeryNoRecipesDesc')}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('bakerySelectRecipe')}
                </label>
                <select
                  value={recipeId}
                  onChange={e => setRecipeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                {/* Pantry capacity card */}
                {(() => {
                  const cap = capacity.find(c => c.recipeId === recipeId)
                  if (!cap) return null
                  if (cap.availableBatches === null) return (
                    <p className="text-xs text-slate-400 mt-1.5 italic">
                      No pantry ingredients linked — stock not tracked
                    </p>
                  )
                  const ok = cap.availableBatches > 0
                  return (
                    <div className={`mt-2 rounded-lg px-3 py-2 text-xs border ${
                      ok
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400'
                    }`}>
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        {ok
                          ? <PackageCheck className="h-3.5 w-3.5" />
                          : <TrendingDown className="h-3.5 w-3.5" />
                        }
                        Pantry capacity: {cap.availableBatches} {cap.availableBatches === 1 ? 'batch' : 'batches'}
                        {cap.expectedUnits !== null && (
                          <span className="font-normal opacity-80">
                            {' '}→ {cap.expectedUnits} {cap.yieldUnit}
                          </span>
                        )}
                      </div>
                      {cap.limitedBy && (
                        <p className="opacity-80">Limited by: <strong>{cap.limitedBy}</strong></p>
                      )}
                      <div className="mt-1.5 space-y-0.5">
                        {cap.ingredients.filter(i => i.pantryStock !== null).map((ing, idx) => (
                          <div key={idx} className="flex justify-between opacity-75">
                            <span>{ing.name}</span>
                            <span>
                              {ing.pantryStock} {ing.pantryUnit} available
                              {ing.maxBatches !== null && <span className="ml-1">({ing.maxBatches} batches)</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('bakeryBatchesCount')}
                  </label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={e => setBatchDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {preview && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  {t('bakeryEstimatedUnits')}: <strong>{preview.units}</strong> {recipes.find(r => r.id === recipeId)?.yieldUnit ?? 'units'}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('bakeryNotesLabel')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. used extra butter"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Plus className="h-4 w-4" /> {t('bakeryRecordBatch')}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Batch history (right columns) ── */}
      <div className="lg:col-span-2">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-4">
          {t('bakeryProductionHistory')}
          <span className="ms-2 text-sm font-normal text-slate-400">({batches.length})</span>
        </h2>

        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Factory className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">{t('bakeryNoProductionBatches')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">{t('bakeryDateLabel')}</th>
                  <th className="px-4 py-3">{t('bakeryRecipeCol')}</th>
                  <th className="px-4 py-3 text-right">{t('bakeryBatchesCol')}</th>
                  <th className="px-4 py-3 text-right">{t('bakeryUnitsProduced')}</th>
                  <th className="px-4 py-3 text-right">{t('bakeryTotalCost')}</th>
                  <th className="px-4 py-3 text-right">{t('bakeryCostPerUnit')}</th>
                  <th className="px-4 py-3">{t('bakeryNotesLabel')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {batches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatDate(b.batchDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                      {b.recipe.name}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {b.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                      {b.unitsProduced} {b.recipe.yieldUnit}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">
                      ${b.totalCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 text-xs">
                      {b.unitsProduced > 0
                        ? `$${(b.totalCost / b.unitsProduced).toFixed(3)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">
                      {b.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={deletingId === b.id}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete record"
                      >
                        {deletingId === b.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
