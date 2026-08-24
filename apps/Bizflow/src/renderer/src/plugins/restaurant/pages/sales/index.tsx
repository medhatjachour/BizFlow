// src/plugins/restaurant/pages/sales/index.tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  Receipt,
  Printer,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Eye
} from 'lucide-react'
import { sounds } from '../utils/sound'
import { ThermalPrinter } from '../utils/printer'

export default function SalesAndOrdersHistoryPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month'>('today')

  const [inspectingOrder, setInspectingOrder] = useState<any | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      let startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()

      if (dateRange === 'yesterday') {
        const y = new Date(Date.now() - 86400000)
        startDate = new Date(y.setHours(0, 0, 0, 0)).toISOString()
      } else if (dateRange === 'week') {
        startDate = new Date(Date.now() - 7 * 86400000).toISOString()
      } else if (dateRange === 'month') {
        startDate = new Date(Date.now() - 30 * 86400000).toISOString()
      }

      const list = await window.api.restaurant.getOrders({
        startDate,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        orderType: orderTypeFilter === 'ALL' ? undefined : orderTypeFilter
      })
      setOrders(list || [])
    } finally {
      setLoading(false)
    }
  }, [dateRange, statusFilter, orderTypeFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Filtered list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const query = searchQuery.trim().toLowerCase()
      return (
        query === '' ||
        String(o.orderNumber).includes(query) ||
        (o.serverName && o.serverName.toLowerCase().includes(query)) ||
        (o.table?.number && String(o.table.number).includes(query)) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(query))
      )
    })
  }, [orders, searchQuery])

  // Financial KPI Metrics
  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status === 'paid')
    const totalSales = paid.reduce((s, o) => s + (o.total || 0), 0)
    const totalTips = paid.reduce((s, o) => s + (o.tipAmount || 0), 0)
    const totalVoids = orders.filter((o) => o.status === 'voided').length
    const avgCheck = paid.length > 0 ? totalSales / paid.length : 0

    return { totalChecks: orders.length, paidChecks: paid.length, totalSales, totalTips, totalVoids, avgCheck }
  }, [orders])

  const handlePrintReceipt = (order: any) => {
    sounds.playSuccess()
    const text = ThermalPrinter.buildGuestReceipt(order)
    console.log('[ESC/POS Thermal Output]\n', text)
    window.print()
  }

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* ─── Sales KPI Summary Strip ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Settled Gross Sales
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ${stats.totalSales.toFixed(2)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Average Check Size
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              ${stats.avgCheck.toFixed(2)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Settled Checks
            </span>
            <span className="text-2xl font-black text-purple-600">
              {stats.paidChecks} / {stats.totalChecks}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Total Tips Collected
            </span>
            <span className="text-2xl font-black text-blue-600">
              ${stats.totalTips.toFixed(2)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── Filter & Search Ribbon ───────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Date presets */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          {(['today', 'yesterday', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                sounds.playBump()
                setDateRange(r)
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all ${
                dateRange === r
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {r === 'today' ? 'Today' : r === 'yesterday' ? 'Yesterday' : r === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search check #, server, table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              sounds.playBump()
              setStatusFilter(e.target.value)
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="paid">Paid & Settled</option>
            <option value="open">Active Open</option>
            <option value="billing">Billing Out</option>
            <option value="voided">Voided</option>
          </select>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Orders Table ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                <th className="py-3.5 px-4">Check #</th>
                <th className="py-3.5 px-4">Table / Type</th>
                <th className="py-3.5 px-4">Server</th>
                <th className="py-3.5 px-4">Time Opened</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredOrders.map((ord) => {
                const isPaid = ord.status === 'paid'
                const isVoided = ord.status === 'voided'

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                      #{ord.orderNumber || ord.id.slice(0, 5)}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {ord.table ? `Table #${ord.table.number}` : ord.orderType.toUpperCase()}
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-semibold">
                      {ord.serverName || 'Staff'}
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-medium">
                      {new Date(ord.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">
                      {ord.items?.length || 0} items
                    </td>

                    <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                      ${ord.total.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : isVoided
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : isVoided ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {ord.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playBump()
                          setInspectingOrder(ord)
                        }}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 inline-flex items-center"
                        title="Inspect Check Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(ord)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-300 inline-flex items-center transition-colors"
                        title="Reprint Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-xs font-semibold">
                    No orders matching your criteria found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Inspect Check Detail Modal ───────────────────────────── */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Check #{inspectingOrder.orderNumber || inspectingOrder.id.slice(0, 5)} Audit
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectingOrder.table ? `Table #${inspectingOrder.table.number}` : inspectingOrder.orderType} • Server: {inspectingOrder.serverName}
                </p>
              </div>
              <button onClick={() => setInspectingOrder(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {inspectingOrder.items.map((it: any) => (
                <div key={it.id} className="py-2 flex justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {it.quantity}x {it.itemName}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase">
                      Seat {it.seatNumber || 1} • {it.course}
                    </span>
                  </div>
                  <span className="font-black text-slate-900 dark:text-white">
                    ${(it.unitPrice * it.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>${inspectingOrder.subtotal.toFixed(2)}</span>
              </div>
              {inspectingOrder.discountAmount > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Discount:</span>
                  <span>-${inspectingOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {inspectingOrder.tipAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Gratuity:</span>
                  <span>${inspectingOrder.tipAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Total Settled:</span>
                <span className="text-emerald-600">${inspectingOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handlePrintReceipt(inspectingOrder)}
              className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}