/**
 * Coffee – Tables Tab
 *
 * AVAILABLE table  → click card  → open "New Order" panel (product grid + mini-cart)
 * OCCUPIED  table  → card shows full order: items, statuses, elapsed time, total
 *                  → Pay / Void / History buttons
 * CLEANING  table  → "Done Cleaning" button to mark available
 *
 * Table history drawer: all past orders with expand/collapse per order
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Minus, Edit2, Trash2, RefreshCw, CheckCircle, X,
  ClipboardList, Users, Layers, Timer, CreditCard, Banknote,
  Smartphone, History, ChevronDown, ChevronUp, Coffee, Search
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth }  from '@renderer/contexts/AuthContext'

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem { id: string; productName: string; quantity: number; unitPrice: number; total: number; notes?: string; status: string }
interface ActiveOrder { id: string; orderNumber: string; status: string; total: number; subtotal: number; discount: number; items: OrderItem[]; openedAt: string; notes?: string; paymentMethod?: string }
interface HistoryOrder {
  id: string; orderNumber: string; status: string; total: number
  paymentMethod?: string; openedAt: string; closedAt?: string
  items: { productName: string; quantity: number; total: number }[]
  cashier?: { username: string; fullName?: string }
}
interface CoffeeTable {
  id: string; number: number; name?: string
  capacity: number; section?: string; status: string; isActive: boolean
  orders: ActiveOrder[]; _count: { orders: number }
}
interface Product { id: string; name: string; price: number; image?: string; categoryId?: string; isAvailable: boolean }
interface Category { id: string; name: string; color?: string; icon?: string }
interface NewItem { productId: string; productName: string; price: number; quantity: number }

// ── Helpers ───────────────────────────────────────────────────────────────────
function elapsed(openedAt: string) {
  const m = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}
const CARD_BG: Record<string, string> = {
  available: 'border-l-4 border-l-emerald-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
  occupied:  'border-l-4 border-l-amber-500  bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800',
  cleaning:  'border-l-4 border-l-blue-500   bg-blue-50/60 dark:bg-blue-900/10  border border-blue-200  dark:border-blue-800'
}
const STATUS_DOT: Record<string, string> = {
  available: 'bg-emerald-500', occupied: 'bg-amber-500 animate-pulse', cleaning: 'bg-blue-500'
}
const ITEM_ST: Record<string, string> = {
  pending:   'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300',
  preparing: 'bg-orange-200 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ready:     'bg-green-200 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  served:    'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
}
const CAT_PILL: Record<string, string> = {
  amber:'bg-amber-100 text-amber-700',orange:'bg-orange-100 text-orange-700',
  teal:'bg-teal-100 text-teal-700',green:'bg-green-100 text-green-700',
  violet:'bg-violet-100 text-violet-700',blue:'bg-blue-100 text-blue-700',
  default:'bg-slate-100 text-slate-600'
}
const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none'

// ── Image loader ───────────────────────────────────────────────────────────────
function ProductImg({ image, name }: { image?: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    if (image) window.api.coffee.products.loadImage(image).then(setSrc).catch(() => setSrc(null))
    else setSrc(null)
  }, [image])
  return src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : <Coffee className="w-6 h-6 text-amber-300" />
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TablesTab() {
  const { user } = useAuth()
  const toast    = useToast()

  const [tables,  setTables]  = useState<CoffeeTable[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all'|'available'|'occupied'|'cleaning'>('all')

  // Table form modal
  const [tableModal, setTableModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CoffeeTable | null>(null)
  const [form,       setForm]       = useState({ number: '', name: '', capacity: '4', section: '' })
  const [saving,     setSaving]     = useState(false)

  // NEW ORDER panel (available table clicked)
  const [newOrderTable,    setNewOrderTable]    = useState<CoffeeTable | null>(null)
  const [products,         setProducts]         = useState<Product[]>([])
  const [categories,       setCategories]       = useState<Category[]>([])
  const [prodLoading,      setProdLoading]      = useState(false)
  const [newItems,         setNewItems]         = useState<NewItem[]>([])
  const [newOrderNotes,    setNewOrderNotes]    = useState('')
  const [prodSearch,       setProdSearch]       = useState('')
  const [prodCat,          setProdCat]          = useState('all')
  const [creatingOrder,    setCreatingOrder]    = useState(false)
  const [activeShift,      setActiveShift]      = useState<any>(null)

  // ORDER PANEL (occupied table)
  const [orderPanel,    setOrderPanel]    = useState<{ table: CoffeeTable; order: ActiveOrder } | null>(null)
  const [payMethod,     setPayMethod]     = useState('cash')
  const [closing,       setClosing]       = useState(false)

  // HISTORY drawer
  const [histTable,     setHistTable]     = useState<CoffeeTable | null>(null)
  const [history,       setHistory]       = useState<HistoryOrder[]>([])
  const [loadingHist,   setLoadingHist]   = useState(false)
  const [expandedOrd,   setExpandedOrd]   = useState<string | null>(null)

  // ── Data ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tbls, shift] = await Promise.all([
        window.api.coffee.tables.getAll(),
        window.api.coffee.shifts.getActive()
      ])
      setTables(tbls ?? [])
      setActiveShift(shift)
    } catch { toast.error('Failed to load tables') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function openNewOrder(t: CoffeeTable) {
    setNewOrderTable(t); setNewItems([]); setNewOrderNotes(''); setProdSearch(''); setProdCat('all')
    setProdLoading(true)
    try {
      const [prods, cats] = await Promise.all([
        window.api.coffee.products.getAll({ available: true }),
        window.api.coffee.categories.getAll()
      ])
      setProducts(prods ?? []); setCategories(cats ?? [])
    } catch { toast.error('Failed to load products') }
    finally { setProdLoading(false) }
  }

  const counts  = tables.reduce((a, t) => { a[t.status] = (a[t.status] || 0) + 1; return a }, {} as Record<string, number>)
  const visible = filter === 'all' ? tables : tables.filter(t => t.status === filter)

  // ── Table CRUD ────────────────────────────────────────────────────────────
  function openCreate() { setEditTarget(null); setForm({ number: String(tables.length + 1), name: '', capacity: '4', section: '' }); setTableModal(true) }
  function openEdit(t: CoffeeTable) { setEditTarget(t); setForm({ number: String(t.number), name: t.name ?? '', capacity: String(t.capacity), section: t.section ?? '' }); setTableModal(true) }

  async function handleSave() {
    if (!form.number) { toast.error('Table number required'); return }
    setSaving(true)
    try {
      const data = { number: +form.number, name: form.name || undefined, capacity: +form.capacity, section: form.section || undefined }
      if (editTarget) await window.api.coffee.tables.update({ id: editTarget.id, ...data })
      else            await window.api.coffee.tables.create(data)
      setTableModal(false); load(); toast.success(editTarget ? 'Table updated' : 'Table created')
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(t: CoffeeTable) {
    if (!confirm(`Delete Table ${t.number}?`)) return
    try { await window.api.coffee.tables.delete(t.id); load(); toast.success('Removed') }
    catch (err: any) { toast.error(err?.message ?? 'Failed') }
  }
  async function setStatus(t: CoffeeTable, status: string) {
    try { await window.api.coffee.tables.update({ id: t.id, status }); load() }
    catch { toast.error('Status update failed') }
  }

  // ── New order items helpers ────────────────────────────────────────────────
  function addNewItem(p: Product) {
    setNewItems(prev => {
      const i = prev.findIndex(x => x.productId === p.id)
      if (i >= 0) { const n = [...prev]; n[i].quantity++; return n }
      return [...prev, { productId: p.id, productName: p.name, price: p.price, quantity: 1 }]
    })
  }
  function changeNewItemQty(productId: string, d: number) {
    setNewItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + d } : i).filter(i => i.quantity > 0))
  }

  const newOrderTotal = newItems.reduce((s, i) => s + i.price * i.quantity, 0)

  async function handleCreateOrder() {
    if (!newOrderTable) return
    if (!newItems.length) { toast.error('Add at least one item'); return }
    setCreatingOrder(true)
    try {
      await window.api.coffee.orders.create({
        type:      'dine_in',
        tableId:   newOrderTable.id,
        cashierId: user?.id,
        shiftId:   activeShift?.id ?? undefined,
        notes:     newOrderNotes || undefined,
        items:     newItems.map(i => ({ productId: i.productId, productName: i.productName, unitPrice: i.price, quantity: i.quantity }))
      })
      setNewOrderTable(null); load(); toast.success(`Order created for Table ${newOrderTable.number}`)
    } catch (err: any) { toast.error(err?.message ?? 'Failed to create order') }
    finally { setCreatingOrder(false) }
  }

  // ── Order panel actions ────────────────────────────────────────────────────
  async function handlePay(order: ActiveOrder) {
    setClosing(true)
    try {
      await window.api.coffee.orders.close({ orderId: order.id, paymentMethod: payMethod, cashierId: user?.id })
      setOrderPanel(null); load(); toast.success('Order paid ✓')
    } catch (err: any) { toast.error(err?.message ?? 'Failed') }
    finally { setClosing(false) }
  }
  async function handleVoid(order: ActiveOrder) {
    if (!confirm('Void this order?')) return
    try { await window.api.coffee.orders.void(order.id); setOrderPanel(null); load(); toast.success('Voided') }
    catch { toast.error('Void failed') }
  }
  async function cycleItemStatus(itemId: string, current: string) {
    const next = current === 'pending' ? 'preparing' : current === 'preparing' ? 'ready' : current === 'ready' ? 'served' : 'pending'
    try { await window.api.coffee.orders.updateItemStatus({ id: itemId, status: next }); load() }
    catch { toast.error('Update failed') }
  }

  // ── History ────────────────────────────────────────────────────────────────
  async function openHistory(t: CoffeeTable) {
    setHistTable(t); setLoadingHist(true); setHistory([])
    try { setHistory(await window.api.coffee.tables.getHistory(t.id) ?? []) }
    catch { toast.error('Failed to load history') }
    finally { setLoadingHist(false) }
  }

  // ── Filtered products for new-order panel ─────────────────────────────────
  const visibleProds = products.filter(p => {
    if (prodCat !== 'all' && p.categoryId !== prodCat) return false
    if (prodSearch && !p.name.toLowerCase().includes(prodSearch.toLowerCase())) return false
    return true
  })

  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-4 space-y-4">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(['all','available','occupied','cleaning'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === s ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'}`}>
              {s === 'all' ? `All (${tables.length})` : `${s} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Table
          </button>
        </div>
      </div>

      {/* ── Floor map ────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <Layers className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{loading ? 'Loading…' : 'No tables'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visible.map(table => {
            const order = table.orders?.[0] ?? null
            return (
              <div key={table.id} className={`rounded-xl p-3 flex flex-col gap-2 shadow-sm ${CARD_BG[table.status] ?? CARD_BG.available}`}>

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[table.status]}`} />
                      <span className="text-base font-bold text-slate-900 dark:text-white">T{table.number}</span>
                      {table.name && <span className="text-xs text-slate-500 truncate max-w-[70px]">{table.name}</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 ml-4">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{table.capacity}</span>
                      {table.section && <span className="text-xs text-slate-400">· {table.section}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                    table.status === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    table.status === 'occupied'  ? 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400'  :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>{table.status}</span>
                </div>

                {/* OCCUPIED: order detail */}
                {order ? (
                  <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-2.5 space-y-2 border border-amber-100 dark:border-amber-800/40 cursor-pointer hover:border-amber-300 transition-colors"
                    onClick={() => { setOrderPanel({ table, order }); setPayMethod('cash') }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{order.orderNumber}</span>
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Timer className="w-3 h-3" />
                        <span className="text-[10px] font-medium">{elapsed(order.openedAt)}</span>
                      </div>
                    </div>
                    {/* Item list (clickable to cycle status) */}
                    <div className="space-y-1">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-1" onClick={e => { e.stopPropagation(); cycleItemStatus(item.id, item.status) }}>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold cursor-pointer hover:opacity-80 shrink-0 ${ITEM_ST[item.status] ?? ITEM_ST.pending}`}>{item.status}</span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{item.quantity}× {item.productName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {order.notes && <p className="text-[10px] italic text-slate-400">{order.notes}</p>}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''} · tap to manage</span>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : table.status === 'available' ? (
                  /* AVAILABLE: big "New Order" button */
                  <button onClick={() => openNewOrder(table)}
                    className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer">
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-semibold">New Order</span>
                  </button>
                ) : (
                  <div className="py-3 text-center text-xs text-blue-500 dark:text-blue-400">Being cleaned…</div>
                )}

                {/* Footer actions */}
                <div className="flex gap-1 border-t border-slate-100 dark:border-slate-700/50 pt-1.5">
                  {table.status === 'available' && (
                    <button onClick={() => setStatus(table, 'cleaning')}
                      className="flex-1 py-1 text-[10px] text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      🧹 Cleaning
                    </button>
                  )}
                  {table.status === 'cleaning' && (
                    <button onClick={() => setStatus(table, 'available')}
                      className="flex-1 py-1 text-[10px] text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 flex items-center justify-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> Done
                    </button>
                  )}
                  <button onClick={() => openHistory(table)}
                    className="py-1 px-2 text-[10px] text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-0.5">
                    <History className="w-3 h-3" />{table._count?.orders ?? 0}
                  </button>
                  <button onClick={() => openEdit(table)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {table.status !== 'occupied' && (
                    <button onClick={() => handleDelete(table)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          NEW ORDER PANEL — full-screen modal with product grid + mini cart
      ═══════════════════════════════════════════════════════════════════ */}
      {newOrderTable && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNewOrderTable(null)} />
          <div className="relative bg-slate-50 dark:bg-slate-900 w-full max-w-4xl flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">New Order — Table {newOrderTable.number}</h2>
                <p className="text-xs text-slate-400">{newOrderTable.section ?? 'No section'} · {newOrderTable.capacity} seats</p>
              </div>
              <button onClick={() => setNewOrderTable(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Product grid (left) */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4">
                {/* Search + cats */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Search products…" value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
                  </div>
                </div>
                <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide pb-1">
                  <button onClick={() => setProdCat('all')} className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${prodCat === 'all' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>All</button>
                  {categories.map(c => (
                    <button key={c.id} onClick={() => setProdCat(c.id)} className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-0.5 ${prodCat === c.id ? 'bg-amber-500 text-white' : (CAT_PILL[c.color ?? 'default'] ?? CAT_PILL.default)}`}>
                      {c.icon && <span>{c.icon}</span>}{c.name}
                    </button>
                  ))}
                </div>

                {prodLoading ? (
                  <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {visibleProds.map(p => {
                      const qty = newItems.find(i => i.productId === p.id)?.quantity ?? 0
                      return (
                        <button key={p.id} onClick={() => addNewItem(p)}
                          className={`bg-white dark:bg-slate-800 rounded-xl border-2 p-2.5 text-left hover:border-amber-400 hover:shadow-md transition-all active:scale-95 relative ${qty > 0 ? 'border-amber-400 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700'}`}>
                          {qty > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{qty}</span>}
                          <div className="aspect-square rounded-lg bg-amber-50 dark:bg-slate-700 mb-1.5 flex items-center justify-center overflow-hidden">
                            <ProductImg image={p.image} name={p.name} />
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-white line-clamp-2 leading-tight">{p.name}</p>
                          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{p.price.toFixed(2)}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Mini cart (right) */}
              <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">Order Items</p>
                </div>

                {newItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <ClipboardList className="w-8 h-8 mb-1 opacity-30" />
                    <p className="text-xs">Tap products to add</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {newItems.map(item => (
                      <div key={item.productId} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{item.productName}</p>
                          <p className="text-[10px] text-slate-400">{item.price.toFixed(2)} × {item.quantity}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">{(item.price * item.quantity).toFixed(2)}</span>
                        <div className="flex gap-0.5 shrink-0">
                          <button onClick={() => changeNewItemQty(item.productId, -1)} className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold leading-5">{item.quantity}</span>
                          <button onClick={() => addNewItem({ id: item.productId, name: item.productName, price: item.price, image: undefined, isAvailable: true })}
                            className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes + total + button */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-3 shrink-0">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                    <input type="text" value={newOrderNotes} onChange={e => setNewOrderNotes(e.target.value)} placeholder="Special instructions…"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-amber-600 dark:text-amber-400">{newOrderTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={handleCreateOrder} disabled={creatingOrder || !newItems.length}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors">
                    {creatingOrder ? 'Creating…' : 'Open Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ORDER PANEL — manage occupied table's order
      ═══════════════════════════════════════════════════════════════════ */}
      {orderPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOrderPanel(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Table {orderPanel.table.number} — {orderPanel.order.orderNumber}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Opened {new Date(orderPanel.order.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {elapsed(orderPanel.order.openedAt)} ago
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{orderPanel.order.total.toFixed(2)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  orderPanel.order.status === 'paid'   ? 'bg-green-100 text-green-700' :
                  orderPanel.order.status === 'voided' ? 'bg-red-100 text-red-600' :
                  'bg-amber-100 text-amber-700'
                }`}>{orderPanel.order.status}</span>
              </div>
              <button onClick={() => setOrderPanel(null)} className="text-slate-400 hover:text-slate-600 ml-4"><X className="w-5 h-5" /></button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {orderPanel.order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-white">{item.quantity}× {item.productName}</p>
                    {item.notes && <p className="text-[10px] text-slate-400 italic">{item.notes}</p>}
                  </div>
                  <p className="text-sm font-medium text-slate-500 shrink-0">{item.total.toFixed(2)}</p>
                  <button onClick={() => cycleItemStatus(item.id, item.status)}
                    className={`text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 hover:opacity-80 transition-opacity ${ITEM_ST[item.status] ?? ITEM_ST.pending}`}>
                    {item.status}
                  </button>
                </div>
              ))}
              {orderPanel.order.notes && <p className="px-5 py-2 text-xs italic text-slate-400">Note: {orderPanel.order.notes}</p>}
            </div>

            {/* Payment */}
            {orderPanel.order.status === 'open' && (
              <div className="p-5 border-t border-slate-100 dark:border-slate-700 space-y-3 shrink-0">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ v:'cash', l:'Cash', I: Banknote }, { v:'card', l:'Card', I: CreditCard }, { v:'vodafone_cash', l:'Vodafone', I: Smartphone }].map(({ v, l, I }) => (
                      <button key={v} onClick={() => setPayMethod(v)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${payMethod === v ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                        <I className="w-4 h-4" />{l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleVoid(orderPanel.order)}
                    className="flex-1 py-2.5 border border-red-200 dark:border-red-800 text-red-500 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                    Void
                  </button>
                  <button onClick={() => handlePay(orderPanel.order)} disabled={closing}
                    className="flex-2 px-8 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
                    {closing ? 'Processing…' : `Pay ${orderPanel.order.total.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
            {(orderPanel.order.status === 'paid' || orderPanel.order.status === 'voided') && (
              <div className="p-5 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <p className="text-xs text-center text-slate-400">
                  {orderPanel.order.status === 'paid' ? `✓ Paid via ${orderPanel.order.paymentMethod?.replace('_',' ') ?? '—'}` : '✗ Voided'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add/Edit Table Modal ──────────────────────────────────────────── */}
      {tableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTableModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{editTarget ? 'Edit Table' : 'Add Table'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Number *</label><input type="number" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} className={INPUT} /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Capacity</label><input type="number" min={1} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className={INPUT} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Display Name</label><input type="text" value={form.name} placeholder="e.g. Window Seat" onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={INPUT} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Section</label><input type="text" value={form.section} placeholder="Indoor, Outdoor, Bar…" onChange={e => setForm(p => ({ ...p, section: e.target.value }))} className={INPUT} /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTableModal(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Drawer ────────────────────────────────────────────────── */}
      {histTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistTable(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Table {histTable.number} — History</p>
                {histTable.section && <p className="text-xs text-slate-400">{histTable.section}</p>}
              </div>
              <button onClick={() => setHistTable(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingHist ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <History className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">No orders yet</p>
                </div>
              ) : history.map(ord => (
                <div key={ord.id} className={`rounded-xl border overflow-hidden ${ord.status === 'paid' ? 'border-green-200 dark:border-green-800/40' : 'border-red-200 dark:border-red-800/40'}`}>
                  <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    onClick={() => setExpandedOrd(expandedOrd === ord.id ? null : ord.id)}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ord.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>{ord.status}</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-white">{ord.orderNumber}</span>
                      {ord.paymentMethod && <span className="text-[10px] text-slate-400 capitalize">{ord.paymentMethod.replace('_',' ')}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{ord.total.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400">{ord.closedAt ? new Date(ord.closedAt).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : new Date(ord.openedAt).toLocaleDateString()}</p>
                      </div>
                      {expandedOrd === ord.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {expandedOrd === ord.id && (
                    <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
                      {ord.items.map((item, i) => (
                        <div key={i} className="flex justify-between px-4 py-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400">{item.quantity}× {item.productName}</span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                      {ord.cashier && <p className="px-4 py-2 text-[10px] text-slate-400">Cashier: {ord.cashier.fullName ?? ord.cashier.username}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
