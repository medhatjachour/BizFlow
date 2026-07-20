import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Wallet, CreditCard, Smartphone, Banknote,
  AlertCircle, Download, Search, CalendarRange
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

interface FinanceOverview {
  netSales: number
  grossSales: number
  totalDiscount: number
  totalOrders: number
  averageOrderValue: number
  cogs: number
  operationalExpenses: number
  expenseCount: number
  totalExpenses: number
  grossProfit: number
  netProfitAfterExpenses: number
  grossMarginPct: number
  avgDiscountPerOrder: number
  discountedOrders: number
  discountOrderRatePct: number
  payment: Record<string, number>
  paymentPct: Record<string, number>
  refundsAndVoids: number
  openOrdersCount: number
  openOrdersValue: number
  shiftStats: {
    openingCash: number
    cashSales: number
    closingCash: number
    cashDifference: number
    closedShifts: number
    expectedDrawer: number
    linkedExpenseTotal: number
    expectedAfterExpenses: number
  }
}

interface Transaction {
  id: string
  orderNumber: string
  type: string
  total: number
  subtotal: number
  discount: number
  paymentMethod?: string
  closedAt?: string
  customerName?: string
  customerPhone?: string
  table?: { number: number; name?: string }
  cashier?: { username: string; fullName?: string }
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function applyPreset(preset: 'today' | 'week' | 'month' | 'all') {
  if (preset === 'all') return { from: '', to: '' }
  const to = endOfToday()
  const from = startOfToday()
  if (preset === 'week') from.setDate(from.getDate() - 6)
  if (preset === 'month') from.setDate(1)
  return { from: fmtDate(from), to: fmtDate(to) }
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function FinanceTab() {
  const toast = useToast()
  const initial = applyPreset('month')

  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [paymentMethod, setPaymentMethod] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [tx, setTx] = useState<Transaction[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const filters = useMemo(() => ({
    startDate: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    endDate: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined
  }), [from, to])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, transactions] = await Promise.all([
        window.api.coffee.finance.getOverview(filters),
        window.api.coffee.finance.getTransactions({
          ...filters,
          paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
          type: type === 'all' ? undefined : type,
          search: search.trim() || undefined,
          page,
          pageSize: 25
        })
      ])
      setOverview(ov)
      setTx(transactions?.items ?? [])
      setTotalPages(transactions?.totalPages ?? 1)
    } catch {
      toast.error('Failed to load coffee finance')
    } finally {
      setLoading(false)
    }
  }, [filters, paymentMethod, type, search, page, toast])

  useEffect(() => { setPage(1) }, [paymentMethod, type, from, to])
  useEffect(() => { load() }, [load])

  const exportCsv = () => {
    const lines = [
      'Coffee Finance',
      `From,${from || 'All Time'}`,
      `To,${to || 'All Time'}`,
      '',
      'Transactions',
      'Order,Type,Payment,Cashier,Customer,Subtotal,Discount,Total,Closed At',
      ...tx.map(row => [
        row.orderNumber,
        row.type,
        row.paymentMethod || '',
        row.cashier?.fullName || row.cashier?.username || '',
        row.customerName || '',
        row.subtotal.toFixed(2),
        row.discount.toFixed(2),
        row.total.toFixed(2),
        row.closedAt || ''
      ].join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `coffee-finance-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const drawerVariance = overview ? overview.shiftStats.closingCash - overview.shiftStats.expectedDrawer : 0

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['today', 'week', 'month', 'all'] as const).map(preset => (
          <button
            key={preset}
            onClick={() => {
              const range = applyPreset(preset)
              setFrom(range.from)
              setTo(range.to)
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
          >
            {preset === 'all' ? 'All Time' : preset[0].toUpperCase() + preset.slice(1)}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="relative">
            <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          <select value={type} onChange={e => setType(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <option value="all">All Types</option>
            <option value="dine_in">Dine In</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="vodafone_cash">Vodafone</option>
          </select>
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCsv} className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-3">
          <Kpi label="Net Sales" value={overview.netSales.toFixed(2)} tone="text-emerald-600" sub="paid revenue" />
          <Kpi label="Gross Sales" value={overview.grossSales.toFixed(2)} tone="text-sky-600" sub="before discounts" />
          <Kpi label="COGS" value={overview.cogs.toFixed(2)} tone="text-rose-600" sub="product costs" />
          <Kpi label="Ops. Expenses" value={overview.operationalExpenses.toFixed(2)} tone="text-orange-600" sub={`${overview.expenseCount} entries`} />
          <Kpi label="Gross Profit" value={overview.grossProfit.toFixed(2)} tone="text-teal-600" sub={`${overview.grossMarginPct.toFixed(1)}% margin`} />
          <Kpi label="Net Profit" value={overview.netProfitAfterExpenses.toFixed(2)} tone="text-emerald-700" sub="after expenses" />
          <Kpi label="Discounts" value={overview.totalDiscount.toFixed(2)} tone="text-amber-600" sub={`${overview.discountOrderRatePct.toFixed(1)}% orders`} />
          <Kpi label="Avg Ticket" value={overview.averageOrderValue.toFixed(2)} tone="text-violet-600" sub={`${overview.totalOrders} orders`} />
          <Kpi label="Open Orders" value={String(overview.openOrdersCount)} tone="text-indigo-600" sub={`${overview.openOrdersValue.toFixed(2)} pending`} />
          <Kpi label="Voids Impact" value={overview.refundsAndVoids.toFixed(2)} tone="text-red-600" sub="voided totals" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Breakdown</p>
          </div>
          {overview && [
            ['Cash', overview.payment.cash, overview.paymentPct.cash, Banknote],
            ['Card', overview.payment.card, overview.paymentPct.card, CreditCard],
            ['Vodafone', overview.payment.vodafone_cash, overview.paymentPct.vodafone_cash, Smartphone]
          ].map(([label, value, pct, Icon]: any) => (
            <div key={label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1"><Icon className="w-3.5 h-3.5" />{label}</span>
                <span>{Number(value).toFixed(2)} · {Number(pct).toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Number(pct)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Drawer Control and Settlement</p>
          </div>
          {overview && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-500">Opening</p><p className="font-semibold">{overview.shiftStats.openingCash.toFixed(2)}</p></div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-500">Cash Sales</p><p className="font-semibold">{overview.shiftStats.cashSales.toFixed(2)}</p></div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-500">Expected</p><p className="font-semibold">{overview.shiftStats.expectedDrawer.toFixed(2)}</p></div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-500">Actual</p><p className="font-semibold">{overview.shiftStats.closingCash.toFixed(2)}</p></div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-500">Closed Shifts</p><p className="font-semibold">{overview.shiftStats.closedShifts}</p></div>
              </div>
              <div className={`flex items-center gap-2 text-sm font-semibold ${drawerVariance < 0 ? 'text-red-600' : drawerVariance > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                <AlertCircle className="w-4 h-4" />
                Cash variance: {drawerVariance > 0 ? '+' : ''}{drawerVariance.toFixed(2)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-500">Linked Expenses</p><p className="font-semibold">{overview.shiftStats.linkedExpenseTotal.toFixed(2)}</p></div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-500">After Expenses</p><p className="font-semibold">{overview.shiftStats.expectedAfterExpenses.toFixed(2)}</p></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg border border-slate-100 dark:border-slate-700"><p className="text-slate-500">Avg Discount</p><p className="font-semibold">{overview.avgDiscountPerOrder.toFixed(2)}</p></div>
                <div className="p-2 rounded-lg border border-slate-100 dark:border-slate-700"><p className="text-slate-500">Discounted Orders</p><p className="font-semibold">{overview.discountedOrders}</p></div>
                <div className="p-2 rounded-lg border border-slate-100 dark:border-slate-700"><p className="text-slate-500">Open Order Value</p><p className="font-semibold">{overview.openOrdersValue.toFixed(2)}</p></div>
                <div className="p-2 rounded-lg border border-slate-100 dark:border-slate-700"><p className="text-slate-500">Margin</p><p className="font-semibold">{overview.grossMarginPct.toFixed(1)}%</p></div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Finance Transactions</p>
            <p className="text-xs text-slate-400">Search by order, customer, cashier, or table</p>
          </div>
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
        </div>
        <div className="max-h-[460px] overflow-y-auto">
          {tx.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No transactions in this range.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/50">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Customer / Table</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Cashier</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {tx.map(row => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700/60 align-top">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{row.orderNumber}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{row.type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-slate-400">{row.closedAt ? new Date(row.closedAt).toLocaleString() : '-'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-slate-700 dark:text-slate-200">{row.customerName || 'Walk-in'}</p>
                      <p className="text-[10px] text-slate-400">
                        {row.table ? `Table ${row.table.number}${row.table.name ? ` (${row.table.name})` : ''}` : row.customerPhone || '-'}
                      </p>
                    </td>
                    <td className="px-3 py-2 capitalize">{(row.paymentMethod || '-').replace('_', ' ')}</td>
                    <td className="px-3 py-2">{row.cashier?.fullName || row.cashier?.username || '-'}</td>
                    <td className="px-3 py-2 text-right">{row.subtotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-amber-600">{row.discount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-600">{row.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Prev</button>
            <span className="text-xs text-slate-500">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
