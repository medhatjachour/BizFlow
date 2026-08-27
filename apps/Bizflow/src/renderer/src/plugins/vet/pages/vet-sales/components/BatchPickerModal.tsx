import React from 'react'
import { X, Package, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { daysUntil, remainingDisplay } from '../utils'
import type { MedicineLite, BatchLite } from '../types'

interface Props {
  medicine: MedicineLite
  selectedBatchId: string
  onSelect: (batch: BatchLite) => void
  onClose: () => void
}

export const BatchPickerModal: React.FC<Props> = ({
  medicine,
  selectedBatchId,
  onSelect,
  onClose
}) => {
  const { t } = useLanguage()
  const sortedBatches = [...medicine.batches].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  )

  const fefoBatchId = sortedBatches.find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0)?.id

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {t('vetSelectBatch') || 'Select Batch'}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-bold uppercase tracking-wider">
                FEFO Priority
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {medicine.name} · Sorted earliest expiration first
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Batch List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
          {sortedBatches.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30 stroke-1" />
              <p className="text-sm font-medium">{t('vetNoBatchesAvailable') || 'No batches registered'}</p>
            </div>
          ) : (
            sortedBatches.map(b => {
              const days = daysUntil(b.expiryDate)
              const expired = days < 0
              const warnSoon = !expired && days <= 7
              const warnMid = !expired && !warnSoon && days <= 30
              const isEmpty = b.quantity <= 0
              const isBlocked = expired || isEmpty
              const isSelected = b.id === selectedBatchId
              const isFefo = b.id === fefoBatchId

              const stockInfo = remainingDisplay(
                b.quantity,
                medicine.unit,
                medicine.subUnit,
                medicine.subUnitsPerContainer
              )

              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    onSelect(b)
                    onClose()
                  }}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all relative flex flex-col gap-2 ${
                    isBlocked
                      ? 'opacity-40 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : isSelected
                      ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 ring-2 ring-violet-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {b.batchNumber || 'Lot: Default'}
                        </span>
                        {isFefo && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
                            RECOMMENDED
                          </span>
                        )}
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-violet-500" />}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                        {stockInfo.value} <span className="font-normal text-slate-400">{stockInfo.unit}</span>
                        {stockInfo.secondary && (
                          <span className="text-[11px] text-slate-400 font-normal ml-1">
                            ({stockInfo.secondary})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {expired ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" /> Expired
                        </span>
                      ) : warnSoon || warnMid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                          <Clock className="h-3 w-3" /> {days}d left
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Exp: {new Date(b.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                      {b.sellingPrice && (
                        <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mt-1">
                          ${b.sellingPrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}