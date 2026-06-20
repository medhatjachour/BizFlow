import { useState, useEffect, useCallback } from 'react'
import { Pill, TrendingUp, TrendingDown, DollarSign, Banknote, Wallet, Activity, Boxes, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { money } from '../pages/components/_shared'

const api = () => (globalThis as any).api?.pharmacy
type Period = 'today' | 'week' | 'month' | 'year'
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function range(p: Period) {
  const now = new Date(); const to = ymd(now)
  if (p === 'today') return { from: to, to }
  if (p === 'week') { const d = new Date(now); d.setDate(now.getDate() - 6); return { from: ymd(d), to } }
  if (p === 'year') { const d = new Date(now); d.setFullYear(now.getFullYear() - 1); d.setDate(now.getDate() + 1); return { from: ymd(d), to } }
  const d = new Date(now); d.setDate(now.getDate() - 29); return { from: ymd(d), to }
}

export default function PharmacyFinanceSection() {
  const { t } = useLanguage()
  const [period, setPeriod] = useState<Period>('month')
  const [sales, setSales] = useState<any>(null)
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = range(period)
      const [s, i] = await Promise.all([api()?.stats.salesSummary({ from: r.from, to: r.to }), api()?.stats.inventory()])
      setSales(s ?? null); setInv(i ?? null)
    } finally { setLoading(false) }
  }, [period])
  useEffect(() => { load() }, [load])

  if (loading && !sales) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div>
  if (!sales) return null

  const collectionRate = sales.revenue > 0 ? (sales.collected / sales.revenue) * 100 : 0
  const kpis = [
    { label: t('phRevenue') || 'Revenue', value: `$${money(sales.revenue)}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40' },
    { label: 'COGS', value: `$${money(sales.cogs)}`, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/40' },
    { label: `${t('phGrossProfit') || 'Gross Profit'} (${(sales.margin || 0).toFixed(0)}%)`, value: `$${money(sales.grossProfit)}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/40' },
    { label: `${t('phCollectionRate') || 'Collected'} (${collectionRate.toFixed(0)}%)`, value: `$${money(sales.collected)}`, icon: Banknote, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800/40' },
    { label: t('phReceivables') || 'Receivables', value: `$${money(sales.outstanding)}`, icon: Wallet, color: sales.outstanding > 0 ? 'text-amber-600' : 'text-slate-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/40' },
    { label: t('phStockValue') || 'Stock Value', value: `$${money(inv?.stockValue)}`, icon: Boxes, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800/40' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Pill className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('pharmacy') || 'Pharmacy'} — {t('phFinance') || 'Finance'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('phFinanceSubtitle') || 'Revenue, profit, receivables & inventory value'}</p>
          </div>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 gap-0.5">
          {(['today', 'week', 'month', 'year'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg} ${k.border}`}>
            <div className="flex items-center gap-2 mb-2"><k.icon size={16} className={k.color} /><span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{k.label}</span></div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"><Activity size={14} className="text-emerald-500" /> {t('phProfitSummary') || 'Profit Summary'}</h4>
          <div className="space-y-1">
            {[
              { label: t('phRevenue') || 'Revenue', value: sales.revenue, color: 'text-emerald-600' },
              { label: 'COGS', value: -sales.cogs, color: 'text-orange-500' },
              { label: t('phGrossProfit') || 'Gross Profit', value: sales.grossProfit, color: 'text-blue-600', bold: true },
              { label: `${t('phMargin') || 'Margin'}`, value: null, text: `${(sales.margin || 0).toFixed(1)}%`, color: 'text-slate-500' },
              { label: t('phUnits') || 'Units sold', value: null, text: String(sales.unitsSold ?? 0), color: 'text-slate-500' },
            ].map((l: any) => (
              <div key={l.label} className={`flex justify-between items-center py-2 ${l.bold ? 'border-t border-slate-200 dark:border-slate-700 font-semibold' : ''}`}>
                <span className="text-sm text-slate-600 dark:text-slate-300">{l.label}</span>
                <span className={`text-sm font-semibold ${l.color} tabular-nums`}>{l.value != null ? (l.value < 0 ? `-$${money(-l.value)}` : `$${money(l.value)}`) : l.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('phTopProducts') || 'Top Products by Revenue'}</h4>
          {(!sales.topProducts || sales.topProducts.length === 0) ? <p className="text-xs text-slate-400 text-center py-6">{t('phNoSalesPeriod') || 'No sales in this period'}</p> : (
            <div className="space-y-2.5">
              {sales.topProducts.slice(0, 6).map((m: any, i: number) => {
                const max = sales.topProducts[0]?.revenue || 1
                return (
                  <div key={m.id}>
                    <div className="flex justify-between text-xs mb-0.5"><span className="text-slate-600 dark:text-slate-300 truncate flex items-center gap-1.5"><span className="text-slate-400 w-3">{i + 1}</span>{m.name}</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">${money(m.revenue)}</span></div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(m.revenue / max) * 100}%` }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
