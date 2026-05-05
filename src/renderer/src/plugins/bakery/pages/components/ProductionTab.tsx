import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Loader2, AlertTriangle, Factory,
  PackageCheck, TrendingDown, ShoppingBag, Clock, CheckCircle2
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import ProductionConfirmModal from './ProductionConfirmModal'
import Pagination from './Pagination'

type Recipe = { id: string; name: string; yieldQty: number; yieldUnit: string }
type Batch = {
  id: string
  recipeId: string
  batchDate: string
  quantity: number
  unitsProduced: number
  unitsSold: number
  unitsAvailable: number
  totalCost: number
  expiresAt: string | null
  notes?: string | null
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
interface PagedResult {
  data: Batch[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

const fmtCurrency = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function expiryStatus(expiresAt: string | null): { label: string; cls: string } {
  if (!expiresAt) return { label: 'No expiry', cls: 'text-slate-400' }
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff < 0) return { label: 'Expired', cls: 'text-red-600 dark:text-red-400' }
  const hours = diff / 3_600_000
  if (hours < 24) return { label: `${Math.round(hours)}h left`, cls: 'text-orange-500' }
  const days = Math.ceil(diff / 86_400_000)
  if (days <= 2) return { label: `${days}d left`, cls: 'text-amber-500' }
  return { label: fmtDate(expiresAt), cls: 'text-slate-400' }
}

export default function ProductionTab() {
  const { t } = useLanguage()
  const [recipes, setRecipes]     = useState<Recipe[]>([])
  const [paged, setPaged]         = useState<PagedResult | null>(null)
  const [capacity, setCapacity]   = useState<AvailableBatch[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Pagination
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Form
  const [recipeId, setRecipeId]   = useState('')
  const [quantity, setQuantity]   = useState('1')
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Quick sell
  const [sellBatch, setSellBatch]     = useState<Batch | null>(null)
  const [sellQty, setSellQty]         = useState('')
  const [sellPrice, setSellPrice]     = useState('')
  const [sellSubmitting, setSellSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, result, cap] = await Promise.all([
        window.api.bakery.getRecipes(),
        window.api.bakery.getProductionBatches({ page, pageSize }),
        window.api.bakery.getAvailableBatches()
      ])
      setRecipes(r ?? [])
      setPaged(result)
      setCapacity(cap ?? [])
      if (r && r.length > 0 && !recipeId) setRecipeId(r[0].id)
    } catch (e: any) {
      setError(e.message ?? t('bakeryLoadDataFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, recipeId, t])

  useEffect(() => { loadData() }, [loadData])  // eslint-disable-line

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
      setPage(1)
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
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  const handleQuickSell = async () => {
    if (!sellBatch) return
    const qty   = parseFloat(sellQty)
    const price = parseFloat(sellPrice)
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) return
    setSellSubmitting(true)
    try {
      await (window.api.bakery as any).createSale({
        recipeId:  sellBatch.recipeId,
        batchId:   sellBatch.id,
        itemName:  sellBatch.recipe.name,
        quantity:  qty,
        unitPrice: price,
        saleDate:  new Date().toISOString().slice(0, 10)
      })
      setSellBatch(null); setSellQty(''); setSellPrice('')
      await loadData()
    } catch (e: any) {
      setError(e.message ?? 'Failed to record sale')
    } finally {
      setSellSubmitting(false)
    }
  }

  // KPIs derived from current page
  const batches      = paged?.data ?? []
  const totalBatches = paged?.total ?? 0
  const kpiProduced  = batches.reduce((s, b) => s + b.unitsProduced, 0)
  const kpiSold      = batches.reduce((s, b) => s + (b.unitsSold ?? 0), 0)
  const kpiCost      = batches.reduce((s, b) => s + b.totalCost, 0)

  const selectedCap  = capacity.find(c => c.recipeId === recipeId)
  const previewUnits = recipeId
    ? (parseFloat(quantity) || 0) * (recipes.find(r => r.id === recipeId)?.yieldQty ?? 0)
    : 0

  if (loading && !paged) {
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

      {/* Quick-sell modal */}
      {sellBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Quick Sell</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Batch: <span className="font-medium text-slate-700 dark:text-slate-300">{sellBatch.recipe.name}</span>
              {' Â· '}Available: <span className="font-bold text-emerald-600">{sellBatch.unitsAvailable} {sellBatch.recipe.yieldUnit}</span>
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qty *</label>
                  <input type="number" min="0.01" step="0.01" value={sellQty}
                    onChange={e => setSellQty(e.target.value)}
                    placeholder={`max ${sellBatch.unitsAvailable}`}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unit Price ($) *</label>
                  <input type="number" min="0" step="0.01" value={sellPrice}
                    onChange={e => setSellPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              {sellQty && sellPrice && !isNaN(+sellQty) && !isNaN(+sellPrice) && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-3 py-2 text-sm flex justify-between">
                  <span className="text-emerald-700 dark:text-emerald-400">Total</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    ${(+sellQty * +sellPrice).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setSellBatch(null); setSellQty(''); setSellPrice('') }}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleQuickSell}
                  disabled={sellSubmitting || !sellQty || !sellPrice}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {sellSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Batches', value: totalBatches.toLocaleString(), icon: <Factory className="h-5 w-5 text-amber-600" />, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
            { label: 'Units Produced', value: kpiProduced.toLocaleString(), icon: <PackageCheck className="h-5 w-5 text-blue-600" />, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
            { label: 'Units Sold', value: kpiSold.toLocaleString(), icon: <ShoppingBag className="h-5 w-5 text-emerald-600" />, color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
            { label: 'Production Cost', value: `$${kpiCost.toFixed(2)}`, icon: <TrendingDown className="h-5 w-5 text-rose-600" />, color: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border p-4 flex items-center gap-3 ${k.color}`}>
              <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">{k.icon}</div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log new batch */}
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
                <p className="text-sm text-slate-400">{t('bakeryNoRecipes')}. {t('bakeryNoRecipesDesc')}</p>
              ) : (
                <form onSubmit={e => { e.preventDefault(); setShowConfirm(true) }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {t('bakerySelectRecipe')}
                    </label>
                    <select value={recipeId} onChange={e => setRecipeId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                      {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>

                    {/* Capacity indicator */}
                    {selectedCap && (
                      <div className={`mt-2 rounded-lg px-3 py-2 text-xs border ${
                        selectedCap.availableBatches === null
                          ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-500'
                          : selectedCap.availableBatches > 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400'
                      }`}>
                        {selectedCap.availableBatches === null ? (
                          <p className="italic">No pantry links â€” stock not tracked</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 font-semibold">
                              {selectedCap.availableBatches > 0
                                ? <PackageCheck className="h-3.5 w-3.5" />
                                : <TrendingDown className="h-3.5 w-3.5" />}
                              {selectedCap.availableBatches} batch{selectedCap.availableBatches !== 1 ? 'es' : ''} possible
                              {selectedCap.expectedUnits !== null && (
                                <span className="font-normal opacity-80">â†’ {selectedCap.expectedUnits} {selectedCap.yieldUnit}</span>
                              )}
                            </div>
                            {selectedCap.limitedBy && (
                              <p className="opacity-75 mt-0.5">Limited by: <strong>{selectedCap.limitedBy}</strong></p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('bakeryBatchesCount')}</label>
                      <input type="number" min="0.01" step="0.01" value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                      <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                  </div>

                  {previewUnits > 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      {t('bakeryEstimatedUnits')}: <strong>{previewUnits}</strong> {recipes.find(r => r.id === recipeId)?.yieldUnit ?? 'units'}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('bakeryNotesLabel')}</label>
                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. used extra butter"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium transition-colors">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Plus className="h-4 w-4" /> {t('bakeryRecordBatch')}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Batch history */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Factory className="h-4 w-4 text-slate-400" /> {t('bakeryProductionHistory')}
                </h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loadingâ€¦
                </div>
              ) : batches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Factory className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">{t('bakeryNoProductionBatches')}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          <th className="px-4 py-3 text-left font-medium">Date / Recipe</th>
                          <th className="px-4 py-3 text-right font-medium">Produced</th>
                          <th className="px-4 py-3 text-right font-medium">Sold</th>
                          <th className="px-4 py-3 text-right font-medium">Available</th>
                          <th className="px-4 py-3 text-right font-medium">Cost</th>
                          <th className="px-4 py-3 text-left font-medium">Expiry</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map(b => {
                          const exp = expiryStatus(b.expiresAt)
                          const availPct = b.unitsProduced > 0
                            ? Math.round(((b.unitsAvailable ?? b.unitsProduced) / b.unitsProduced) * 100)
                            : 0
                          return (
                            <tr key={b.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800 dark:text-white">{b.recipe.name}</div>
                                <div className="text-xs text-slate-400">{fmtDate(b.batchDate)} Â· {b.quantity} batch{b.quantity !== 1 ? 'es' : ''}</div>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{b.unitsProduced}</span>
                                <span className="ml-1 text-xs text-slate-400">{b.recipe.yieldUnit}</span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                                {(b.unitsSold ?? 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className={`font-bold tabular-nums ${(b.unitsAvailable ?? 0) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                  {(b.unitsAvailable ?? 0).toLocaleString()}
                                </div>
                                {b.unitsProduced > 0 && (
                                  <div className="mt-0.5 h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden w-16 ml-auto">
                                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${availPct}%` }} />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                                ${fmtCurrency(b.totalCost)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs flex items-center gap-1 ${exp.cls}`}>
                                  <Clock className="h-3 w-3" /> {exp.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  {(b.unitsAvailable ?? 0) > 0 && (
                                    <button
                                      onClick={() => { setSellBatch(b); setSellQty(''); setSellPrice('') }}
                                      className="flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors font-medium"
                                      title="Record a sale from this batch"
                                    >
                                      <ShoppingBag className="h-3 w-3" /> Sell
                                    </button>
                                  )}
                                  <button onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}
                                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                    title="Delete batch">
                                    {deletingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {paged && (
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                      <Pagination
                        page={paged.page}
                        totalPages={paged.totalPages}
                        total={paged.total}
                        onPage={p => setPage(p)}
                        pageSize={pageSize}
                        onPageSize={ps => { setPageSize(ps); setPage(1) }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
