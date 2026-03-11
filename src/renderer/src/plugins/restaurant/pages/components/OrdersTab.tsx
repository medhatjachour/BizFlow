import { useEffect, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, ChevronDown, ChevronUp, UtensilsCrossed, X, Clock } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface OrderItem { id: string; itemName: string; quantity: number; unitPrice: number; status: string; notes: string | null }
interface Order { id: string; tableId: string; tableNumber?: number; status: string; serverName: string; subtotal: number; tax: number; total: number; openedAt: string; closedAt: string | null; items?: OrderItem[] }
interface Table { id: string; number: number; capacity: number; status: string; section: string | null }
interface MenuItem { id: string; name: string; category: string; price: number; isAvailable: boolean }

const ORDER_STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ready: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  voided: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
}

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  preparing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  served: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}

function elapsed(openedAt: string) {
  const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000)
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [orderDetail, setOrderDetail] = useState<Order | null>(null)
  const { t } = useLanguage()

  // New order modal
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [newOrderForm, setNewOrderForm] = useState({ tableId: '', serverName: '' })

  // Add item modal
  const [showAddItem, setShowAddItem] = useState<string | null>(null) // orderId
  const [addItemForm, setAddItemForm] = useState({ menuItemId: '', quantity: '1', notes: '' })

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [o, tb, m] = await Promise.all([
        window.api.restaurant.getOrders({ status: filterStatus || undefined }),
        window.api.restaurant.getTables({}),
        window.api.restaurant.getMenuItems()
      ])
      setOrders(o); setTables(tb); setMenuItems(m)
    } catch { setError(t('restaurantLoadOrdersFailed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  const loadDetail = async (id: string) => {
    if (expanded === id) { setExpanded(null); setOrderDetail(null); return }
    setExpanded(id)
    try { setOrderDetail(await window.api.restaurant.getOrder(id)) }
    catch { /* ignore */ }
  }

  const openOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.restaurant.openOrder(newOrderForm)
      setShowNewOrder(false); setNewOrderForm({ tableId: '', serverName: '' }); load()
    } catch (err: any) { alert(err?.message || 'Failed to open order') }
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showAddItem) return
    try {
      const mi = menuItems.find(m => m.id === addItemForm.menuItemId)
      if (!mi) return
      await window.api.restaurant.addOrderItem({ orderId: showAddItem, menuItemId: mi.id, itemName: mi.name, quantity: Number(addItemForm.quantity), unitPrice: mi.price, notes: addItemForm.notes || undefined })
      setShowAddItem(null); setAddItemForm({ menuItemId: '', quantity: '1', notes: '' })
      if (expanded === showAddItem) loadDetail(showAddItem)
      load()
    } catch (err: any) { alert(err?.message || 'Failed to add item') }
  }

  const closeOrder = async (id: string, action: 'pay' | 'void') => {
    if (!confirm(action === 'pay' ? t('restaurantMarkPaidConfirm') : t('restaurantVoidConfirm'))) return
    try { await window.api.restaurant.closeOrder({ id, status: action === 'pay' ? 'paid' : 'voided' }); load() }
    catch (err: any) { alert(err?.message || 'Failed') }
  }

  const updateItemStatus = async (orderId: string, itemId: string, status: string) => {
    try {
      await window.api.restaurant.updateOrderItemStatus({ id: itemId, status })
      loadDetail(orderId)
    } catch { /* ignore */ }
  }

  const activeTableIds = new Set(orders.filter(o => o.status === 'open').map(o => o.tableId))
  const availableTables = tables.filter(t => t.status === 'available' || !activeTableIds.has(t.id))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex gap-2">
          {(['open','ready','paid','voided'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filterStatus === s ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
              {t(`restaurantOrderStatus${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowNewOrder(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> {t('restaurantOpenOrder')}</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
          <UtensilsCrossed className="w-10 h-10 opacity-30" />
          <span>{t('restaurantNoOrders').replace('{status}', filterStatus)}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const isExpanded = expanded === order.id
            return (
              <div key={order.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">
                    {tables.find(t => t.id === order.tableId)?.number ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 dark:text-white">Table {tables.find(t => t.id === order.tableId)?.number ?? '?'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ORDER_STATUS_COLORS[order.status]}`}>{order.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{order.serverName}</span>
                      {order.status === 'open' && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{elapsed(order.openedAt)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-slate-900 dark:text-white">{order.total.toFixed(2)}</div>
                    <div className="text-xs text-slate-400">{order.items?.length ?? 0} {t('restaurantItems')}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {order.status === 'open' && (
                      <>
                        <button onClick={() => { setShowAddItem(order.id); setAddItemForm({ menuItemId: '', quantity: '1', notes: '' }) }}
                          className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">+ Item</button>
                        <button onClick={() => closeOrder(order.id, 'pay')}
                          className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 transition-colors">{t('restaurantPay')}</button>
                        <button onClick={() => closeOrder(order.id, 'void')}
                          className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors">{t('restaurantVoid')}</button>
                      </>
                    )}
                    <button onClick={() => loadDetail(order.id)} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded items */}
                {isExpanded && orderDetail && orderDetail.id === order.id && (
                  <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-2">
                    {(orderDetail.items || []).length === 0 ? (
                      <p className="text-sm text-slate-400">{t('restaurantNoItemsYet')}</p>
                    ) : (
                      (orderDetail.items || []).map(item => (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          <span className="flex-1 text-slate-700 dark:text-slate-300">{item.quantity}× {item.itemName}</span>
                          <span className="text-slate-500">{(item.unitPrice * item.quantity).toFixed(2)}</span>
                          <select value={item.status} onChange={e => updateItemStatus(order.id, item.id, e.target.value)}
                            disabled={order.status !== 'open'}
                            className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium ${ITEM_STATUS_COLORS[item.status]} disabled:opacity-60`}>
                            {['pending','preparing','ready','served'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      ))
                    )}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 flex justify-end gap-4">
                      <span>{t('restaurantSubtotal')}: {order.subtotal.toFixed(2)}</span>
                      <span>{t('restaurantTax')}: {order.tax.toFixed(2)}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{t('restaurantTotal')}: {order.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={openOrder} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('restaurantOpenNewOrder')}</h3>
              <button type="button" onClick={() => setShowNewOrder(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantTable')} *</span>
              <select required value={newOrderForm.tableId} onChange={e => setNewOrderForm(f => ({ ...f, tableId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                <option value="">{t('restaurantSelectTable')}</option>
                {availableTables.map(tb => <option key={tb.id} value={tb.id}>{t('restaurantTable')} {tb.number} ({tb.capacity} {t('restaurantSeats')}){tb.section ? ` — ${tb.section}` : ''}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantServerName')} *</span>
              <input required value={newOrderForm.serverName} onChange={e => setNewOrderForm(f => ({ ...f, serverName: e.target.value }))}
                placeholder={t('restaurantServerNamePlaceholder')}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowNewOrder(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">{t('restaurantCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium">{t('restaurantOpenOrder')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={addItem} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('restaurantAddItemToOrder')}</h3>
              <button type="button" onClick={() => setShowAddItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantMenuItemSelect')} *</span>
              <select required value={addItemForm.menuItemId} onChange={e => setAddItemForm(f => ({ ...f, menuItemId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                <option value="">{t('restaurantSelectItem')}</option>
                {menuItems.filter(m => m.isAvailable).map(m => <option key={m.id} value={m.id}>{m.name} — {m.price.toFixed(2)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantQuantity')}</span>
              <input type="number" min="1" value={addItemForm.quantity} onChange={e => setAddItemForm(f => ({ ...f, quantity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantNotes')}</span>
              <input value={addItemForm.notes} onChange={e => setAddItemForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. no onions"
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAddItem(null)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">{t('restaurantCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium">{t('restaurantAddToOrder')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
