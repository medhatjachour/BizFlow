import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Loader2, AlertTriangle, Factory,
  PackageCheck, TrendingDown, ShoppingBag, Clock, CheckCircle2,
  Flame, Hash, FileText, ChefHat
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import ProductionConfirmModal from './ProductionConfirmModal'
import Pagination from './Pagination'

type Recipe = { id: string; name: string; yieldQty: number; yieldUnit: string; sellingPrice?: number | null }
type Batch = {
  id: string
  recipeId: string
  batchDate: string
  quantity: number
  unitsProduced: number
  unitsSold: number
  unitsLost: number
  unitsAvailable: number
  totalCost: number
  expiresAt: string | null
  notes?: string | null
  recipe: { id: string; name: string; yieldUnit: string; sellingPrice?: number | null }
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

  // Show / hide Log Production modal
  const [showLogForm, setShowLogForm] = useState(false)

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
  const [sellBatch, setSellBatch]         = useState<Batch | null>(null)
  const [sellQty, setSellQty]             = useState(1)
  const [sellPrice, setSellPrice]         = useState('')
  const [sellDate, setSellDate]           = useState(new Date().toISOString().slice(0, 10))
  const [sellNotes, setSellNotes]         = useState('')
  const [sellSubmitting, setSellSubmitting] = useState(false)

  // Loss / waste
  const [lossBatch, setLossBatch]           = useState<Batch | null>(null)
  const [lossQty, setLossQty]               = useState('')
  const [lossReason, setLossReason]         = useState<'expired'|'shrinkage'|'damaged'|'other'>('expired')
  const [lossNotes, setLossNotes]           = useState('')
  const [lossSubmitting, setLossSubmitting] = useState(false)

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
    const price = parseFloat(sellPrice)
    if (sellQty <= 0 || sellQty > sellBatch.unitsAvailable) return
    if (isNaN(price) || price < 0) return
    setSellSubmitting(true)
    try {
      await (window.api.bakery as any).createSale({
        recipeId:  sellBatch.recipeId,
        batchId:   sellBatch.id,
        itemName:  sellBatch.recipe.name,
        quantity:  sellQty,
        unitPrice: price,
        saleDate:  sellDate,
        notes:     sellNotes || undefined
      })
      setSellBatch(null)
      setSellQty(1)
      setSellPrice('')
      setSellNotes('')
      await loadData()
    } catch (e: any) {
      setError(e.message ?? 'Failed to record sale')
    } finally {
      setSellSubmitting(false)
    }
  }

  const handleLogLoss = async () => {
    if (!lossBatch) return
    const qty = parseFloat(lossQty)
    if (isNaN(qty) || qty <= 0 || qty > lossBatch.unitsAvailable) return
    setLossSubmitting(true)
    try {
      const costPerUnit = lossBatch.unitsProduced > 0 ? lossBatch.totalCost / lossBatch.unitsProduced : 0
      await window.api.bakery.createWasteLog({
        wasteType:         'production_batch',
        productionBatchId: lossBatch.id,
        recipeId:          lossBatch.recipeId,
        itemName:          lossBatch.recipe.name,
        quantity:          qty,
        unit:              lossBatch.recipe.yieldUnit,
        cost:              qty * costPerUnit,
        reason:            lossReason,
        notes:             lossNotes || undefined
      })
      setLossBatch(null)
      setLossQty('')
      setLossNotes('')
      setLossReason('expired')
      await loadData()
    } catch (e: any) {
      setError(e.message ?? 'Failed to log loss')
    } finally {
      setLossSubmitting(false)
    }
  }

  // KPIs derived from current page
  const batches      = paged?.data ?? []
  const totalBatches = paged?.total ?? 0
  const kpiProduced  = batches.reduce((s, b) => s + b.unitsProduced, 0)
  const kpiSold      = batches.reduce((s, b) => s + (b.unitsSold ?? 0), 0)
  const kpiLost      = batches.reduce((s, b) => s + (b.unitsLost ?? 0), 0)

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

      {/* ── Sell Modal ── */}
      {sellBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-emerald-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <ShoppingBag className="h-5 w-5" />
                  <h3 className="text-base font-bold">Sell from Batch</h3>
                </div>
                <button onClick={() => { setSellBatch(null); setSellQty(1); setSellPrice(''); setSellNotes('') }}
                  className="text-white/70 hover:text-white transition-colors text-xl leading-none">×</button>
              </div>
              <p className="text-sm text-emerald-100 mt-1 font-medium">{sellBatch.recipe.name}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-emerald-100">
                <span>{fmtDate(sellBatch.batchDate)}</span>
                <span>·</span>
                <span className="font-semibold text-white">{sellBatch.unitsAvailable} {sellBatch.recipe.yieldUnit} available</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Qty stepper */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSellQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-lg"
                  >−</button>
                  <div className="flex-1">
                    <input
                      type="number" min="1" max={sellBatch.unitsAvailable} step="1"
                      value={sellQty}
                      onChange={e => setSellQty(Math.max(1, Math.min(sellBatch.unitsAvailable, parseInt(e.target.value) || 1)))}
                      className="w-full text-center rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-lg font-bold dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, (sellQty / sellBatch.unitsAvailable) * 100)}%` }}
                      />
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-0.5">of {sellBatch.unitsAvailable} {sellBatch.recipe.yieldUnit}</p>
                  </div>
                  <button
                    onClick={() => setSellQty(q => Math.min(sellBatch.unitsAvailable, q + 1))}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-lg"
                  >+</button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Unit price
                  {sellBatch.recipe.sellingPrice && (
                    <button
                      onClick={() => setSellPrice(sellBatch.recipe.sellingPrice!.toFixed(2))}
                      className="ml-2 text-amber-600 dark:text-amber-400 hover:underline font-normal"
                    >Use preset ${sellBatch.recipe.sellingPrice.toFixed(2)}</button>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={sellPrice}
                    onChange={e => setSellPrice(e.target.value)}
                    placeholder={sellBatch.recipe.sellingPrice ? sellBatch.recipe.sellingPrice.toFixed(2) : '0.00'}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* Total */}
              {sellPrice && !isNaN(+sellPrice) && +sellPrice > 0 && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">Sale total</span>
                  <span className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                    ${fmtCurrency(sellQty * +sellPrice)}
                  </span>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Sale date</label>
                <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea value={sellNotes} onChange={e => setSellNotes(e.target.value)}
                  rows={2} placeholder="e.g. wholesale, walk-in…"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setSellBatch(null); setSellQty(1); setSellPrice(''); setSellNotes('') }}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleQuickSell}
                  disabled={sellSubmitting || !sellPrice || +sellPrice <= 0 || sellQty <= 0 || sellQty > sellBatch.unitsAvailable}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {sellSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Record Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loss / Waste Modal ── */}
      {lossBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
            <div className="bg-rose-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Flame className="h-5 w-5" />
                  <h3 className="text-base font-bold">Log Loss / Waste</h3>
                </div>
                <button onClick={() => { setLossBatch(null); setLossQty(''); setLossNotes('') }}
                  className="text-white/70 hover:text-white transition-colors text-xl leading-none">×</button>
              </div>
              <p className="text-sm text-rose-100 mt-1 font-medium">{lossBatch.recipe.name}</p>
              <p className="text-xs text-rose-100 mt-0.5">{lossBatch.unitsAvailable} {lossBatch.recipe.yieldUnit} currently available</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Reason</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['expired', 'shrinkage', 'damaged', 'other'] as const).map(r => (
                    <button key={r} onClick={() => setLossReason(r)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-all ${
                        lossReason === r
                          ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-rose-300'
                      }`}>
                      {r === 'expired' ? '🕐 Expired' : r === 'shrinkage' ? '📉 Shrinkage' : r === 'damaged' ? '💥 Damaged' : '📝 Other'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Units lost <span className="text-slate-400 font-normal">(max {lossBatch.unitsAvailable} {lossBatch.recipe.yieldUnit})</span>
                </label>
                <input type="number" min="0.01" step="0.01"
                  value={lossQty} onChange={e => setLossQty(e.target.value)}
                  placeholder={`0 – ${lossBatch.unitsAvailable}`}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-400" />
                {lossQty && !isNaN(+lossQty) && +lossQty > 0 && (
                  <div className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-3 py-2 flex justify-between text-xs">
                    <span className="text-rose-700 dark:text-rose-400">Estimated cost lost</span>
                    <span className="font-bold text-rose-800 dark:text-rose-300">
                      ${fmtCurrency(+lossQty * (lossBatch.unitsProduced > 0 ? lossBatch.totalCost / lossBatch.unitsProduced : 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea value={lossNotes} onChange={e => setLossNotes(e.target.value)}
                  rows={2} placeholder="e.g. left out overnight, customer complaint…"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setLossBatch(null); setLossQty(''); setLossNotes('') }}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleLogLoss}
                  disabled={lossSubmitting || !lossQty || isNaN(+lossQty) || +lossQty <= 0 || +lossQty > lossBatch.unitsAvailable}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
                  {lossSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                  Log Loss
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
            { label: 'Waste / Loss', value: kpiLost.toLocaleString(), icon: <Flame className="h-5 w-5 text-rose-600" />, color: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' },
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

        {/* ── Log Production modal ── */}
        {showLogForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                    <Factory className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('bakeryLogProduction')}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Record a new production run</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogForm(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors text-lg leading-none"
                >&times;</button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {recipes.length === 0 ? (
                <p className="text-sm text-slate-400">{t('bakeryNoRecipes')}. {t('bakeryNoRecipesDesc')}</p>
              ) : (
                <>
                  {/* Recipe */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5"><ChefHat className="h-3.5 w-3.5" /> {t('bakerySelectRecipe')} <span className="text-red-500">*</span></span>
                    </label>
                    <select value={recipeId} onChange={e => setRecipeId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors">
                      {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>

                    {/* Capacity indicator */}
                    {selectedCap && (
                      <div className={`mt-2 rounded-xl px-3 py-2.5 text-xs border ${
                        selectedCap.availableBatches === null
                          ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-500'
                          : selectedCap.availableBatches > 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400'
                      }`}>
                        {selectedCap.availableBatches === null ? (
                          <p className="italic">No pantry links — stock not tracked</p>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 font-semibold">
                              {selectedCap.availableBatches > 0
                                ? <PackageCheck className="h-3.5 w-3.5" />
                                : <TrendingDown className="h-3.5 w-3.5" />}
                              {selectedCap.availableBatches} batch{selectedCap.availableBatches !== 1 ? 'es' : ''} possible
                              {selectedCap.expectedUnits !== null && (
                                <span className="font-normal opacity-80">→ {selectedCap.expectedUnits} {selectedCap.yieldUnit}</span>
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

                  {/* Batch count */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> {t('bakeryBatchesCount')} <span className="text-red-500">*</span></span>
                    </label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {[0.5, 1, 2, 3, 5, 10].map(q => (
                        <button key={q} type="button"
                          onClick={() => setQuantity(String(q))}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                            quantity === String(q)
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          }`}>{q}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button"
                        onClick={() => setQuantity(q => String(Math.max(0.5, Math.round((parseFloat(q) - 0.5) * 100) / 100)))}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-lg leading-none"
                      >−</button>
                      <input type="number" min="0.01" step="0.01" value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="flex-1 text-center rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-base font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors" />
                      <button type="button"
                        onClick={() => setQuantity(q => String(Math.round((parseFloat(q) + 0.5) * 100) / 100))}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-lg leading-none"
                      >+</button>
                    </div>
                    {previewUnits > 0 && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                        {t('bakeryEstimatedUnits')}: <strong className="ml-1">{previewUnits.toLocaleString()}</strong>&nbsp;{recipes.find(r => r.id === recipeId)?.yieldUnit ?? 'units'}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Date <span className="text-red-500">*</span></span>
                    </label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {[
                        { label: 'Today', days: 0 },
                        { label: 'Yesterday', days: -1 },
                        { label: '2 days ago', days: -2 }
                      ].map(chip => {
                        const val = (() => { const d = new Date(); d.setDate(d.getDate() + chip.days); return d.toISOString().slice(0, 10) })()
                        return (
                          <button key={chip.label} type="button"
                            onClick={() => setBatchDate(val)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                              batchDate === val
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}>{chip.label}</button>
                        )
                      })}
                    </div>
                    <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors" />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {t('bakeryNotesLabel')} <span className="normal-case font-normal text-slate-400">(optional)</span></span>
                    </label>
                    <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. used extra butter, adjusted for summer heat…"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none transition-colors" />
                  </div>
                </>
              )}
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                {error && (
                  <div className="flex items-center gap-2 mx-6 mt-4 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="text-xs text-slate-400">
                    {previewUnits > 0 && (
                      <span>~<span className="font-semibold text-amber-600 dark:text-amber-400">{previewUnits.toLocaleString()}</span> units expected</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLogForm(false)}
                      className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >{t('bakeryCancelBtn')}</button>
                    <button
                      onClick={() => { if (recipeId) setShowConfirm(true) }}
                      disabled={submitting || !recipeId || !quantity || parseFloat(quantity) <= 0}
                      className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-3.5 w-3.5" />}
                      {t('bakeryRecordBatch')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Batch history ── */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Factory className="h-4 w-4 text-slate-400" /> {t('bakeryProductionHistory')}
            </h2>
            <button
              onClick={() => { setError(null); setShowLogForm(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> {t('bakeryLogProduction')}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
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
                    <th className="px-4 py-3 text-right font-medium">Loss</th>
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
                          <div className="text-xs text-slate-400">{fmtDate(b.batchDate)} · {b.quantity} batch{b.quantity !== 1 ? 'es' : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{b.unitsProduced}</span>
                          <span className="ml-1 text-xs text-slate-400">{b.recipe.yieldUnit}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                          {(b.unitsSold ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {(b.unitsLost ?? 0) > 0 ? (
                            <span className="font-medium text-rose-600 dark:text-rose-400">
                              {b.unitsLost.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
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
                              <>
                                <button
                                  onClick={() => {
                                    setSellBatch(b)
                                    setSellQty(1)
                                    setSellPrice(b.recipe.sellingPrice ? b.recipe.sellingPrice.toFixed(2) : '')
                                    setSellDate(new Date().toISOString().slice(0, 10))
                                    setSellNotes('')
                                  }}
                                  className="flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors font-medium"
                                  title="Record a sale from this batch"
                                >
                                  <ShoppingBag className="h-3 w-3" /> Sell
                                </button>
                                <button
                                  onClick={() => { setLossBatch(b); setLossQty(''); setLossNotes(''); setLossReason('expired') }}
                                  className="flex items-center gap-1 rounded-md bg-rose-100 dark:bg-rose-900/30 px-2 py-1 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors font-medium"
                                  title="Log waste / loss"
                                >
                                  <Flame className="h-3 w-3" /> Loss
                                </button>
                              </>
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
    </>
  )
}
