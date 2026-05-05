/**
 * SalesTab — POS-style bakery sales panel
 *
 * Flow:
 *  1. Product list: shows available stock grouped by recipe with price + expiry
 *  2. Sell panel: qty stepper, pre-filled price, batch info, one-click confirm
 *  3. History: paginated table with filters, page subtotal footer
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShoppingBag, Plus, Trash2, Loader2, AlertTriangle,
  TrendingUp, Package, DollarSign, Calendar, Filter, X,
  Search, ArrowLeft, Tag, Pencil, Check, ChevronDown, ChevronUp
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Pagination from './Pagination'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recipe {
  id: string
  name: string
  yieldUnit: string
  sellingPrice?: number | null
}

interface Sale {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  saleDate: string
  notes: string | null
  recipe: { id: string; name: string; yieldUnit: string; sellingPrice?: number | null } | null
  batch: { id: string; batchDate: string; unitsProduced: number } | null
}

interface PagedResult {
  data: Sale[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface SalesSummary {
  totalRevenue: number
  totalUnitsSold: number
  totalTransactions: number
  byRecipe: Array<{
    recipeId: string | null
    recipe: { id: string; name: string; yieldUnit: string } | null
    totalAmount: number
    quantity: number
    count: number
  }>
}

interface SellableBatch {
  id: string
  batchDate: string
  unitsProduced: number
  unitsSold: number
  unitsAvailable: number
  expiresAt: string | null
  recipe: { id: string; name: string; yieldQty: number; yieldUnit: string; sellingPrice?: number | null; expiryDays: number | null }
}

interface RecipeGroup {
  recipe: SellableBatch['recipe']
  batches: SellableBatch[]   // FIFO-sorted (oldest first)
  totalAvailable: number
  earliestExpiry: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

const fmtCurrency = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)

const daysUntil = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

// ─── Component ───────────────────────────────────────────────────────────────

export default function SalesTab() {
  const { t } = useLanguage()

  // ── Data ──
  const [recipes, setRecipes]               = useState<Recipe[]>([])
  const [paged, setPaged]                   = useState<PagedResult | null>(null)
  const [summary, setSummary]               = useState<SalesSummary | null>(null)
  const [sellableBatches, setSellableBatches] = useState<SellableBatch[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  // ── Pagination ──
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ── Filters ──
  const [filterRecipe, setFilterRecipe] = useState('')
  const [filterStart, setFilterStart]   = useState('')
  const [filterEnd, setFilterEnd]       = useState('')
  const [showFilters, setShowFilters]   = useState(false)

  // ── POS sell panel ──
  const [searchQuery, setSearchQuery]             = useState('')
  const [selectedRecipeId, setSelectedRecipeId]   = useState<string | null>(null)
  const [selectedBatchId, setSelectedBatchId]     = useState<string | null>(null)
  const [saleQty, setSaleQty]                     = useState(1)
  const [priceInput, setPriceInput]               = useState('')
  const [saleDate, setSaleDate]                   = useState(today())
  const [saleNotes, setSaleNotes]                 = useState('')
  const [showNotes, setShowNotes]                 = useState(false)
  const [submitting, setSubmitting]               = useState(false)

  // ── Custom sale (no batch) ──
  const [showCustom, setShowCustom]           = useState(false)
  const [customRecipeId, setCustomRecipeId]   = useState('')
  const [customItemName, setCustomItemName]   = useState('')
  const [customQty, setCustomQty]             = useState('1')
  const [customPrice, setCustomPrice]         = useState('')
  const [customDate, setCustomDate]           = useState(today())
  const [customNotes, setCustomNotes]         = useState('')
  const [customSubmitting, setCustomSubmitting] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Show / hide Available to Sell panel
  const [showAvailable, setShowAvailable] = useState(true)

  // ── Inline price editing ──
  const [editingPriceId, setEditingPriceId]     = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState('')
  const [savingPrice, setSavingPrice]             = useState(false)

  // ── Derived: group batches by recipe ──
  const byRecipe = useMemo<RecipeGroup[]>(() => {
    const map = new Map<string, RecipeGroup>()
    for (const b of sellableBatches) {
      if (!map.has(b.recipe.id)) {
        map.set(b.recipe.id, { recipe: b.recipe, batches: [], totalAvailable: 0, earliestExpiry: null })
      }
      const g = map.get(b.recipe.id)!
      g.batches.push(b)
      g.totalAvailable += b.unitsAvailable
      if (b.expiresAt && (!g.earliestExpiry || b.expiresAt < g.earliestExpiry)) {
        g.earliestExpiry = b.expiresAt
      }
    }
    // Sort: soonest expiry first, then alphabetical
    return Array.from(map.values()).sort((a, b) => {
      if (a.earliestExpiry && b.earliestExpiry) return a.earliestExpiry < b.earliestExpiry ? -1 : 1
      if (a.earliestExpiry) return -1
      if (b.earliestExpiry) return 1
      return a.recipe.name.localeCompare(b.recipe.name)
    })
  }, [sellableBatches])

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return byRecipe
    const q = searchQuery.toLowerCase()
    return byRecipe.filter(g => g.recipe.name.toLowerCase().includes(q))
  }, [byRecipe, searchQuery])

  const selectedGroup = useMemo(
    () => byRecipe.find(g => g.recipe.id === selectedRecipeId) ?? null,
    [byRecipe, selectedRecipeId]
  )
  const selectedBatch = useMemo(
    () => selectedGroup?.batches.find(b => b.id === selectedBatchId) ?? null,
    [selectedGroup, selectedBatchId]
  )
  const effectivePrice = priceInput !== '' ? parseFloat(priceInput) : (selectedGroup?.recipe.sellingPrice ?? 0)
  const saleTotal = saleQty * (isNaN(effectivePrice) ? 0 : effectivePrice)

  // ── Data loading ──
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const opts: any = { page, pageSize }
      if (filterRecipe) opts.recipeId  = filterRecipe
      if (filterStart)  opts.startDate = filterStart
      if (filterEnd)    opts.endDate   = filterEnd

      const [r, result, sum] = await Promise.all([
        window.api.bakery.getRecipes(),
        window.api.bakery.getSales(opts),
        window.api.bakery.getSalesSummary(
          filterStart || filterEnd
            ? { startDate: filterStart || undefined, endDate: filterEnd || undefined }
            : {}
        )
      ])
      setRecipes(r ?? [])
      setPaged(result)
      setSummary(sum)
    } catch (e: any) {
      setError(e.message ?? t('bakerySaleLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filterRecipe, filterStart, filterEnd])

  const loadSellableBatches = useCallback(async () => {
    try {
      const batches = await window.api.bakery.getSellableBatches()
      setSellableBatches(batches ?? [])
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadSellableBatches() }, [loadSellableBatches])

  // Auto-fill custom sale price when recipe selected
  useEffect(() => {
    if (customRecipeId) {
      const r = recipes.find(r => r.id === customRecipeId)
      if (r) {
        setCustomItemName(r.name)
        if (r.sellingPrice) setCustomPrice(r.sellingPrice.toFixed(2))
      }
    } else {
      setCustomItemName('')
      setCustomPrice('')
    }
  }, [customRecipeId, recipes])

  // Auto-navigate back if selected batch depletes after a sale
  useEffect(() => {
    if (!selectedRecipeId) return
    const group = byRecipe.find(g => g.recipe.id === selectedRecipeId)
    if (!group) {
      setSelectedRecipeId(null)
      setSelectedBatchId(null)
      return
    }
    if (selectedBatchId && !group.batches.find(b => b.id === selectedBatchId)) {
      setSelectedBatchId(group.batches[0]?.id ?? null)
      setSaleQty(1)
    }
  }, [byRecipe, selectedRecipeId, selectedBatchId])

  // ── Handlers ──
  const handleSelectRecipe = (group: RecipeGroup) => {
    setSelectedRecipeId(group.recipe.id)
    setSelectedBatchId(group.batches[0]?.id ?? null)
    setSaleQty(1)
    setPriceInput(group.recipe.sellingPrice ? group.recipe.sellingPrice.toFixed(2) : '')
    setSaleNotes('')
    setSaleDate(today())
    setShowNotes(false)
    setError(null)
  }

  const handleSell = async () => {
    if (!selectedGroup || !selectedBatch) return
    if (saleQty <= 0 || saleQty > selectedBatch.unitsAvailable) return
    const price = isNaN(effectivePrice) ? 0 : effectivePrice
    if (price < 0) return

    setSubmitting(true)
    setError(null)
    try {
      await window.api.bakery.createSale({
        recipeId:  selectedBatch.recipe.id,
        batchId:   selectedBatch.id,
        itemName:  selectedBatch.recipe.name,
        quantity:  saleQty,
        unitPrice: price,
        saleDate,
        notes:     saleNotes || undefined
      })
      setSaleQty(1)
      setSaleNotes('')
      setShowNotes(false)
      setPage(1)
      await Promise.all([loadData(), loadSellableBatches()])
    } catch (e: any) {
      setError(e.message ?? t('bakerySaleRecordFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCustomSell = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customItemName.trim()) return
    const qty   = parseFloat(customQty)
    const price = parseFloat(customPrice)
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) return

    setCustomSubmitting(true)
    setError(null)
    try {
      await window.api.bakery.createSale({
        recipeId:  customRecipeId || undefined,
        itemName:  customItemName.trim(),
        quantity:  qty,
        unitPrice: price,
        saleDate:  customDate,
        notes:     customNotes || undefined
      })
      setShowCustom(false)
      setCustomRecipeId('')
      setCustomItemName('')
      setCustomQty('1')
      setCustomPrice('')
      setCustomNotes('')
      setPage(1)
      await Promise.all([loadData(), loadSellableBatches()])
    } catch (e: any) {
      setError(e.message ?? t('bakerySaleRecordFailed'))
    } finally {
      setCustomSubmitting(false)
    }
  }

  const handleSavePrice = async (recipeId: string) => {
    const price = parseFloat(editingPriceValue)
    if (isNaN(price) || price < 0) return
    setSavingPrice(true)
    try {
      await window.api.bakery.updateRecipe({ id: recipeId, sellingPrice: price })
      setEditingPriceId(null)
      setEditingPriceValue('')
      await Promise.all([loadData(), loadSellableBatches()])
    } catch (e: any) {
      setError(e.message ?? 'Failed to save price')
    } finally {
      setSavingPrice(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('bakerySaleDeleteConfirm'))) return
    setDeletingId(id)
    try {
      await window.api.bakery.deleteSale(id)
      await loadData()
    } catch (e: any) {
      setError(e.message ?? t('bakerySaleDeleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const clearFilters = () => { setFilterRecipe(''); setFilterStart(''); setFilterEnd(''); setPage(1) }

  const hasFilters    = filterRecipe || filterStart || filterEnd
  const totalRevenue  = summary?.totalRevenue      ?? 0
  const totalUnits    = summary?.totalUnitsSold    ?? 0
  const totalTx       = summary?.totalTransactions ?? 0
  const avgSaleValue  = totalTx > 0 ? totalRevenue / totalTx : 0

  if (loading && !paged) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t('bakerySaleLoading')}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label={t('bakerySaleTotalRevenue')} value={`$${fmtCurrency(totalRevenue)}`}        color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" />
        <KpiCard icon={<Package     className="h-5 w-5 text-blue-600" />}    label={t('bakerySaleUnitsSold')}    value={totalUnits.toLocaleString()}               color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" />
        <KpiCard icon={<ShoppingBag className="h-5 w-5 text-purple-600" />}  label={t('bakerySaleTransactions')} value={totalTx.toLocaleString()}                  color="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" />
        <KpiCard icon={<TrendingUp  className="h-5 w-5 text-amber-600" />}   label={t('bakerySaleAvgValue')}     value={`$${fmtCurrency(avgSaleValue)}`}           color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left: POS Panel ── */}
        {(showAvailable || selectedGroup || showCustom) && (
        <div className="xl:col-span-1 space-y-4">

          {/* ── SELL CONFIRM PANEL (recipe selected) ── */}
          {selectedGroup && (
            <SellConfirmPanel
              group={selectedGroup}
              selectedBatch={selectedBatch}
              onSelectBatch={id => { setSelectedBatchId(id); setSaleQty(1) }}
              saleQty={saleQty}
              onQtyChange={setSaleQty}
              priceInput={priceInput}
              onPriceChange={setPriceInput}
              effectivePrice={effectivePrice}
              saleTotal={saleTotal}
              saleDate={saleDate}
              onDateChange={setSaleDate}
              saleNotes={saleNotes}
              onNotesChange={setSaleNotes}
              showNotes={showNotes}
              onToggleNotes={() => setShowNotes(v => !v)}
              submitting={submitting}
              error={error}
              onSell={handleSell}
              onBack={() => { setSelectedRecipeId(null); setSelectedBatchId(null); setError(null) }}
            />
          )}

          {/* ── CUSTOM SALE FORM ── */}
          {!selectedGroup && showCustom && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <button
                  onClick={() => { setShowCustom(false); setError(null) }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Custom Sale</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Record a sale without a tracked batch</p>
                </div>
              </div>

              {error && (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleCustomSell} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Recipe <span className="text-slate-400">(optional)</span>
                  </label>
                  <select
                    value={customRecipeId}
                    onChange={e => setCustomRecipeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">— no recipe —</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}{r.sellingPrice ? ` · $${r.sellingPrice.toFixed(2)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Item name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customItemName}
                    onChange={e => setCustomItemName(e.target.value)}
                    placeholder="e.g. Sourdough Loaf"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qty <span className="text-red-500">*</span></label>
                    <input type="number" min="0.01" step="0.01" value={customQty} onChange={e => setCustomQty(e.target.value)} required
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unit price <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" min="0" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="0.00" required
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-6 pr-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                  </div>
                </div>

                {customQty && customPrice && !isNaN(+customQty) && !isNaN(+customPrice) && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 flex justify-between text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400">Total</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">${fmtCurrency(+customQty * +customPrice)}</span>
                  </div>
                )}

                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />

                <textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)} rows={2} placeholder="Notes…"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />

                <button type="submit" disabled={customSubmitting || !customItemName.trim() || !customPrice}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {customSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Record Sale</>}
                </button>
              </form>
            </div>
          )}

          {/* ── PRODUCT LIST ── */}
          {!selectedGroup && !showCustom && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-amber-500" /> Available to Sell
                  <span className="text-xs font-normal text-slate-400">({filteredGroups.length})</span>
                </h2>
                <button
                  onClick={() => setShowAvailable(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Hide panel"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search products…"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 pl-8 pr-3 py-1.5 text-xs dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="p-2 grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center px-4">
                    <Package className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {byRecipe.length === 0 ? 'No produced batches with stock' : 'No results for this search'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {byRecipe.length === 0 ? 'Log a production batch first' : 'Try a different search term'}
                    </p>
                  </div>
                ) : (
                  filteredGroups.map(group => {
                    const expDays  = group.earliestExpiry ? daysUntil(group.earliestExpiry) : null
                    const hasPrice = group.recipe.sellingPrice != null && group.recipe.sellingPrice > 0
                    const expClass =
                      expDays === null ? '' :
                      expDays <= 0    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      expDays <= 1    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      expDays <= 3    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''

                    // ── Inline price editor card ──
                    if (editingPriceId === group.recipe.id) {
                      return (
                        <div key={group.recipe.id} className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 flex flex-col gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{group.recipe.name}</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">price / {group.recipe.yieldUnit}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input
                                autoFocus
                                type="number" min="0" step="0.01"
                                value={editingPriceValue}
                                onChange={e => setEditingPriceValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSavePrice(group.recipe.id)
                                  if (e.key === 'Escape') { setEditingPriceId(null); setEditingPriceValue('') }
                                }}
                                className="w-full pl-5 pr-1 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                            <button
                              onClick={() => handleSavePrice(group.recipe.id)}
                              disabled={savingPrice || !editingPriceValue}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {savingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => { setEditingPriceId(null); setEditingPriceValue('') }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )
                    }

                    // ── Normal product card ──
                    return (
                      <div key={group.recipe.id} className="group/card relative rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all overflow-hidden">
                        <div
                          onClick={() => handleSelectRecipe(group)}
                          className="cursor-pointer p-3 flex flex-col gap-1 h-full"
                        >
                          <p className="text-xs font-semibold text-slate-800 dark:text-white group-hover/card:text-amber-700 dark:group-hover/card:text-amber-400 transition-colors truncate pr-5">
                            {group.recipe.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {group.totalAvailable} {group.recipe.yieldUnit}
                            {group.batches.length > 1 && <span className="text-slate-400"> · {group.batches.length}b</span>}
                          </p>
                          {expClass && (
                            <span className={`self-start inline-flex items-center text-xs px-1.5 py-0.5 rounded-full ${expClass}`}>
                              {expDays! <= 0 ? '⚠ Exp' : expDays === 1 ? 'tmrw' : `${expDays}d`}
                            </span>
                          )}
                          <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            {hasPrice ? (
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                ${group.recipe.sellingPrice!.toFixed(2)}
                                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-0.5">/{group.recipe.yieldUnit}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-500 italic">No price set</span>
                            )}
                          </div>
                        </div>
                        {/* Hover: edit price button */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setEditingPriceId(group.recipe.id)
                            setEditingPriceValue(group.recipe.sellingPrice ? group.recipe.sellingPrice.toFixed(2) : '')
                          }}
                          title="Set price"
                          className="absolute top-2 right-2 p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 opacity-0 group-hover/card:opacity-100 transition-all"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2.5">
                <button
                  onClick={() => { setShowCustom(true); setError(null) }}
                  className="w-full text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-1.5 transition-colors py-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Record custom sale (without batch)
                </button>
              </div>
            </div>
          )}

          {/* ── Top by Revenue ── */}
          {!selectedGroup && !showCustom && summary && summary.byRecipe.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                {t('bakerySaleTopItems')}
              </h3>
              <div className="space-y-2.5">
                {summary.byRecipe.slice(0, 5).map((row, i) => {
                  const pct = totalRevenue > 0 ? Math.round((row.totalAmount / totalRevenue) * 100) : 0
                  return (
                    <div key={row.recipeId ?? i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]">
                          {row.recipe?.name ?? 'Other'}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                          ${fmtCurrency(row.totalAmount)} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        )}

        {/* ── Right: Sales History ── */}
        <div className={(!showAvailable && !selectedGroup && !showCustom) ? 'xl:col-span-3' : 'xl:col-span-2'}>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> {t('bakerySaleHistory')}
              </h2>
              <div className="flex items-center gap-2">
                {!showAvailable && !selectedGroup && !showCustom && (
                  <button
                    onClick={() => setShowAvailable(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Available to Sell
                  </button>
                )}
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    showFilters
                      ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {showFilters ? t('bakerySaleHideFilters') : t('bakerySaleFilters')}
                  {hasFilters && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </button>
              </div>
            </div>

            {/* Filter row */}
            {showFilters && (
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Recipe</label>
                    <select value={filterRecipe} onChange={e => { setFilterRecipe(e.target.value); setPage(1) }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                      <option value="">All recipes</option>
                      {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">From</label>
                    <input type="date" value={filterStart} onChange={e => { setFilterStart(e.target.value); setPage(1) }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">To</label>
                    <input type="date" value={filterEnd} onChange={e => { setFilterEnd(e.target.value); setPage(1) }}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t('bakerySaleLoading')}
              </div>
            ) : !paged || paged.data.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Source</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {paged.data.map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-800 dark:text-white">{sale.itemName}</div>
                            {sale.recipe && (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
                                {sale.recipe.name}
                              </span>
                            )}
                            {sale.notes && (
                              <div className="mt-1 text-xs text-slate-400 italic truncate max-w-[180px]">{sale.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {sale.batch ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">
                                <Package className="h-3 w-3" /> {fmtDate(sale.batch.batchDate)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Custom</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums font-medium text-slate-700 dark:text-slate-300">
                            {sale.quantity.toLocaleString()}
                            {sale.recipe?.yieldUnit && (
                              <span className="ml-1 text-xs text-slate-400">{sale.recipe.yieldUnit}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            ${fmtCurrency(sale.unitPrice)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                              ${fmtCurrency(sale.totalAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                            {fmtDate(sale.saleDate)}
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleDelete(sale.id)}
                              disabled={deletingId === sale.id}
                              className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                            >
                              {deletingId === sale.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />
                              }
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right">
                          Page subtotal ({paged.data.length} records)
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          ${fmtCurrency(paged.data.reduce((s, r) => s + r.totalAmount, 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SellConfirmPanel({
  group, selectedBatch, onSelectBatch,
  saleQty, onQtyChange,
  priceInput, onPriceChange, effectivePrice, saleTotal,
  saleDate, onDateChange,
  saleNotes, onNotesChange, showNotes, onToggleNotes,
  submitting, error, onSell, onBack
}: {
  group: RecipeGroup
  selectedBatch: SellableBatch | null
  onSelectBatch: (id: string) => void
  saleQty: number
  onQtyChange: (qty: number) => void
  priceInput: string
  onPriceChange: (price: string) => void
  effectivePrice: number
  saleTotal: number
  saleDate: string
  onDateChange: (d: string) => void
  saleNotes: string
  onNotesChange: (n: string) => void
  showNotes: boolean
  onToggleNotes: () => void
  submitting: boolean
  error: string | null
  onSell: () => void
  onBack: () => void
}) {
  const maxQty      = selectedBatch?.unitsAvailable ?? 0
  const isOverstock = saleQty > maxQty
  const isValid     = saleQty > 0 && !isOverstock && effectivePrice >= 0 && selectedBatch != null
  const safeTotal   = isNaN(saleTotal) ? 0 : saleTotal

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          title="Back to product list"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200 truncate">{group.recipe.name}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {group.totalAvailable} {group.recipe.yieldUnit} in stock
            {group.batches.length > 1 && ` · ${group.batches.length} batches`}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {/* Batch selection */}
        {group.batches.length > 1 ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              <Package className="inline h-3 w-3 mr-1" /> Batch
            </label>
            <select
              value={selectedBatch?.id ?? ''}
              onChange={e => onSelectBatch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {group.batches.map(b => {
                const expDays = b.expiresAt ? daysUntil(b.expiresAt) : null
                return (
                  <option key={b.id} value={b.id}>
                    {fmtDate(b.batchDate)} · {b.unitsAvailable} left{expDays !== null ? ` · exp ${expDays}d` : ''}
                  </option>
                )
              })}
            </select>
          </div>
        ) : selectedBatch ? (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Package className="h-3.5 w-3.5 text-blue-500" /> Batch: {fmtDate(selectedBatch.batchDate)}
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {selectedBatch.unitsAvailable} {group.recipe.yieldUnit} available
            </span>
          </div>
        ) : null}

        {/* Quantity stepper */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Quantity
            <span className="ml-1 font-normal text-slate-400">(max: {maxQty} {group.recipe.yieldUnit})</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQtyChange(Math.max(1, saleQty - 1))}
              disabled={saleQty <= 1}
              className="h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-xl font-light"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max={maxQty}
              step="1"
              value={saleQty}
              onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onQtyChange(v) }}
              className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-600 px-3 text-center text-base font-bold dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={() => onQtyChange(Math.min(maxQty, saleQty + 1))}
              disabled={saleQty >= maxQty}
              className="h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-xl font-light"
            >
              +
            </button>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOverstock ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (saleQty / Math.max(maxQty, 1)) * 100)}%` }}
            />
          </div>
          {isOverstock && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Exceeds available stock
            </p>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            <Tag className="inline h-3 w-3 mr-1" /> Price per {group.recipe.yieldUnit}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={e => onPriceChange(e.target.value)}
              placeholder={group.recipe.sellingPrice?.toFixed(2) ?? '0.00'}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-7 pr-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {group.recipe.sellingPrice && priceInput !== '' && parseFloat(priceInput) !== group.recipe.sellingPrice && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Default: ${group.recipe.sellingPrice.toFixed(2)} / {group.recipe.yieldUnit}
            </p>
          )}
        </div>

        {/* Sale date */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            <Calendar className="inline h-3 w-3 mr-1" /> Sale date
          </label>
          <input
            type="date"
            value={saleDate}
            onChange={e => onDateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Notes */}
        <button
          type="button"
          onClick={onToggleNotes}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> {showNotes ? 'Hide note' : 'Add note'}
        </button>
        {showNotes && (
          <textarea
            value={saleNotes}
            onChange={e => onNotesChange(e.target.value)}
            rows={2}
            placeholder="e.g. Corporate order, discount applied…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        )}

        {/* Total + confirm */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {saleQty} × ${isNaN(effectivePrice) ? '0.00' : effectivePrice.toFixed(2)}
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">${fmtCurrency(safeTotal)}</span>
          </div>
          <button
            onClick={onSell}
            disabled={submitting || !isValid}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><ShoppingBag className="h-4 w-4" /> Record Sale</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${color}`}>
      <div className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-700 p-4">
        <ShoppingBag className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">{t('bakerySaleNoSales')}</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
        {t('bakerySaleNoSalesDesc')}
      </p>
    </div>
  )
}

