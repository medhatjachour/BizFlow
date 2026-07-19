/**
 * Coffee – Sales Tab
 * History of all completed (paid) orders with filters and summary cards.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Receipt, TrendingUp, Banknote, CreditCard, Smartphone,
  UtensilsCrossed, Package, Truck, ChevronDown, ChevronUp
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

// ── Types ────────────────────────────────────────────────────────────────────
interface SaleItem { id: string; productName: string; quantity: number; unitPrice: number; total: number }
interface Sale {
  id: string; orderNumber: string; type: string; paymentMethod?: string
  customerName?: string; table?: { number: number }
  cashier?: { username: string; fullName?: string }
  subtotal: number; discount: number; total: number
  items: SaleItem[]; closedAt?: string
}
interface SummaryData {
  totalRevenue: number; totalOrders: number; avgOrderValue: number
  cash: number; card: number; vodafoneCash: number
  dineIn: number; takeaway: number; delivery: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: 'Today',    value: 'today'  },
  { label: 'Week',     value: 'week'   },
  { label: 'Month',    value: 'month'  },
  { label: 'All Time', value: 'all'    }
]

function periodDates(period: string): { startDate?: string; endDate?: string } {
  const now = new Date()
  if (period === 'today') {
    const s = new Date(now); s.setHours(0,0,0,0)
    const e = new Date(now); e.setHours(23,59,59,999)
    return { startDate: s.toISOString(), endDate: e.toISOString() }
  }
  if (period === 'week') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0,0,0,0)
    return { startDate: s.toISOString() }
  }
  if (period === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: s.toISOString() }
  }
  return {}
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SalesTab() {
  const toast = useToast()

  const [period,   setPeriod]   = useState('today')
  const [sales,    setSales]    = useState<Sale[]>([])
  const [summary,  setSummary]  = useState<SummaryData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [page,     setPage]     = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const opts = { ...periodDates(period), page, pageSize: 50 }
    try {
      const [salesRes, sumRes] = await Promise.all([
        window.api.coffee.sales.getAll(opts),
        window.api.coffee.sales.getSummary(periodDates(period))
      ])
      setSales(salesRes?.items ?? [])
      setTotalPages(salesRes?.totalPages ?? 1)
      setSummary(sumRes)
    } catch { toast.error('Failed to load sales') }
    finally { setLoading(false) }
  }, [period, page])

  useEffect(() => { setPage(1) }, [period])
  useEffect(() => { load() }, [load])

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const PAY_ICONS: Record<string, typeof Banknote> = { cash: Banknote, card: CreditCard, vodafone_cash: Smartphone }
  const TYPE_ICONS: Record<string, typeof UtensilsCrossed> = { dine_in: UtensilsCrossed, takeaway: Package, delivery: Truck }

  return (
    <div className="p-4 space-y-4">
      {/* Period filter + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === value
                  ? 'bg-amber-500 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
              }`}
            >{label}</button>
          ))}
        </div>
        <button onClick={load} className="ml-auto p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Revenue',    value: summary.totalRevenue.toFixed(2), icon: TrendingUp, color: 'emerald' },
            { label: 'Orders',     value: String(summary.totalOrders),     icon: Receipt,    color: 'amber'   },
            { label: 'Avg. Order', value: summary.avgOrderValue.toFixed(2),icon: TrendingUp, color: 'teal'    },
            { label: 'Cash',       value: summary.cash.toFixed(2),         icon: Banknote,   color: 'green'   }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-xl border border-${color}-100 dark:border-${color}-800/30 p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                <span className={`text-xs text-${color}-700 dark:text-${color}-400 font-medium`}>{label}</span>
              </div>
              <p className={`text-lg font-bold text-${color}-800 dark:text-${color}-300`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Payment breakdown */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Cash',         summary.cash.toFixed(2),           Banknote,   'amber'  ],
            ['Card',         summary.card.toFixed(2),           CreditCard, 'blue'   ],
            ['Vodafone',     summary.vodafoneCash.toFixed(2),   Smartphone, 'rose'   ]
          ].map(([label, value, Icon, color]: any) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
              <Icon className={`w-4 h-4 text-${color}-500 mx-auto mb-1`} />
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sales list */}
      {sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
          <Receipt className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{loading ? 'Loading…' : 'No sales in this period'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map(sale => {
            const PayIcon  = PAY_ICONS[sale.paymentMethod ?? ''] ?? Banknote
            const TypeIcon = TYPE_ICONS[sale.type] ?? Package
            const isExpanded = expanded.has(sale.id)
            return (
              <div key={sale.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  onClick={() => toggleExpand(sale.id)}
                >
                  <TypeIcon className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{sale.orderNumber}</p>
                    <p className="text-xs text-slate-500">
                      {sale.table ? `Table ${sale.table.number}` : sale.customerName ?? '—'}
                      {sale.closedAt ? ` · ${new Date(sale.closedAt).toLocaleTimeString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <PayIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{sale.total.toFixed(2)}</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
                    {sale.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center px-4 py-1.5">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{item.quantity}× {item.productName}</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300">{item.total.toFixed(2)}</span>
                      </div>
                    ))}
                    {sale.discount > 0 && (
                      <div className="flex justify-between px-4 py-1.5">
                        <span className="text-xs text-green-600">Discount</span>
                        <span className="text-xs text-green-600">−{sale.discount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Prev</button>
          <span className="px-3 py-1.5 text-xs text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Next</button>
        </div>
      )}
    </div>
  )
}
