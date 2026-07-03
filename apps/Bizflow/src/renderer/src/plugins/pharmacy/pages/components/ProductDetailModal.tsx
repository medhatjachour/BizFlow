import { useState, useEffect } from 'react'
import { Loader2, History } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, expiryTone } from './_shared'
import { Modal } from './ui'

/** Product history & details — used by both Products and Inventory. */
export default function ProductDetailModal({ product, onClose }: { product: any; onClose: () => void }) {
  const { t } = useLanguage()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'timeline' | 'batches'>('timeline')

  useEffect(() => {
    let alive = true
    pharma()?.products.getHistory(product.id, { take: 100 })
      .then((d: any) => { if (alive) setData(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [product.id])

  const st = data?.stats
  const kpis = st ? [
    { label: t('phStock') || 'Stock', value: `${st.currentStock} ${data.product.unit}`, color: 'text-slate-800 dark:text-slate-100' },
    { label: t('phStockValue') || 'Stock value', value: `$${money(st.stockValue)}`, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('phSold') || 'Sold', value: `${st.soldUnits}`, sub: `${st.saleCount} ${t('phSalesLc') || 'sales'}`, color: 'text-violet-600 dark:text-violet-400' },
    { label: t('phRevenue') || 'Revenue', value: `$${money(st.revenue)}`, color: 'text-blue-600 dark:text-blue-400' },
    { label: t('phProfit') || 'Profit', value: `$${money(st.profit)}`, sub: `${st.margin}%`, color: st.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500' },
    { label: t('phBatches') || 'Batches', value: `${st.activeBatches}/${st.batchCount}`, color: 'text-slate-600 dark:text-slate-300' },
  ] : []

  const EVENT_META: Record<string, { color: string; sign: string; label: string }> = {
    received: { color: 'text-emerald-600 dark:text-emerald-400', sign: '+', label: t('phReceived') || 'Received' },
    sold:     { color: 'text-blue-600 dark:text-blue-400', sign: '−', label: t('phSold') || 'Sold' },
    disposed: { color: 'text-red-500', sign: '−', label: t('phDisposed') || 'Disposed' },
    edited:   { color: 'text-amber-600 dark:text-amber-400', sign: '', label: t('phEdited') || 'Edited' },
  }

  const fmtChange = (v: any): string => {
    if (v === null || v === undefined || v === '') return '—'
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString()
    return String(v)
  }

  return (
    <Modal title={product.name} subtitle={`${product.category ?? ''}${product.barcode ? ' · ' + product.barcode : ''}`} icon={History} size="lg" onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : !data ? (
        <p className="text-sm text-slate-400 text-center py-16">{t('phFailedLoad') || 'Failed to load'}</p>
      ) : (
        <div className="p-5 space-y-4">
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {kpis.map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2.5">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{k.label}</p>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                {k.sub && <p className="text-[10px] text-slate-400">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1">
            {(['timeline', 'batches'] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tab === tb ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                {tb === 'timeline' ? (t('phMovements') || 'Movements') : (t('phBatches') || 'Batches')}
              </button>
            ))}
          </div>

          {tab === 'timeline' ? (
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {data.events.length === 0 && <p className="text-sm text-slate-400 text-center py-8">{t('phNoMovements') || 'No movements yet'}</p>}
              {data.events.map((e: any, i: number) => {
                const m = EVENT_META[e.type] ?? EVENT_META.sold
                if (e.type === 'edited') {
                  const isAdjust = e.action === 'adjust_stock'
                  return (
                    <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <span className={`text-xs font-bold w-16 shrink-0 ${m.color}`}>{isAdjust ? (t('phAdjusted') || 'Adjusted') : m.label}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {e.userName
                            ? `${isAdjust ? (t('phAdjustedBy') || 'Adjusted by') : (t('phEditedBy') || 'Edited by')} ${e.userName}`
                            : (isAdjust ? (t('phAdjusted') || 'Adjusted') : (t('phEdited') || 'Edited'))}
                          {e.batchNumber ? ` · ${t('phBatch') || 'Batch'} ${e.batchNumber}` : ''}
                        </p>
                        {(e.changes ?? []).map((c: any, ci: number) => (
                          <p key={ci} className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.label}: <span className="line-through text-slate-400">{fmtChange(c.from)}</span>{' → '}<span className="font-semibold text-slate-700 dark:text-slate-200">{fmtChange(c.to)}</span>
                          </p>
                        ))}
                        {e.note && <p className="text-[11px] text-slate-500 dark:text-slate-400">{e.note}</p>}
                        <p className="text-[10px] text-slate-400">{new Date(e.date).toLocaleString()}</p>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className={`text-xs font-bold w-16 shrink-0 ${m.color}`}>{m.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {e.type === 'sold' ? `#${e.saleNumber ?? ''}${e.customer ? ' · ' + e.customer : ''}` : e.type === 'received' ? `${t('phBatch') || 'Batch'} ${e.batchNumber ?? ''}` : (e.reason || t('phDisposed') || 'Disposed')}
                      </p>
                      <p className="text-[10px] text-slate-400">{new Date(e.date).toLocaleString()}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${m.color}`}>{m.sign}{e.qty}</span>
                    {e.value != null && <span className="text-xs text-slate-400 tabular-nums w-16 text-right shrink-0">${money(e.value)}</span>}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-1.5 pr-2 font-medium">{t('phBatchNo') || 'Batch #'}</th>
                  <th className="py-1.5 px-2 font-medium text-right">{t('phQty') || 'Qty'}</th>
                  <th className="py-1.5 px-2 font-medium text-right">{t('phCost') || 'Cost'}</th>
                  <th className="py-1.5 px-2 font-medium">{t('phExpiry') || 'Expiry'}</th>
                  <th className="py-1.5 pl-2 font-medium">{t('phStatus') || 'Status'}</th>
                </tr></thead>
                <tbody>
                  {data.batches.map((b: any) => (
                    <tr key={b.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <td className="py-1.5 pr-2 text-slate-600 dark:text-slate-300">{b.batchNumber || '—'}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{b.quantity}/{b.initialQty}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-slate-500">${money(b.costPerUnit)}</td>
                      <td className="py-1.5 px-2"><span className={expiryTone(Math.floor((new Date(b.expiryDate).getTime() - Date.now()) / 86_400_000))}>{new Date(b.expiryDate).toLocaleDateString()}</span></td>
                      <td className="py-1.5 pl-2 capitalize text-slate-400">{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
