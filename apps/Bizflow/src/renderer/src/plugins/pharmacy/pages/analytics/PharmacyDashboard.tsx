import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, DollarSign, TrendingUp, ShoppingBag, Package, AlertTriangle,
  PackageX, PackageMinus, Wallet, ChevronRight, Pill, Activity, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pharma, money, int } from '../_shared'

const PERIODS = ['today', 'week', 'month', 'year'] as const

export default function PharmacyDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const { can } = useAuth()
  const showProfit = can('view_profit')
  const [period, setPeriod] = useState<typeof PERIODS[number]>('month')
  const [ov, setOv] = useState<any>(null)
  const [cf, setCf] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([
        pharma()?.stats.overview(period),
        pharma()?.stats.cashflow(),
      ])
      setOv(r)
      setCf(c)
    } catch (e: any) { toast.error(e?.message ?? 'Failed to load dashboard') }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  if (loading && !ov) {
    return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div>
  }
  if (!ov) return null

  const s = ov.sales ?? {}
  const kpis = [
    { label: t('phTodayRevenue') || "Today's Revenue", value: `$${money(ov.today?.revenue)}`, sub: `${int(ov.today?.saleCount)} ${t('phSalesLc') || 'sales'}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: `${t('phRevenue') || 'Revenue'} (${period})`, value: `$${money(s.revenue)}`, sub: `${t('phProfit') || 'profit'} $${money(s.grossProfit)}`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
    { label: t('phSalesCount') || 'Sales', value: int(s.saleCount), sub: `${int(s.unitsSold)} ${t('phUnits') || 'units'}`, icon: ShoppingBag, color: 'text-violet-600 dark:text-violet-400' },
    { label: t('phStockValue') || 'Stock Value', value: `$${money(ov.stockValue)}`, sub: `${int(ov.activeProducts)} ${t('phProductsLc') || 'products'}`, icon: Package, color: 'text-teal-600 dark:text-teal-400' },
    { label: t('phMargin') || 'Margin', value: `${(s.margin || 0).toFixed(1)}%`, sub: `${t('phCogs') || 'COGS'} $${money(s.cogs)}`, icon: Activity, color: (s.margin || 0) >= 25 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
    { label: t('phReceivables') || 'Receivables', value: `$${money(ov.outstanding)}`, sub: t('phUnpaidSales') || 'unpaid sales', icon: Wallet, color: ov.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
  ].filter(k => showProfit || k.label !== (t('phMargin') || 'Margin'))

  const alerts = [
    ov.expiredBatches > 0 && { key: 'expired', tone: 'red', icon: PackageX, title: `${ov.expiredBatches} ${t('phExpiredBatches') || 'expired batches'}`, sub: `$${money(ov.expiredValue)} ${t('phAtRisk') || 'at risk'}`, tab: 'inventory' },
    ov.outOfStock > 0 && { key: 'out', tone: 'red', icon: PackageX, title: `${ov.outOfStock} ${t('phOutOfStock') || 'out of stock'}`, sub: t('phReorderNow') || 'reorder now', tab: 'products' },
    ov.expiringSoon > 0 && { key: 'expiring', tone: 'amber', icon: AlertTriangle, title: `${ov.expiringSoon} ${t('phExpiringSoon') || 'expiring in 30 days'}`, sub: `$${money(ov.expiringValue)}`, tab: 'inventory' },
    ov.lowStock > 0 && { key: 'low', tone: 'amber', icon: PackageMinus, title: `${ov.lowStock} ${t('phLowStock') || 'low on stock'}`, sub: t('phReorderSoon') || 'reorder soon', tab: 'products' },
    ov.outstanding > 0.005 && { key: 'due', tone: 'amber', icon: Wallet, title: `$${money(ov.outstanding)} ${t('phUnpaid') || 'unpaid'}`, sub: t('phCollectBalances') || 'collect balances', tab: 'sales' },
  ].filter(Boolean) as any[]

  const TONE: Record<string, string> = {
    red: 'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/15 hover:bg-red-100 dark:hover:bg-red-900/25',
    amber: 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/15 hover:bg-amber-100 dark:hover:bg-amber-900/25',
  }
  const TONE_ICON: Record<string, string> = { red: 'text-red-500', amber: 'text-amber-500' }

  return (
    <div className="p-6 space-y-6">
      {/* Owner cashflow snapshot */}
      {cf && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { key: 'cash', label: t('phCashToday') || 'Cash in today', value: `$${money(cf.cashToday)}`, sub: `${int(cf.txToday)} ${t('phSalesLc') || 'sales'}`, icon: ArrowDownCircle, ring: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/15', ic: 'text-emerald-500', tab: 'sales' },
            { key: 'recv', label: t('phReceivables') || 'Receivables', value: `$${money(cf.receivables)}`, sub: t('phToCollect') || 'to collect', icon: Wallet, ring: 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/15', ic: 'text-amber-500', tab: 'customers' },
            { key: 'pay', label: t('phPayables') || 'Payables', value: `$${money(cf.payables)}`, sub: `${int(cf.openOrders)} ${t('phOpenOrders') || 'open orders'}`, icon: ArrowUpCircle, ring: 'border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-900/15', ic: 'text-orange-500', tab: 'orders' },
            { key: 'stock', label: t('phStockAlerts') || 'Stock alerts', value: `${int(cf.outOfStock + cf.lowStock)}`, sub: `${int(cf.outOfStock)} ${t('phOut') || 'out'} · ${int(cf.lowStock)} ${t('phLow') || 'low'}`, icon: PackageMinus, ring: 'border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-900/15', ic: 'text-rose-500', tab: 'products' },
            { key: 'exp', label: t('phExpiring') || 'Expiring', value: `${int(cf.expiring + cf.expired)}`, sub: `${int(cf.expired)} ${t('phExpired') || 'expired'} · ${int(cf.expiring)} ≤30d`, icon: AlertTriangle, ring: 'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/15', ic: 'text-red-500', tab: 'inventory' },
          ].map(c => (
            <button key={c.key} type="button" disabled={!onNavigate} onClick={() => onNavigate?.(c.tab)}
              className={`text-left rounded-xl border px-4 py-3 transition-colors ${c.ring} ${onNavigate ? 'cursor-pointer hover:brightness-[0.98]' : 'cursor-default'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <c.icon className={`h-4 w-4 ${c.ic}`} />
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{c.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{c.value}</p>
              <p className="text-[11px] text-slate-400 truncate">{c.sub}</p>
            </button>
          ))}
        </div>
      )}

      {/* Period selector */}
      <div className="flex gap-1">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${period === p ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <k.icon className={`h-4 w-4 ${k.color}`} />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{k.label}</span>
            </div>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-slate-400 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Needs attention */}
      {alerts.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} className="text-amber-500" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('phNeedsAttention') || 'Needs Attention'}</h2>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">{alerts.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {alerts.map(a => (
              <button key={a.key} onClick={() => onNavigate?.(a.tab)}
                className={`group flex items-center gap-3 text-left rounded-xl border px-3.5 py-3 transition-colors ${TONE[a.tone]}`}>
                <div className="h-8 w-8 rounded-lg bg-white/70 dark:bg-slate-900/40 flex items-center justify-center shrink-0">
                  <a.icon size={16} className={TONE_ICON[a.tone]} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{a.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{a.sub}</p>
                </div>
                <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top products */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Pill size={15} className="text-emerald-500" /> {t('phTopProducts') || 'Top Products by Revenue'} <span className="text-xs font-normal text-slate-400">({period})</span>
        </h3>
        {(!s.topProducts || s.topProducts.length === 0) ? (
          <p className="text-xs text-slate-400 text-center py-6">{t('phNoSalesPeriod') || 'No sales in this period'}</p>
        ) : (
          <div className="space-y-2.5">
            {s.topProducts.map((m: any, i: number) => {
              const max = s.topProducts[0]?.revenue || 1
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-400 w-4">{i + 1}</span>
                      <span className="truncate max-w-[220px]">{m.name}</span>
                      <span className="text-[10px] text-slate-400">{int(m.units)} {t('phUnits') || 'units'}</span>
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">${money(m.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(m.revenue / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
