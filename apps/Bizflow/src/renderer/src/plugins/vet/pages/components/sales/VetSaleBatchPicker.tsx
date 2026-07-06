/**
 * Batch picker for the Vet Sales operation — lists a medicine's batches sorted
 * earliest-expiry-first (FEFO), blocking expired/empty batches from sale.
 *
 * Extracted from VetSalesTab.tsx (prop-driven, owns no business logic).
 */
import { X, Package, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { daysUntil, remainingDisplay } from './vetSales.shared'
import type { MedicineLite, BatchLite } from './vetSales.types'

export default function BatchPickerModal({
  medicine, selectedBatchId, onSelect, onClose,
}: {
  medicine: MedicineLite; selectedBatchId: string
  onSelect: (b: BatchLite) => void; onClose: () => void
}) {
  const { t } = useLanguage()
  const sorted = [...medicine.batches].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  )
  const fefoId = sorted.find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0)?.id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">{t('vetSelectBatch')||'Select Batch'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{medicine.name} · {t('vetFefoHint')||'sorted earliest expiry first (FEFO)'}</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
          {sorted.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('vetNoBatchesAvailable')||'No batches available'}</p>
            </div>
          ) : sorted.map(b => {
            const days     = daysUntil(b.expiryDate)
            const expired  = days < 0
            const warnSoon = !expired && days <= 7
            const warnMid  = !expired && !warnSoon && days <= 30
            const isEmpty  = b.quantity <= 0
            const isBlocked = expired || isEmpty  // expired batches must be written off, not sold
            const isSel    = b.id === selectedBatchId

            return (
              <button key={b.id} type="button" disabled={isBlocked}
                onClick={() => { onSelect(b); onClose() }}
                className={[
                  'w-full text-left rounded-xl border p-4 transition-all relative',
                  isBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  isSel
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-500/30'
                    : expired
                    ? 'border-red-300 dark:border-red-700 bg-red-50/70 dark:bg-red-900/20'
                    : warnSoon || warnMid
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-violet-400 dark:hover:border-violet-600',
                ].join(' ')}>

                {isSel && <CheckCircle2 className="absolute top-3.5 right-3.5 h-4 w-4 text-violet-500" />}

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {b.batchNumber ?? 'No lot #'}
                      </span>
                      {b.id === fefoId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-bold">
                          FEFO
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {(() => {
                        const s = remainingDisplay(b.quantity, medicine.unit, medicine.subUnit, medicine.subUnitsPerContainer)
                        return <>{s.value} <span className="text-xs font-normal text-slate-400">{s.unit} {t('remaining')||'remaining'}</span>{s.secondary && <span className="text-xs font-normal text-slate-300 dark:text-slate-500"> ({s.secondary})</span>}</>
                      })()}
                    </p>
                    {b.supplier && <p className="text-xs text-slate-400 truncate">{b.supplier}</p>}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    {expired
                      ? <>
                          <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('vetExpiredBadge')||'Expired'}</span>
                          <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold">{t('vetWriteOffFirst')||'Write off first'}</p>
                        </>
                    : warnSoon ? <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{days}d</span>
                    : warnMid  ? <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{days}d</span>
                    :            <span className="inline-block text-[11px] text-slate-400">{t('vetExpPrefix')||'Exp:'} {new Date(b.expiryDate).toLocaleDateString()}</span>}
                    {b.costPerUnit > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">${b.costPerUnit.toFixed(2)}/unit</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
