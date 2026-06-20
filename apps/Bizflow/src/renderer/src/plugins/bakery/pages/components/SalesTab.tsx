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
  Search, Pencil, Check
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Pagination from './Pagination'

import type {
  Recipe, PagedResult, SalesSummary, SellableBatch, RecipeGroup
} from './salesTab.types'
import { fmtDate, fmtCurrency, today, daysUntil } from './salesTab.shared'
import SellConfirmPanel from './SellConfirmPanel'

// ─── Component ───────────────────────────────────────────────────────────────

export default function SalesTab() {
  const { t } = useLanguage()
  const bakeryApi = window.api.bakery as any

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

  // Sub-tab: 'sell' = POS panel, 'history' = sales log
  const [activeSubTab, setActiveSubTab] = useState<'sell' | 'history'>('sell')

  // POS quick-filter
  const [posFilter, setPosFilter] = useState<'' | 'expiring' | 'noprice'>('')

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
    let groups = byRecipe
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      groups = groups.filter(g => g.recipe.name.toLowerCase().includes(q))
    }
    if (posFilter === 'expiring') groups = groups.filter(g => g.earliestExpiry && daysUntil(g.earliestExpiry) <= 3)
    if (posFilter === 'noprice')  groups = groups.filter(g => !g.recipe.sellingPrice)
    return groups
  }, [byRecipe, searchQuery, posFilter])

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
        bakeryApi.getSales(opts),
        bakeryApi.getSalesSummary(
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
      const batches = await bakeryApi.getSellableBatches()
      setSellableBatches(batches ?? [])
    } catch { /* silently fail */ }
  }, [bakeryApi])

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
      await bakeryApi.createSale({
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
      setSelectedRecipeId(null)
      setSelectedBatchId(null)
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
      await bakeryApi.createSale({
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
      await bakeryApi.deleteSale(id)
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

  const subTabs = [
    { key: 'sell' as const,    label: 'Sell',           icon: <ShoppingBag className="h-4 w-4" /> },
    { key: 'history' as const, label: 'Sales History',   icon: <Calendar className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label={t('bakerySaleTotalRevenue')} value={`$${fmtCurrency(totalRevenue)}`}        color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" />
        <KpiCard icon={<Package     className="h-5 w-5 text-blue-600" />}    label={t('bakerySaleUnitsSold')}    value={totalUnits.toLocaleString()}               color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" />
        <KpiCard icon={<ShoppingBag className="h-5 w-5 text-purple-600" />}  label={t('bakerySaleTransactions')} value={totalTx.toLocaleString()}                  color="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" />
        <KpiCard icon={<TrendingUp  className="h-5 w-5 text-amber-600" />}   label={t('bakerySaleAvgValue')}     value={`$${fmtCurrency(avgSaleValue)}`}           color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" />
      </div>

      {/* ── Sub-tab bar ── */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSubTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Sell tab ── */}
      {activeSubTab === 'sell' && (
      <div className="space-y-4">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${byRecipe.length} product${byRecipe.length !== 1 ? 's' : ''}…`}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {([
              { key: '' as const,          label: 'All',         count: byRecipe.length },
              { key: 'expiring' as const,  label: '⚠ Expiring', count: byRecipe.filter(g => g.earliestExpiry && daysUntil(g.earliestExpiry) <= 3).length },
              { key: 'noprice' as const,   label: 'No Price',    count: byRecipe.filter(g => !g.recipe.sellingPrice).length },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setPosFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  posFilter === f.key
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}{f.count > 0 && posFilter !== f.key ? <span className="ml-1.5 opacity-60">({f.count})</span> : null}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowCustom(true); setError(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Custom Sale
          </button>
        </div>

        {/* Product grid — full width, responsive columns */}
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {byRecipe.length === 0 ? 'No produced batches with stock' : 'No products match your search'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {byRecipe.length === 0 ? 'Log a production batch in the Production tab first' : 'Try a different search or filter'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredGroups.map(group => {
              const expDays  = group.earliestExpiry ? daysUntil(group.earliestExpiry) : null
              const hasPrice = group.recipe.sellingPrice != null && group.recipe.sellingPrice > 0
              const urgency  =
                expDays === null ? 'none'     :
                expDays <= 0    ? 'expired'   :
                expDays <= 1    ? 'critical'  :
                expDays <= 3    ? 'warn'      : 'ok'

              if (editingPriceId === group.recipe.id) {
                return (
                  <div key={group.recipe.id} className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 flex flex-col gap-2 min-h-[130px]">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{group.recipe.name}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Set price / {group.recipe.yieldUnit}</p>
                    <div className="flex items-center gap-1 mt-auto">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input
                          autoFocus type="number" min="0" step="0.01"
                          value={editingPriceValue}
                          onChange={e => setEditingPriceValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSavePrice(group.recipe.id)
                            if (e.key === 'Escape') { setEditingPriceId(null); setEditingPriceValue('') }
                          }}
                          className="w-full pl-5 pr-1 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-xs dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                      <button onClick={() => handleSavePrice(group.recipe.id)} disabled={savingPrice || !editingPriceValue}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                        {savingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </button>
                      <button onClick={() => { setEditingPriceId(null); setEditingPriceValue('') }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={group.recipe.id}
                  className={`group/card relative rounded-xl border transition-all overflow-hidden cursor-pointer ${
                    urgency === 'expired'  ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 hover:border-red-400' :
                    urgency === 'critical' ? 'border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 hover:border-orange-400' :
                    urgency === 'warn'     ? 'border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 hover:border-amber-400' :
                    'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                  }`}
                  onClick={() => handleSelectRecipe(group)}
                >
                  {urgency !== 'none' && urgency !== 'ok' && (
                    <div className={`h-1 ${
                      urgency === 'expired' ? 'bg-red-500' :
                      urgency === 'critical' ? 'bg-orange-500' : 'bg-amber-400'
                    }`} />
                  )}
                  <div className="p-3 flex flex-col gap-1.5 min-h-[120px]">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white group-hover/card:text-amber-700 dark:group-hover/card:text-amber-400 transition-colors leading-tight line-clamp-2 pr-5">
                      {group.recipe.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{group.totalAvailable}</span> {group.recipe.yieldUnit}
                      {group.batches.length > 1 && <span className="text-slate-400 dark:text-slate-500"> · {group.batches.length}b</span>}
                    </p>
                    {expDays !== null && (
                      <span className={`self-start text-xs px-1.5 py-0.5 rounded-full font-medium w-fit ${
                        urgency === 'expired'  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        urgency === 'critical' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        urgency === 'warn'     ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {expDays <= 0 ? 'Expired' : expDays === 1 ? 'Exp tomorrow' : `Exp ${expDays}d`}
                      </span>
                    )}
                    <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      {hasPrice ? (
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${group.recipe.sellingPrice!.toFixed(2)}<span className="text-xs font-normal text-slate-400 ml-0.5">/{group.recipe.yieldUnit}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-500 italic">No price set</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setEditingPriceId(group.recipe.id); setEditingPriceValue(group.recipe.sellingPrice ? group.recipe.sellingPrice.toFixed(2) : '') }}
                    title="Set price"
                    className="absolute top-2 right-2 p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 opacity-0 group-hover/card:opacity-100 transition-all"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Sell confirm modal */}
        {selectedGroup && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setSelectedRecipeId(null); setSelectedBatchId(null); setError(null) }}
          >
            <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
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
            </div>
          </div>
        )}

        {/* Custom sale modal */}
        {showCustom && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setShowCustom(false); setError(null) }}
          >
            <div
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Custom Sale</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Record a sale without a tracked batch</p>
                </div>
                <button onClick={() => { setShowCustom(false); setError(null) }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {error && (
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}
              <form onSubmit={handleCustomSell} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Recipe <span className="text-slate-400">(optional)</span></label>
                  <select value={customRecipeId} onChange={e => setCustomRecipeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">— no recipe —</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name}{r.sellingPrice ? ` · $${r.sellingPrice.toFixed(2)}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Item name <span className="text-red-500">*</span></label>
                  <input type="text" value={customItemName} onChange={e => setCustomItemName(e.target.value)} placeholder="e.g. Sourdough Loaf" required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qty <span className="text-red-500">*</span></label>
                    <input type="number" min="0.01" step="0.01" value={customQty} onChange={e => setCustomQty(e.target.value)} required
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unit price <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input type="number" min="0" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="0.00" required
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-6 pr-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
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
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)} rows={2} placeholder="Notes…"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <button type="submit" disabled={customSubmitting || !customItemName.trim() || !customPrice}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {customSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Record Sale</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── History tab ── */}
      {activeSubTab === 'history' && (
      <div className="space-y-4">

        {/* Top by Revenue */}
        {summary && summary.byRecipe.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
              {t('bakerySaleTopItems')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              {summary.byRecipe.map((row, i) => {
                const pct = totalRevenue > 0 ? Math.round((row.totalAmount / totalRevenue) * 100) : 0
                return (
                  <div key={row.recipeId ?? i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[160px]">
                        {row.recipe?.name ?? 'Other'}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0 ml-2">
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

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> {t('bakerySaleHistory')}
              </h2>
              <div className="flex items-center gap-2">
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
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

