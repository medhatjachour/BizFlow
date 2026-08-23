import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Download, TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Activity, Wallet, Boxes, Layers, Calendar
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, int, downloadCSV, inputCls } from '../_shared'

type View = 'sales' | 'inventory'
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function presetRange(p: string): { from: string; to: string } {
  const now = new Date(); const to = iso(now)
  if (p === 'today') return { from: to, to }
  if (p === 'week') { const d = new Date(now); d.setDate(now.getDate() - 6); return { from: iso(d), to } }
  if (p === 'year') { const d = new Date(now); d.setFullYear(now.getFullYear() - 1); d.setDate(now.getDate() + 1); return { from: iso(d), to } }
  const d = new Date(now); d.setDate(now.getDate() - 29); return { from: iso(d), to }
}

export default function PharmacyReports() {
  const toast = useToast()
  const { t } = useLanguage()
  const [view, setView] = useState<View>('sales')
  const [range, setRange] = useState(() => presetRange('month'))
  const [sales, setSales] = useState<any>(null)
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (view === 'sales') setSales(await pharma()?.stats.salesSummary({ from: range.from, to: range.to }))
      else setInv(await pharma()?.stats.inventory())
    } catch (e: any) { toast.error(e?.message ?? 'Failed to load report') }
    finally { setLoading(false) }
  }, [view, range.from, range.to])
  useEffect(() => { load() }, [load])

  function exportSales() {
    if (!sales) return
    const rows: (string | number)[][] = [
      ['Pharmacy Sales Report', `${range.from} → ${range.to}`], [],
      ['Metric', 'Value'],
      ['Sales', sales.saleCount], ['Revenue', sales.revenue.toFixed(2)], ['COGS', sales.cogs.toFixed(2)],
      ['Gross Profit', sales.grossProfit.toFixed(2)], ['Margin %', sales.margin.toFixed(1) + '%'],
      ['Units sold', sales.unitsSold], ['Collected', sales.collected.toFixed(2)], ['Outstanding (all-time)', sales.outstanding.toFixed(2)],
      [], ['Top Products', 'Units', 'Revenue'],
      ...(sales.topProducts ?? []).map((p: any) => [p.name, p.units, p.revenue.toFixed(2)]),
    ]
    downloadCSV(rows, `pharmacy-sales-${range.from}_${range.to}.csv`)
  }
  function exportInventory() {
    if (!inv) return
    const rows: (string | number)[][] = [
      ['Pharmacy Inventory Report', new Date().toLocaleString()], [],
      ['Metric', 'Value'],
      ['Products', inv.totalProducts], ['Stock value', inv.stockValue.toFixed(2)], ['Retail value', inv.retailValue.toFixed(2)],
      ['Low stock', inv.lowStock], ['Out of stock', inv.outOfStock],
      ['Expired batches', inv.expiredBatches], ['Expired value', inv.expiredValue.toFixed(2)],
      ['Expiring (30d)', inv.expiringSoon], ['Expiring value', inv.expiringValue.toFixed(2)],
      [], ['Category', 'Products', 'Stock value'],
      ...(inv.byCategory ?? []).map((c: any) => [c.category, c.count, c.value.toFixed(2)]),
    ]
    downloadCSV(rows, `pharmacy-inventory-${iso(new Date())}.csv`)
  }

  const salesKpis = sales ? [
    { label: t('phSalesCount') || 'Sales', value: int(sales.saleCount), icon: ShoppingBag, color: 'text-violet-600 dark:text-violet-400' },
    { label: t('phRevenue') || 'Revenue', value: `$${money(sales.revenue)}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'COGS', value: `$${money(sales.cogs)}`, icon: TrendingDown, color: 'text-orange-500 dark:text-orange-400' },
    { label: t('phGrossProfit') || 'Gross Profit', value: `$${money(sales.grossProfit)}`, icon: DollarSign, color: 'text-blue-600 dark:text-blue-400' },
    { label: `${t('phMargin') || 'Margin'} (${(sales.margin || 0).toFixed(0)}%)`, value: `${(sales.margin || 0).toFixed(1)}%`, icon: Activity, color: sales.margin >= 25 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
    { label: t('phReceivables') || 'Receivables', value: `$${money(sales.outstanding)}`, icon: Wallet, color: sales.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
  ] : []

  const invKpis = inv ? [
    { label: t('phStockValue') || 'Stock value', value: `$${money(inv.stockValue)}`, icon: Boxes, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('phRetailValue') || 'Retail value', value: `$${money(inv.retailValue)}`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
    { label: t('phProducts') || 'Products', value: int(inv.totalProducts), icon: Layers, color: 'text-violet-600 dark:text-violet-400' },
    { label: t('phLowStock') || 'Low stock', value: int(inv.lowStock), icon: TrendingDown, color: inv.lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
    { label: t('phExpired') || 'Expired', value: int(inv.expiredBatches), icon: TrendingDown, color: inv.expiredBatches > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400' },
    { label: t('phExpiringSoon') || 'Expiring 30d', value: int(inv.expiringSoon), icon: Activity, color: inv.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
  ] : []

  return (
    <div className="p-6 space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
          <button onClick={() => setView('sales')} className={`px-3.5 py-1.5 ${view === 'sales' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{t('phSalesReport') || 'Sales'}</button>
          <button onClick={() => setView('inventory')} className={`px-3.5 py-1.5 ${view === 'inventory' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{t('phInventoryReport') || 'Inventory'}</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {view === 'sales' && (
            <>
              <div className="flex gap-1">
                {['today', 'week', 'month', 'year'].map(p => (
                  <button key={p} onClick={() => setRange(presetRange(p))} className="px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700">{p}</button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className={inputCls + ' py-1 text-xs w-auto'} />
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className={inputCls + ' py-1 text-xs w-auto'} />
              </div>
            </>
          )}
          <button onClick={view === 'sales' ? exportSales : exportInventory} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"><Download size={14} /> {t('phExportCSV') || 'Export CSV'}</button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      : view === 'sales' && sales ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {salesKpis.map(k => (
              <div key={k.label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5"><k.icon className={`h-4 w-4 ${k.color}`} /><span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{k.label}</span></div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('phTopProducts') || 'Top Products by Revenue'}</h3>
            {(!sales.topProducts || sales.topProducts.length === 0) ? <p className="text-xs text-slate-400 text-center py-6">{t('phNoSalesPeriod') || 'No sales in this period'}</p> : (
              <div className="space-y-2.5">
                {sales.topProducts.map((m: any, i: number) => {
                  const max = sales.topProducts[0]?.revenue || 1
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><span className="text-slate-400 w-4">{i + 1}</span><span className="truncate max-w-[240px]">{m.name}</span><span className="text-[10px] text-slate-400">{int(m.units)}×</span></span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">${money(m.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(m.revenue / max) * 100}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : view === 'inventory' && inv ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {invKpis.map(k => (
              <div key={k.label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5"><k.icon className={`h-4 w-4 ${k.color}`} /><span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{k.label}</span></div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('phStockByCategory') || 'Stock Value by Category'}</h3>
            {(!inv.byCategory || inv.byCategory.length === 0) ? <p className="text-xs text-slate-400 text-center py-6">{t('phNoStock') || 'No stock'}</p> : (
              <div className="space-y-2.5">
                {inv.byCategory.map((c: any) => {
                  const max = inv.byCategory[0]?.value || 1
                  return (
                    <div key={c.category}>
                      <div className="flex justify-between text-xs mb-0.5"><span className="capitalize text-slate-600 dark:text-slate-300">{c.category} <span className="text-slate-400">({c.count})</span></span><span className="font-semibold text-emerald-600 dark:text-emerald-400">${money(c.value)}</span></div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${(c.value / max) * 100}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
