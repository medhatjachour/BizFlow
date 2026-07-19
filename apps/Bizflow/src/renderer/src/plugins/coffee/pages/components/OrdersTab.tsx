/**
 * Coffee – Orders Tab
 * Lists all orders (open / ready / paid / voided) with filter tabs.
 * Supports viewing items, changing item status, and closing/voiding orders.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, ChevronDown, ChevronUp, ClipboardList,
  UtensilsCrossed, Package, Truck, Timer
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth }  from '@renderer/contexts/AuthContext'

// ── Types ────────────────────────────────────────────────────────────────────
interface OrderItem { id: string; productName: string; quantity: number; unitPrice: number; total: number; notes?: string; status: string }
interface Order {
  id: string; orderNumber: string; type: string; status: string
  tableId?: string; table?: { number: number; name?: string }
  customerName?: string; customerPhone?: string; deliveryAddress?: string
  paymentMethod?: string
  subtotal: number; discount: number; tax: number; total: number
  notes?: string; items: OrderItem[]
  cashier?: { username: string; fullName?: string }
  openedAt: string; closedAt?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  open:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ready:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paid:   'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  voided: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
}

const TYPE_ICON: Record<string, typeof UtensilsCrossed> = {
  dine_in:  UtensilsCrossed,
  takeaway: Package,
  delivery: Truck
}

function elapsed(openedAt: string): string {
  const mins = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ── Component ────────────────────────────────────────────────────────────────
export default function OrdersTab() {
  const { user } = useAuth()
  const toast    = useToast()

  const [orders,   setOrders]   = useState<Order[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<string>('open')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Pay modal
  const [payModal,       setPayModal]       = useState<Order | null>(null)
  const [paymentMethod,  setPaymentMethod]  = useState('cash')
  const [paying,         setPaying]         = useState(false)

  // ── Data ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const opts = filter === 'all' ? {} : { status: filter }
      setOrders(await window.api.coffee.orders.getAll(opts) ?? [])
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  // ── Toggle expand ─────────────────────────────────────────────────────────
  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Close order ───────────────────────────────────────────────────────────
  async function handleClose(order: Order) {
    setPaying(true)
    try {
      await window.api.coffee.orders.close({ orderId: order.id, paymentMethod, cashierId: user?.id })
      setPayModal(null); load(); toast.success('Order completed')
    } catch (err: any) { toast.error(err?.message ?? 'Failed') }
    finally { setPaying(false) }
  }

  async function handleVoid(order: Order) {
    if (!confirm('Void this order?')) return
    try { await window.api.coffee.orders.void(order.id); load(); toast.success('Order voided') }
    catch { toast.error('Void failed') }
  }

  async function updateItemStatus(item: OrderItem, status: string) {
    try { await window.api.coffee.orders.updateItemStatus({ id: item.id, status }); load() }
    catch { toast.error('Status update failed') }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const statusTabs = ['open', 'ready', 'paid', 'voided', 'all']

  return (
    <div className="p-4 space-y-4">
      {/* Filter tabs + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {statusTabs.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === s
                  ? 'bg-amber-500 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
              }`}
            >{s}</button>
          ))}
        </div>
        <button onClick={load} className="ml-auto p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
          <ClipboardList className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{loading ? 'Loading…' : 'No orders found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const Icon = TYPE_ICON[order.type] ?? Package
            const isExpanded = expanded.has(order.id)
            return (
              <div key={order.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Order header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{order.orderNumber}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[order.status]}`}>{order.status}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{order.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {order.table ? `Table ${order.table.number}` : order.customerName ?? '—'}
                      {' · '}{order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      {order.status === 'open' && <span className="ml-1 text-amber-500"><Timer className="w-3 h-3 inline" /> {elapsed(order.openedAt)}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-amber-600 dark:text-amber-400">{order.total.toFixed(2)}</p>
                    {order.paymentMethod && (
                      <p className="text-[10px] text-slate-400 capitalize">{order.paymentMethod.replace('_', ' ')}</p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700">
                    {(order.customerName || order.customerPhone || order.deliveryAddress) && (
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700">
                        {order.customerName && <p className="text-[11px] text-slate-600 dark:text-slate-300">Customer: {order.customerName}</p>}
                        {order.customerPhone && <p className="text-[11px] text-slate-500 dark:text-slate-400">Phone: {order.customerPhone}</p>}
                        {order.deliveryAddress && <p className="text-[11px] text-slate-500 dark:text-slate-400">Address: {order.deliveryAddress}</p>}
                      </div>
                    )}

                    {/* Items list */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-48 overflow-y-auto">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 px-4 py-2">
                          <div className="flex-1">
                            <p className="text-xs text-slate-700 dark:text-slate-300">{item.quantity}× {item.productName}</p>
                            {item.notes && <p className="text-[10px] text-slate-400">{item.notes}</p>}
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 shrink-0">{item.total.toFixed(2)}</span>
                          {/* Item status selector for open orders */}
                          {order.status === 'open' && (
                            <select
                              value={item.status}
                              onChange={e => updateItemStatus(item, e.target.value)}
                              className="text-[10px] px-1.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="served">Served</option>
                            </select>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    {order.status === 'open' && (
                      <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-700/30">
                        <button
                          onClick={() => handleVoid(order)}
                          className="flex-1 py-1.5 border border-red-200 dark:border-red-800 text-red-500 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
                        >Void</button>
                        <button
                          onClick={() => { setPayModal(order); setPaymentMethod('cash') }}
                          className="flex-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium"
                        >Complete & Pay</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pay Modal ────────────────────────────────────────────────────── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPayModal(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Complete {payModal.orderNumber}
            </h3>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{payModal.total.toFixed(2)}</p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[['cash','Cash'],['card','Card'],['vodafone_cash','Vodafone']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setPaymentMethod(val)}
                    className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                      paymentMethod === val
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >{lbl}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPayModal(null)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={() => handleClose(payModal)} disabled={paying} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                {paying ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
