import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Download, TrendingUp, Trophy, Clock3,
  Users, Boxes, Percent, BadgeDollarSign, CalendarRange
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Overview {
  totalRevenue: number
  totalDiscount: number
  totalOrders: number
  averageOrderValue: number
  totalItemsSold: number
  totalCogs: number
  operationalExpenses: number
  expenseCount: number
  totalExpenses: number
  grossProfit: number
  netProfitAfterExpenses: number
  grossMarginPct: number
  avgItemsPerOrder: number
  discountRatePct: number
  deliveryRevenue: number
  payment: Record<string, number>
  orderTypes: Record<string, number>
  peakHour: { hour: number; value: number }
  topCashiers: Array<{ id: string; name: string; orders: number; revenue: number }>
  topCustomers: Array<{ key: string; name: string; orders: number; spent: number }>
  uniqueCustomers: number
  repeatCustomers: number
  repeatCustomerRatePct: number
  lowStockCount: number
  outOfStockCount: number
  expenseByCategory: Array<{ category: string; total: number }>
  bestDay: { date: string; revenue: number; orders: number }
  worstDay: { date: string; revenue: number; orders: number }
}

interface TrendRow {
  date: string
  revenue: number
  orders: number
  discount: number
}

interface ProductRow {
  productId: string | null
  productName: string
  categoryName: string
  quantity: number
  revenue: number
  cogs: number
  grossProfit: number
}

interface CategoryRow {
  categoryId: string | null
  categoryName: string
  quantity: number
  revenue: number
  cogs: number
  grossProfit: number
}

interface CustomerInsights {
  topCustomers: Array<{ key: string; name: string; phone?: string | null; orders: number; spent: number; lastVisit?: string; deliveryOrders: number }>
  totalCustomers: number
  repeatCustomers: number
  repeatRatePct: number
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

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function ReportsTab() {
  const toast = useToast()
  const { t } = useLanguage()

  const initial = applyPreset('month')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [trend, setTrend] = useState<TrendRow[]>([])
  const [topProducts, setTopProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [customers, setCustomers] = useState<CustomerInsights | null>(null)

  const filters = useMemo(() => ({
    startDate: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    endDate: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined
  }), [from, to])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, tr, tp, cp, ci] = await Promise.all([
        window.api.coffee.reports.getOverview(filters),
        window.api.coffee.reports.getDailyTrend(filters),
        window.api.coffee.reports.getTopProducts({ ...filters, limit: 12 }),
        window.api.coffee.reports.getCategoryPerformance({ ...filters, limit: 8 }),
        window.api.coffee.reports.getCustomerInsights({ ...filters, limit: 8 })
      ])
      setOverview(ov)
      setTrend(tr ?? [])
      setTopProducts(tp ?? [])
      setCategories(cp ?? [])
      setCustomers(ci)
    } catch {
      toast.error('Failed to load coffee reports')
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  useEffect(() => {
    load()
  }, [load])

  const maxTrend = Math.max(...trend.map(row => row.revenue), 1)
  const maxCategory = Math.max(...categories.map(row => row.revenue), 1)
  const peakHourLabel = overview ? new Date(new Date().setHours(overview.peakHour.hour, 0, 0, 0)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'

  const exportCsv = () => {
    if (!overview) return
    const lines = [
      t('cfCoffeeReports'),
      `${t('cfFromLc')},${from || t('cfAllTime')}`,
      `${t('cfToLc')},${to || t('cfAllTime')}`,
      '',
      `${t('cfRevenueLabel')},${overview.totalRevenue.toFixed(2)}`,
      `${t('cfGrossProfitLabel')},${overview.grossProfit.toFixed(2)}`,
      `Gross Margin %,${overview.grossMarginPct.toFixed(2)}`,
      `Orders,${overview.totalOrders}`,
      `Items Sold,${overview.totalItemsSold}`,
      `Avg Items / Order,${overview.avgItemsPerOrder.toFixed(2)}`,
      `Repeat Customer Rate %,${overview.repeatCustomerRatePct.toFixed(2)}`,
      '',
      'Top Products',
      'Name,Category,Qty,Revenue,COGS,Gross Profit',
      ...topProducts.map(p => `${p.productName},${p.categoryName},${p.quantity},${p.revenue.toFixed(2)},${p.cogs.toFixed(2)},${p.grossProfit.toFixed(2)}`),
      '',
      'Top Customers',
      'Customer,Orders,Spent',
      ...(customers?.topCustomers ?? []).map(c => `${c.name},${c.orders},${c.spent.toFixed(2)}`)
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `coffee-reports-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
            {preset === 'today' ? t('cfToday') : preset === 'week' ? t('cfWeek') : preset === 'month' ? t('cfMonth') : t('cfAllTime')}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="relative">
            <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCsv} className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> {t('cfExportCsv')}
          </button>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-3">
          <StatCard label={t('cfRevenueLabel')} value={overview.totalRevenue.toFixed(2)} tone="text-emerald-600" sub={t('cfNetPaidSales')} />
          <StatCard label={t('cfGrossProfitLabel')} value={overview.grossProfit.toFixed(2)} tone="text-teal-600" sub={`COGS ${overview.totalCogs.toFixed(2)}`} />
          <StatCard label={t('cfOpsExpenses')} value={overview.operationalExpenses.toFixed(2)} tone="text-orange-600" sub={`${overview.expenseCount} ${t('cfTransactions')}`} />
          <StatCard label={t('cfNetProfitLabel')} value={overview.netProfitAfterExpenses.toFixed(2)} tone="text-emerald-700" sub={t('cfAfterExpenses')} />
          <StatCard label={t('cfMargin')} value={`${overview.grossMarginPct.toFixed(1)}%`} tone="text-sky-600" sub={t('cfProfitability')} />
          <StatCard label={t('cfOrders')} value={String(overview.totalOrders)} tone="text-amber-600" sub={`${overview.totalItemsSold} ${t('cfItemsSold')}`} />
          <StatCard label={t('cfAverageTicket')} value={overview.averageOrderValue.toFixed(2)} tone="text-violet-600" sub={`${overview.avgItemsPerOrder.toFixed(1)} ${t('cfItemsPerOrder')}`} />
          <StatCard label={t('cfDiscountRateLabel')} value={`${overview.discountRatePct.toFixed(1)}%`} tone="text-orange-600" sub={overview.totalDiscount.toFixed(2)} />
          <StatCard label={t('cfCustomersLabel')} value={String(overview.uniqueCustomers)} tone="text-indigo-600" sub={`${overview.repeatCustomers} ${t('cfRepeat')}`} />
          <StatCard label={t('cfStockAlerts')} value={String(overview.lowStockCount + overview.outOfStockCount)} tone="text-rose-600" sub={`${overview.outOfStockCount} ${t('cfOutOfStock')}`} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-300">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-semibold">{t('cfRevenueTrend')}</p>
          </div>
          {trend.length === 0 ? (
            <p className="text-sm text-slate-400">{t('cfNoTrendData')}</p>
          ) : (
            <div className="space-y-2">
              {trend.map(row => (
                <div key={row.date} className="grid grid-cols-[100px_1fr_70px_60px] items-center gap-2 text-[11px]">
                  <span className="text-slate-500">{new Date(row.date).toLocaleDateString()}</span>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(row.revenue / maxTrend) * 100}%` }} />
                  </div>
                  <span className="text-right text-slate-700 dark:text-slate-300 font-medium">{row.revenue.toFixed(0)}</span>
                  <span className="text-right text-slate-400">{row.orders} ord</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Clock3 className="w-4 h-4" />
            <p className="text-sm font-semibold">Operator Snapshot</p>
          </div>
          {overview && (
            <>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Peak Hour</span><span>{peakHourLabel}</span></div>
                <div className="flex justify-between"><span>Delivery Revenue</span><span>{overview.deliveryRevenue.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Repeat Rate</span><span>{overview.repeatCustomerRatePct.toFixed(1)}%</span></div>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs">
                <div className="flex justify-between"><span>{t('cfBestDay')}</span><span>{overview.bestDay.date ? `${new Date(overview.bestDay.date).toLocaleDateString()} · ${overview.bestDay.revenue.toFixed(2)}` : '-'}</span></div>
                <div className="flex justify-between"><span>{t('cfWorstDay')}</span><span>{overview.worstDay.date ? `${new Date(overview.worstDay.date).toLocaleDateString()} · ${overview.worstDay.revenue.toFixed(2)}` : '-'}</span></div>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-1">{t('cfPaymentMix')}</p>
                {[
                  ['Cash', overview.payment.cash, overview.totalRevenue],
                  ['Card', overview.payment.card, overview.totalRevenue],
                  ['Vodafone', overview.payment.vodafone_cash, overview.totalRevenue]
                ].map(([label, value, base]) => (
                  <div key={String(label)} className="mb-2">
                    <div className="flex justify-between text-[11px]"><span>{label}</span><span>{Number(value).toFixed(2)}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${base ? (Number(value) / Number(base)) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('cfTopProducts')}</p>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {topProducts.slice(0, 10).map(p => (
              <div key={p.productId || p.productName} className="p-2 rounded-lg border border-slate-100 dark:border-slate-700/60 space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.productName}</p>
                  <span className="text-xs font-semibold text-emerald-600">{p.revenue.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>{p.categoryName}</span>
                  <span>{p.quantity} {t('cfSold')}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>COGS {p.cogs.toFixed(2)}</span>
                  <span>{t('cfProfit')} {p.grossProfit.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Boxes className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('cfCategoryPerformance')}</p>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {categories.map(row => (
              <div key={row.categoryId || row.categoryName}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{row.categoryName}</span>
                  <span className="text-slate-500">{row.revenue.toFixed(2)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-1">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${(row.revenue / maxCategory) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{row.quantity} {t('cfItems')}</span>
                  <span>{t('cfProfit')} {row.grossProfit.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <BadgeDollarSign className="w-4 h-4" />
            <p className="text-sm font-semibold">{t('cfExpenseMix')}</p>
          </div>
          {!overview || overview.expenseByCategory.length === 0 ? (
            <p className="text-sm text-slate-400">{t('cfNoExpensesRange')}</p>
          ) : (
            <div className="space-y-2">
              {overview.expenseByCategory.slice(0, 6).map(row => (
                <div key={row.category} className="grid grid-cols-[110px_1fr_70px] items-center gap-2 text-xs">
                  <span className="text-slate-500 capitalize truncate">{row.category}</span>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(4, (row.total / Math.max(overview.operationalExpenses, 1)) * 100)}%` }} />
                  </div>
                  <span className="text-right font-medium text-slate-700 dark:text-slate-300">{row.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('cfCustomerInsights')}</p>
          </div>
          <div className="space-y-2 text-xs mb-3">
            <div className="flex justify-between"><span>{t('cfTotalCustomers')}</span><span>{customers?.totalCustomers ?? 0}</span></div>
            <div className="flex justify-between"><span>{t('cfRepeatCustomers')}</span><span>{customers?.repeatCustomers ?? 0}</span></div>
            <div className="flex justify-between"><span>{t('cfRepeatRateLc')}</span><span>{customers?.repeatRatePct.toFixed(1) ?? '0.0'}%</span></div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {(customers?.topCustomers ?? []).map(customer => (
              <div key={customer.key} className="p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{customer.name}</p>
                  <span className="text-xs font-semibold text-indigo-600">{customer.spent.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>{customer.orders} {t('cfOrdersLc')}</span>
                  <span>{customer.deliveryOrders} {t('cfDeliveryLc')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BadgeDollarSign className="w-4 h-4 text-green-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('cfTopCashiers')}</p>
            </div>
            <div className="space-y-2">
              {overview.topCashiers.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.orders} {t('cfOrdersLc')}</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-600">{c.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Percent className="w-4 h-4 text-rose-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('cfOrderTypeMix')}</p>
            </div>
            <div className="space-y-3">
              {[
                [t('cfDineIn'), overview.orderTypes.dine_in],
                [t('cfTakeaway'), overview.orderTypes.takeaway],
                [t('cfDeliveryOpt'), overview.orderTypes.delivery]
              ].map(([label, count]) => (
                <div key={String(label)}>
                  <div className="flex justify-between text-xs mb-1"><span>{label}</span><span>{count}</span></div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden"><div className="h-full rounded-full bg-rose-500" style={{ width: `${overview.totalOrders ? (Number(count) / overview.totalOrders) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-xs text-slate-400">Loading report data...</p>}
    </div>
  )
}
