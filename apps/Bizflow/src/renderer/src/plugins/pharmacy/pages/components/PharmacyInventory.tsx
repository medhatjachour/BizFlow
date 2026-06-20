import { useState, useEffect, useCallback } from 'react'
import { Loader2, PackageX, AlertTriangle, CalendarClock, History } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, int, expiryTone } from './_shared'
import { IconButton } from './ui'
import ProductDetailModal from './ProductDetailModal'

export default function PharmacyInventory() {
  const toast = useToast()
  const { t } = useLanguage()
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<any[]>([])
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [detailTarget, setDetailTarget] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [batches, summary] = await Promise.all([
        pharma()?.batches.getExpiring({ days, includeExpired: true }),
        pharma()?.stats.inventory(),
      ])
      setRows(batches ?? []); setInv(summary ?? null)
    } catch (e: any) { toast.error(e?.message ?? 'Failed to load inventory') }
    finally { setLoading(false) }
  }, [days])

  useEffect(() => { load() }, [load])

  async function dispose(b: any) {
    try { await pharma()?.batches.dispose(b.id, { reason: 'Expired/disposed from inventory' }); toast.success(t('phBatchDisposed') || 'Batch disposed'); load() }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
  }

  const kpis = inv ? [
    { label: t('phStockValue') || 'Stock value', value: `$${money(inv.stockValue)}`, color: 'text-emerald-600 dark:text-emerald-400', icon: CalendarClock },
    { label: t('phRetailValue') || 'Retail value', value: `$${money(inv.retailValue)}`, color: 'text-blue-600 dark:text-blue-400', icon: CalendarClock },
    { label: t('phExpired') || 'Expired', value: int(inv.expiredBatches), sub: `$${money(inv.expiredValue)}`, color: inv.expiredBatches > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400', icon: PackageX },
    { label: t('phExpiringSoon') || 'Expiring 30d', value: int(inv.expiringSoon), sub: `$${money(inv.expiringValue)}`, color: inv.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400', icon: AlertTriangle },
    { label: t('phLowStock') || 'Low stock', value: int(inv.lowStock), color: inv.lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400', icon: AlertTriangle },
    { label: t('phOutOfStock') || 'Out of stock', value: int(inv.outOfStock), color: inv.outOfStock > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400', icon: PackageX },
  ] : []

  return (
    <div className="p-6 space-y-5">
      {/* KPIs */}
      {inv && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5"><k.icon className={`h-4 w-4 ${k.color}`} /><span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{k.label}</span></div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              {k.sub && <p className="text-[11px] text-slate-400">{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Expiry list */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><CalendarClock size={15} className="text-amber-500" /> {t('phExpiryWatch') || 'Expiry Watch'}</h3>
          <div className="flex gap-1">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)} className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${days === d ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{d}d</button>
            ))}
          </div>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
        : rows.length === 0 ? <p className="text-sm text-slate-400 text-center py-12">{t('phNoExpiryIssues') || 'No batches expiring in this window — all good!'}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="px-5 py-2.5 font-medium">{t('phProduct') || 'Product'}</th>
                <th className="px-5 py-2.5 font-medium">{t('phBatchNo') || 'Batch #'}</th>
                <th className="px-5 py-2.5 font-medium text-right">{t('phQty') || 'Qty'}</th>
                <th className="px-5 py-2.5 font-medium">{t('phExpiry') || 'Expiry'}</th>
                <th className="px-5 py-2.5 font-medium text-right">{t('phValue') || 'Value'}</th>
                <th className="px-5 py-2.5 font-medium text-right"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {rows.map(b => (
                  <tr key={b.id} className={`text-slate-700 dark:text-slate-300 ${b.isExpired ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-200">{b.product?.name}</td>
                    <td className="px-5 py-2.5 text-slate-400">{b.batchNumber || '—'}</td>
                    <td className="px-5 py-2.5 text-right">{b.quantity} {b.product?.unit}</td>
                    <td className="px-5 py-2.5"><span className={`text-xs font-medium ${expiryTone(b.daysToExpiry)}`}>{new Date(b.expiryDate).toLocaleDateString()} · {b.isExpired ? (t('phExpired') || 'expired') : `${b.daysToExpiry}d`}</span></td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">${money(b.value)}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      {b.product?.id && <IconButton icon={History} tone="violet" onClick={() => setDetailTarget({ id: b.product.id, name: b.product.name, unit: b.product.unit })} title={t('phHistory') || 'History & details'} />}
                      <button onClick={() => dispose(b)} className="px-2.5 py-1 text-xs font-semibold rounded-lg text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 transition-colors inline-flex items-center gap-1">
                        <PackageX size={13} /> {t('phDispose') || 'Dispose'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailTarget && <ProductDetailModal product={detailTarget} onClose={() => setDetailTarget(null)} />}
    </div>
  )
}
