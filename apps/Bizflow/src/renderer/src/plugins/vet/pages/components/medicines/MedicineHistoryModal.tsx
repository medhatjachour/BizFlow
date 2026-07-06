import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, X, History, Calendar, ShoppingCart,
  ArrowDownToLine, TrendingUp, DollarSign, XCircle, Pencil
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import VetPeriodFilter from '../stats/VetPeriodFilter'
import type { HistoryEvent } from './vetMedicines.types'
import { api } from './vetMedicines.shared'

/** Display an audit before/after value: dates as locale dates, blanks as a dash. */
function formatChange(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString()
  return String(v)
}

export default function MedicineHistoryModal({ medicineId, medicineName, onClose }: {
  medicineId: string; medicineName: string; onClose: () => void
}) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [summary, setSummary] = useState<any | null>(null)
  const [medUnit, setMedUnit] = useState('')
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'sold' | 'disposed' | 'edited'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getHistory(medicineId, { from: range.from, to: range.to })
      setEvents(res?.events ?? [])
      setSummary(res?.summary ?? null)
      setMedUnit(res?.medicine?.unit ?? '')
    } catch { setEvents([]); setSummary(null) }
    finally { setLoading(false) }
  }, [medicineId, range.from, range.to])

  useEffect(() => { load() }, [load])

  const shown = events.filter(e => typeFilter === 'all' || e.type === typeFilter)

  const EVENT_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    received: { icon: ArrowDownToLine, color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/30',     label: t('vetHistReceived') || 'Stock received' },
    sold:     { icon: ShoppingCart,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: t('vetHistSold') || 'Sold' },
    disposed: { icon: XCircle,         color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-900/30',       label: t('vetHistDisposed') || 'Written off' },
    edited:   { icon: Pencil,          color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/30',   label: t('vetHistEdited') || 'Edited' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <History className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{medicineName}</h2>
              <p className="text-xs text-slate-400">{t('vetMedicineHistory') || 'Inventory history & activity'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5">
          <VetPeriodFilter onChange={r => setRange({ from: r.from, to: r.to })} defaultPreset="all" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">{t('vetHistType') || 'Type'}:</span>
            {(['all', 'received', 'sold', 'disposed', 'edited'] as const).map(ty => (
              <button key={ty} onClick={() => setTypeFilter(ty)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize transition-colors
                  ${typeFilter === ty ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                {ty === 'all' ? (t('vetFilterAll') || 'All') : EVENT_META[ty]?.label ?? ty}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 border-b border-slate-100 dark:border-slate-800">
            {[
              { label: t('vetHistReceivedTotal') || 'Received', val: `${summary.totalReceived ?? 0} ${medUnit}`, icon: ArrowDownToLine, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: t('vetHistRevenue') || 'Revenue', val: `$${(summary.salesRevenue ?? 0).toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: t('vetHistProfit') || 'Profit', val: `$${(summary.salesProfit ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
              { label: t('vetHistLoss') || 'Write-off loss', val: `$${(summary.disposalLoss ?? 0).toFixed(2)}`, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2 flex items-center gap-2.5`}>
                <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-black ${s.color} leading-none truncate`}>{s.val}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <History className="h-9 w-9 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('vetHistNoEvents') || 'No activity in this period'}</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-1">
              {/* vertical line */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
              {shown.map(e => {
                const meta = EVENT_META[e.type]
                const Icon = meta.icon
                const d = new Date(e.date)
                const unitLabel = e.type === 'sold' && e.saleUnit === 'sub' && e.subUnit ? e.subUnit : (e.unit || medUnit)
                return (
                  <div key={e.id} className="relative flex gap-3 py-2">
                    <div className={`absolute -left-6 mt-0.5 w-4 h-4 rounded-full ${meta.bg} ring-4 ring-white dark:ring-slate-900 flex items-center justify-center`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.color.replace('text-', 'bg-')}`} />
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{e.type === 'edited' && e.action === 'adjust_stock' ? (t('vetHistAdjusted') || 'Stock adjusted') : meta.label}</span>
                          {e.batchNumber && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">LOT {e.batchNumber}</span>}
                          {e.type === 'sold' && e.paymentStatus && e.paymentStatus !== 'paid' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 capitalize">{e.paymentStatus}</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" /> {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {e.type === 'received' && (
                          <>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">+{e.quantity} {unitLabel}</span>
                            {e.costPerUnit ? ` @ $${e.costPerUnit.toFixed(2)} = $${(e.totalCost ?? 0).toFixed(2)}` : ''}
                            {e.supplier ? ` · ${e.supplier}` : ''}
                            {e.expiryDate ? ` · ${t('vetExpPrefix') || 'Exp:'} ${new Date(e.expiryDate).toLocaleDateString()}` : ''}
                          </>
                        )}
                        {e.type === 'sold' && (
                          <>
                            <span className="font-semibold text-red-500">−{e.quantity} {unitLabel}</span>
                            {` @ $${(e.unitPrice ?? 0).toFixed(2)} = $${(e.totalPrice ?? 0).toFixed(2)}`}
                            {(e.discount ?? 0) > 0 ? ` · −$${(e.discount ?? 0).toFixed(2)} disc` : ''}
                            {e.ownerName ? ` · ${e.ownerName}` : ''}
                            {typeof e.grossProfit === 'number' ? <span className={e.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{` · ${e.grossProfit >= 0 ? '+' : ''}$${e.grossProfit.toFixed(2)} ${t('vetProfit') || 'profit'}`}</span> : ''}
                          </>
                        )}
                        {e.type === 'disposed' && (
                          <>
                            <span className="font-semibold text-red-500">−{e.quantity} {unitLabel}</span>
                            {` · −$${(e.lossAmount ?? 0).toFixed(2)} ${t('vetHistLoss') || 'loss'}`}
                            {e.reason ? ` · ${e.reason}` : ''}
                          </>
                        )}
                        {e.type === 'edited' && (
                          <span className="flex flex-col gap-0.5">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {e.userName
                                ? `${e.action === 'adjust_stock' ? (t('vetHistAdjustedBy') || 'Adjusted by') : (t('vetHistEditedBy') || 'Edited by')} ${e.userName}`
                                : (e.action === 'adjust_stock' ? (t('vetHistAdjusted') || 'Stock adjusted') : (t('vetHistEdited') || 'Edited'))}
                            </span>
                            {(e.changes ?? []).map((c, ci) => (
                              <span key={ci} className="text-slate-500 dark:text-slate-400">
                                {c.label}: <span className="line-through text-slate-400">{formatChange(c.from)}</span>{' → '}<span className="font-semibold text-slate-700 dark:text-slate-200">{formatChange(c.to)}</span>
                              </span>
                            ))}
                            {e.note && <span className="text-slate-500 dark:text-slate-400">{e.note}</span>}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {shown.length} {shown.length === 1 ? (t('vetHistEvent') || 'event') : (t('vetHistEvents') || 'events')}
          </p>
          <button onClick={onClose} className="px-4 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            {t('vetClose') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
