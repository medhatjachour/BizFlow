/**
 * Coffee – Inventory Tab  (full rewrite)
 *
 * Dashboard view with:
 *  • KPI cards: total products, total stock units, total inventory value, expected revenue
 *  • Category-grouped inventory list with per-category subtotals
 *  • Per-product: stock bar, value, expected revenue, low-stock alert
 *  • Click any product → stock adjustment modal
 *  • Click the history icon → movement history drawer
 *  • Filter: All | Low Stock | Out of Stock
 *  • Search
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, AlertTriangle, BoxesIcon, Plus, Minus, History,
  TrendingUp, DollarSign, Search, ChevronDown, ChevronUp, Package
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

// ── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; color?: string; icon?: string }
interface Product {
  id: string; name: string; stock: number; reorderPoint: number
  price: number; cost: number; isAvailable: boolean
  categoryId?: string; category?: Category; image?: string
}
interface StockMovement {
  id: string; type: string; quantity: number
  previousStock: number; newStock: number
  reason?: string; notes?: string; createdAt: string
}

const CAT_PILL: Record<string, string> = {
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  green:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}
const catPill = (c?: string) => CAT_PILL[c ?? 'default'] ?? CAT_PILL.default

const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none'

// ── Sub-component: KPI card ───────────────────────────────────────────────────
function KPI({ icon: Icon, label, value, sub, color }: { icon: typeof TrendingUp; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4`}>
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InventoryTab() {
  const toast = useToast()

  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<'all' | 'low' | 'out'>('all')
  const [search,     setSearch]     = useState('')
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set())

  // Adjustment modal
  const [adjProduct, setAdjProduct] = useState<Product | null>(null)
  const [adjQty,     setAdjQty]     = useState('1')
  const [adjType,    setAdjType]    = useState('restock')
  const [adjReason,  setAdjReason]  = useState('')
  const [adjusting,  setAdjusting]  = useState(false)

  // History drawer
  const [histProduct,  setHistProduct]  = useState<Product | null>(null)
  const [movements,    setMovements]    = useState<StockMovement[]>([])
  const [loadingHist,  setLoadingHist]  = useState(false)

  // ── Data ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [prods, cats] = await Promise.all([
        window.api.coffee.products.getAll(),
        window.api.coffee.categories.getAll()
      ])
      setProducts(prods ?? [])
      setCategories(cats ?? [])
    } catch { toast.error('Failed to load inventory') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // ── Computed stats ────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    if (filter === 'low') return p.stock > 0 && p.stock <= p.reorderPoint
    if (filter === 'out') return p.stock === 0
    if (search) return p.name.toLowerCase().includes(search.toLowerCase()) || (p.category?.name.toLowerCase().includes(search.toLowerCase()))
    return true
  }).filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.name.toLowerCase().includes(search.toLowerCase()))

  const lowCount  = products.filter(p => p.stock > 0 && p.stock <= p.reorderPoint).length
  const outCount  = products.filter(p => p.stock === 0).length
  const totalUnits  = products.reduce((s, p) => s + p.stock, 0)
  const invValue    = products.reduce((s, p) => s + p.stock * p.cost, 0)
  const expRevenue  = products.reduce((s, p) => s + p.stock * p.price, 0)

  // ── Group by category ─────────────────────────────────────────────────────
  type Group = { category: Category | null; products: Product[]; totalUnits: number; totalValue: number; expRevenue: number }
  const groups: Group[] = []
  const uncategorised: Product[] = []

  const catMap = new Map<string, Category>(categories.map(c => [c.id, c]))

  for (const p of filtered) {
    if (!p.categoryId) { uncategorised.push(p); continue }
    const g = groups.find(g => g.category?.id === p.categoryId)
    if (g) { g.products.push(p); g.totalUnits += p.stock; g.totalValue += p.stock * p.cost; g.expRevenue += p.stock * p.price }
    else {
      const cat = catMap.get(p.categoryId) ?? null
      groups.push({ category: cat, products: [p], totalUnits: p.stock, totalValue: p.stock * p.cost, expRevenue: p.stock * p.price })
    }
  }
  if (uncategorised.length > 0) {
    groups.push({ category: null, products: uncategorised, totalUnits: uncategorised.reduce((s,p) => s+p.stock,0), totalValue: uncategorised.reduce((s,p) => s+p.stock*p.cost,0), expRevenue: uncategorised.reduce((s,p) => s+p.stock*p.price,0) })
  }

  function toggleCollapse(id: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Adjustment ────────────────────────────────────────────────────────────
  async function handleAdjust() {
    if (!adjProduct) return
    const qty = parseInt(adjQty, 10)
    if (isNaN(qty) || qty === 0) { toast.error('Enter a quantity'); return }
    const finalQty = (adjType === 'waste' || adjType === 'write_off') ? -Math.abs(qty) : Math.abs(qty)
    setAdjusting(true)
    try {
      await window.api.coffee.inventory.adjust({ productId: adjProduct.id, quantity: finalQty, type: adjType, reason: adjReason || undefined })
      setAdjProduct(null); setAdjQty('1'); setAdjReason(''); load(); toast.success('Stock adjusted')
    } catch (err: any) { toast.error(err?.message ?? 'Failed') }
    finally { setAdjusting(false) }
  }

  // ── History ───────────────────────────────────────────────────────────────
  async function openHistory(p: Product) {
    setHistProduct(p); setLoadingHist(true)
    try { setMovements(await window.api.coffee.inventory.getMovements(p.id) ?? []) }
    catch { toast.error('Failed to load history') }
    finally { setLoadingHist(false) }
  }

  const TYPE_LABEL: Record<string, string> = { initial: 'Initial stock', sale: 'Sale', restock: 'Restock', adjustment: 'Adjustment', waste: 'Waste / Spoilage', write_off: 'Write-off' }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-5">

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={BoxesIcon}   label="Total Products"   value={String(products.length)}       sub={`${lowCount} low · ${outCount} out`}  color="bg-amber-500" />
        <KPI icon={Package}     label="Stock Units"      value={totalUnits.toLocaleString()}   sub="across all products"                  color="bg-blue-500"  />
        <KPI icon={DollarSign}  label="Inventory Value"  value={invValue.toFixed(2)}           sub="at cost price"                        color="bg-violet-500" />
        <KPI icon={TrendingUp}  label="Expected Revenue" value={expRevenue.toFixed(2)}         sub="at selling price"                     color="bg-green-500" />
      </div>

      {/* ── Filters + search ─────────────────────────────────────────────── */}
      {(lowCount > 0 || outCount > 0) && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs text-orange-700 dark:text-orange-400">
            {outCount > 0 && <><strong>{outCount}</strong> product{outCount !== 1 ? 's' : ''} out of stock. </>}
            {lowCount > 0 && <><strong>{lowCount}</strong> running low.</>}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search products or categories…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
        </div>
        {(['all','low','out'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'}`}>
            {s === 'all' ? `All (${products.length})` : s === 'low' ? `Low (${lowCount})` : `Out (${outCount})`}
          </button>
        ))}
        <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Category groups ───────────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
          <BoxesIcon className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{loading ? 'Loading…' : 'No products found'}</p>
        </div>
      ) : groups.map(group => {
        const gKey = group.category?.id ?? '__none__'
        const isCollapsed = collapsed.has(gKey)
        const catName = group.category?.name ?? 'Uncategorised'
        const margin = group.totalValue > 0 ? ((group.expRevenue - group.totalValue) / group.expRevenue * 100) : 0

        return (
          <div key={gKey} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Category header — click to collapse */}
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left"
              onClick={() => toggleCollapse(gKey)}>
              {group.category && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${catPill(group.category.color)}`}>
                  {group.category.icon && <span>{group.category.icon}</span>}{catName}
                </span>
              )}
              {!group.category && <span className="text-xs font-medium text-slate-500">Uncategorised</span>}
              <div className="flex-1" />
              <div className="flex items-center gap-4 text-right">
                <div><p className="text-xs text-slate-400">Units</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{group.totalUnits}</p></div>
                <div><p className="text-xs text-slate-400">Value</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{group.totalValue.toFixed(2)}</p></div>
                <div><p className="text-xs text-slate-400">Exp. Rev.</p><p className="text-sm font-bold text-green-600 dark:text-green-400">{group.expRevenue.toFixed(2)}</p></div>
                <div><p className="text-xs text-slate-400">Margin</p><p className={`text-sm font-bold ${margin >= 40 ? 'text-green-600' : margin >= 20 ? 'text-amber-500' : 'text-red-500'}`}>{margin.toFixed(0)}%</p></div>
              </div>
              {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {/* Products in category */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {group.products.map(p => {
                  const isLow = p.stock > 0 && p.stock <= p.reorderPoint
                  const isOut = p.stock === 0
                  const pctFull = Math.min(100, p.reorderPoint > 0 ? (p.stock / (p.reorderPoint * 2)) * 100 : p.stock > 0 ? 100 : 0)
                  const pValue   = p.stock * p.cost
                  const pRevenue = p.stock * p.price

                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      {/* Name + availability */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{p.name}</p>
                          {!p.isAvailable && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">off</span>}
                        </div>
                        {/* Stock bar */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden shrink-0">
                            <div className={`h-full rounded-full transition-all ${isOut ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${pctFull}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${isOut ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{p.stock}</span>
                          <span className="text-[10px] text-slate-400">/ {p.reorderPoint} min</span>
                          {isLow && !isOut && <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 rounded-full font-medium">LOW</span>}
                          {isOut && <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full font-medium">OUT</span>}
                        </div>
                      </div>

                      {/* Value + revenue */}
                      <div className="hidden sm:flex gap-4 text-right shrink-0">
                        <div>
                          <p className="text-[10px] text-slate-400">Cost value</p>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{pValue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Exp. rev.</p>
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400">{pRevenue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Price</p>
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{p.price.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setAdjProduct(p); setAdjQty('1'); setAdjType('restock'); setAdjReason('') }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500" title="Adjust stock">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openHistory(p)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="History">
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Adjust Stock Modal ─────────────────────────────────────────────── */}
      {adjProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAdjProduct(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Adjust Stock</h3>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
              <p className="font-medium text-slate-800 dark:text-white">{adjProduct.name}</p>
              <p className="text-sm text-slate-500">Current stock: <strong className="text-slate-800 dark:text-white">{adjProduct.stock}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Adjustment Type</label>
              <select value={adjType} onChange={e => setAdjType(e.target.value)} className={INPUT}>
                <option value="restock">➕ Restock (add units)</option>
                <option value="adjustment">🔄 Manual correction</option>
                <option value="waste">🗑️ Waste / Spoilage (remove)</option>
                <option value="write_off">❌ Write-off (remove)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
              <input type="number" min={1} value={adjQty} onChange={e => setAdjQty(e.target.value)} className={INPUT} />
              {adjType !== 'restock' && adjType !== 'adjustment' && (
                <p className="text-[10px] text-slate-400 mt-1">Will be subtracted from current stock</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reason <span className="text-slate-400">(optional)</span></label>
              <input type="text" value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="e.g. Monthly count, spillage…" className={INPUT} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdjProduct(null)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleAdjust} disabled={adjusting} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                {adjusting ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Movement History Drawer ───────────────────────────────────────── */}
      {histProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistProduct(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{histProduct.name}</p>
                <p className="text-xs text-slate-400">Current stock: {histProduct.stock}</p>
              </div>
              <button onClick={() => setHistProduct(null)} className="text-slate-400 hover:text-slate-600"><Minus className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingHist ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : movements.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No stock movements recorded</p>
              ) : movements.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.quantity > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {m.quantity > 0 ? <Plus className="w-3 h-3 text-green-600 dark:text-green-400" /> : <Minus className="w-3 h-3 text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{TYPE_LABEL[m.type] ?? m.type}{m.reason ? ` — ${m.reason}` : ''}</p>
                    <p className="text-[10px] text-slate-400">{m.previousStock} → {m.newStock} · {new Date(m.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${m.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
