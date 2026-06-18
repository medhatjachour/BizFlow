import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill, DollarSign, Package, AlertTriangle, PackageX, ArrowRight, ShoppingBag } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { money, int } from '../pages/components/_shared'

interface Props { refreshSignal?: number }
const api = () => (globalThis as any).api?.pharmacy

function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: string | number; sub?: string; icon: React.ElementType; tone: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 min-h-[100px]">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-4">{label}</span>
        <div className={`p-1.5 rounded-lg ${tone}`}><Icon size={15} /></div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-4">{sub}</p>}
    </div>
  )
}

export default function PharmacyDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [ov, setOv] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api()?.stats.overview('month').then((r: any) => { if (active) setOv(r) }).catch(() => {}).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshSignal])

  if (loading && !ov) {
    return <div className="space-y-4"><div className="h-6 w-40 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div></div>
  }
  if (!ov) return null
  const s = ov.sales ?? {}
  const alerts = (ov.expiredBatches || 0) + (ov.outOfStock || 0) + (ov.expiringSoon || 0) + (ov.lowStock || 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><Pill className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('pharmacy') || 'Pharmacy'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('phTodayOverview') || "Today's sales, stock value & alerts"}</p>
          </div>
        </div>
        <button onClick={() => navigate('/pharmacy')} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:gap-1.5 transition-all">{t('phOpen') || 'Open'} <ArrowRight size={13} /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label={t('phTodayRevenue') || "Today's Revenue"} value={`$${money(ov.today?.revenue)}`} sub={`${int(ov.today?.saleCount)} ${t('phSalesLc') || 'sales'}`} icon={DollarSign} tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
        <Stat label={`${t('phRevenue') || 'Revenue'} (30d)`} value={`$${money(s.revenue)}`} sub={`${t('phProfit') || 'profit'} $${money(s.grossProfit)}`} icon={ShoppingBag} tone="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <Stat label={t('phStockValue') || 'Stock Value'} value={`$${money(ov.stockValue)}`} sub={`${int(ov.activeProducts)} ${t('phProductsLc') || 'products'}`} icon={Package} tone="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400" />
        <Stat label={t('phNeedsAttention') || 'Needs Attention'} value={int(alerts)} sub={`${int(ov.expiredBatches)} ${t('phExpired') || 'expired'} · ${int(ov.lowStock + ov.outOfStock)} ${t('phLow') || 'low'}`} icon={alerts > 0 ? AlertTriangle : PackageX} tone={alerts > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'} />
      </div>

      {s.topProducts?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">{t('phTopProducts') || 'Top Products by Revenue'}</p>
          <div className="space-y-2">
            {s.topProducts.slice(0, 5).map((m: any, i: number) => {
              const max = s.topProducts[0]?.revenue || 1
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-xs mb-0.5"><span className="text-slate-600 dark:text-slate-300 truncate flex items-center gap-1.5"><span className="text-slate-400 w-3">{i + 1}</span>{m.name}</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">${money(m.revenue)}</span></div>
                  <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(m.revenue / max) * 100}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
