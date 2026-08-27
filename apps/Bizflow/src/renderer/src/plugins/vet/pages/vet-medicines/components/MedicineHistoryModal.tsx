
import React, { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  X,
  History,
  Calendar,
  ShoppingCart,
  ArrowDownToLine,
  TrendingUp,
  DollarSign,
  XCircle,
  Pencil
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import VetPeriodFilter from '../../vet-stats/VetPeriodFilter'
import { formatAuditChange, formatCurrency } from '../utils'
import type { HistoryEvent, HistorySummary } from '../types'

interface MedicineHistoryModalProps {
  medicineId: string
  medicineName: string
  onClose: () => void
}

export const MedicineHistoryModal: React.FC<MedicineHistoryModalProps> = ({
  medicineId,
  medicineName,
  onClose
}) => {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [summary, setSummary] = useState<HistorySummary | null>(null)
  const [medUnit, setMedUnit] = useState('')
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'sold' | 'disposed' | 'edited'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await (window as any).api?.vet?.medicines?.getHistory(medicineId, {
        from: range.from,
        to: range.to
      })
      setEvents(res?.events ?? [])
      setSummary(res?.summary ?? null)
      setMedUnit(res?.medicine?.unit ?? '')
    } catch {
      setEvents([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [medicineId, range])

  useEffect(() => {
    load()
  }, [load])

  const shown = events.filter(e => typeFilter === 'all' || e.type === typeFilter)

  const EVENT_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    received: {
      icon: ArrowDownToLine,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      label: t('vetHistReceived') || 'Stock received'
    },
    sold: {
      icon: ShoppingCart,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      label: t('vetHistSold') || 'Sold'
    },
    disposed: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      label: t('vetHistDisposed') || 'Written off'
    },
    edited: {
      icon: Pencil,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      label: t('vetHistEdited') || 'Edited'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <History className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{medicineName}</h2>
              <p className="text-xs text-slate-400">
                {t('vetMedicineHistory') || 'Inventory history & activity'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5">
          <VetPeriodFilter onChange={r => setRange({ from: r.from, to: r.to })} defaultPreset="all" />
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              {t('vetHistType') || 'Type'}:
            </span>
            {(['all', 'received', 'sold', 'disposed', 'edited'] as const).map(ty => (
              <button
                key={ty}
                onClick={() => setTypeFilter(ty)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize transition-colors ${
                  typeFilter === ty
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400'
                }`}
              >
                {ty === 'all' ? t('vetFilterAll') || 'All' : EVENT_META[ty]?.label ?? ty}
              </button>
            ))}
          </div>
        </div>

        {summary && (
          <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2 flex items-center gap-2.5">
              <ArrowDownToLine className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="min-w-0">
                <p className="text-sm font-black text-blue-600 dark:text-blue-400 leading-none truncate">
                  {summary.totalReceived ?? 0} {medUnit}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('vetHistReceivedTotal') || 'Received'}
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2 flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0">
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 leading-none truncate">
                  {formatCurrency(summary.salesRevenue)}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('vetHistRevenue') || 'Revenue'}
                </p>
              </div>
            </div>

            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2 flex items-center gap-2.5">
              <DollarSign className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
              <div className="min-w-0">
                <p className="text-sm font-black text-violet-600 dark:text-violet-400 leading-none truncate">
                  {formatCurrency(summary.salesProfit)}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('vetHistProfit') || 'Profit'}
                </p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 flex items-center gap-2.5">
              <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0">
                <p className="text-sm font-black text-red-600 dark:text-red-400 leading-none truncate">
                  {formatCurrency(summary.disposalLoss)}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('vetHistLoss') || 'Write-off loss'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <History className="h-9 w-9 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('vetHistNoEvents') || 'No activity in this period'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map(e => {
                const meta = EVENT_META[e.type] || EVENT_META.edited
                const Icon = meta.icon
                const d = new Date(e.date)
                const unitLabel =
                  e.type === 'sold' && e.saleUnit === 'sub' && e.subUnit ? e.subUnit : e.unit || medUnit

                return (
                  <div
                    key={e.id}
                    className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40"
                  >
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {e.type === 'edited' && e.action === 'adjust_stock'
                              ? t('vetHistAdjusted') || 'Stock adjusted'
                              : meta.label}
                          </span>
                          {e.batchNumber && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              LOT {e.batchNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" /> {d.toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {e.type === 'received' && (
                          <>
                            <span className="font-semibold text-blue-600">+{e.quantity} {unitLabel}</span>
                            {e.costPerUnit ? ` @ $${e.costPerUnit.toFixed(2)} = $${(e.totalCost ?? 0).toFixed(2)}` : ''}
                            {e.supplier ? ` · ${e.supplier}` : ''}
                          </>
                        )}
                        {e.type === 'sold' && (
                          <>
                            <span className="font-semibold text-red-500">−{e.quantity} {unitLabel}</span>
                            {` @ $${(e.unitPrice ?? 0).toFixed(2)} = $${(e.totalPrice ?? 0).toFixed(2)}`}
                            {e.ownerName ? ` · ${e.ownerName}` : ''}
                            {typeof e.grossProfit === 'number' && (
                              <span className={e.grossProfit >= 0 ? ' text-emerald-600' : ' text-red-600'}>
                                {` · ${e.grossProfit >= 0 ? '+' : ''}$${e.grossProfit.toFixed(2)} ${t('vetProfit') || 'profit'}`}
                              </span>
                            )}
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
                          <div className="space-y-0.5">
                            {e.userName && <span className="text-amber-600 font-medium">By {e.userName}: </span>}
                            {(e.changes ?? []).map((c, ci) => (
                              <div key={ci}>
                                {c.label}: <span className="line-through">{formatAuditChange(c.from)}</span> →{' '}
                                <span className="font-semibold">{formatAuditChange(c.to)}</span>
                              </div>
                            ))}
                            {e.note && <div>{e.note}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {shown.length} {shown.length === 1 ? t('vetHistEvent') || 'event' : t('vetHistEvents') || 'events'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {t('vetClose') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}