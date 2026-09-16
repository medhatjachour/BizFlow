// src/pages/POS/components/SplitCheckModal.tsx
import React, { useState } from 'react'
import { X, GitFork, Users, Check, CheckCircle2, AlertTriangle } from 'lucide-react'
import { PosOrder } from '../types'
import { sounds } from '../../utils/sound'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export interface SplitCheckResult {
  targetOrderNumber?: number | null
  targetOrderId?: string
  movedItemCount?: number
  sourceTotals?: { total?: number } | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  order: PosOrder | null
  onSplitBySeats: (selectedSeats: number[]) => Promise<SplitCheckResult | void>
}

export const SplitCheckModal: React.FC<Props> = ({ isOpen, onClose, order, onSplitBySeats }) => {
  const { t } = useLanguage()
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SplitCheckResult | null>(null)

  if (!isOpen || !order) return null

  // Extract distinct seats present in current check
  const presentSeats = Array.from(
    new Set(order.items.filter((i) => i.status !== 'voided').map((i) => i.seatNumber || 1))
  ).sort((a, b) => a - b)

  const handleToggleSeat = (seat: number) => {
    sounds.playBump()
    setError(null)
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    )
  }

  const handleClose = () => {
    setSelectedSeats([])
    setError(null)
    setResult(null)
    onClose()
  }

  const handleExecuteSplit = async () => {
    if (selectedSeats.length === 0) {
      sounds.playError()
      setError(t('restPosSplitSelectSome'))
      return
    }
    if (selectedSeats.length === presentSeats.length) {
      sounds.playError()
      setError(t('restPosSplitNeedsBoth'))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const outcome = await onSplitBySeats(selectedSeats)
      sounds.playSuccess()
      setResult(outcome || {})
    } catch (err: any) {
      sounds.playError()
      // The server rejects moving every line off the check, paid/voided checks
      // and unknown seats. Surface its message instead of swallowing it.
      setError(t('restPosSplitFailed', { message: err?.message || String(err ?? 'Unknown error') }))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate split estimates
  const splitItems = order.items.filter(
    (i) => i.status !== 'voided' && selectedSeats.includes(i.seatNumber || 1)
  )
  const splitSubtotal =
    Math.round(
      splitItems.reduce((s, i) => s + (i.totalPrice || i.unitPrice * i.quantity), 0) * 100
    ) / 100
  const remainingSubtotal = Math.round((order.subtotal - splitSubtotal) * 100) / 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {t('restPosSplitTitle')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('restPosSplitSubtitle', {
                  number: order.orderNumber || order.id.slice(0, 5),
                  table: order.table?.number ?? t('restPosCounterTab')
                })}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label={t('restPosSplitCancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                {t('restPosSplitDoneTitle')}
              </p>
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {t('restPosSplitDone', {
                  seats: selectedSeats.join(', '),
                  number: result.targetOrderNumber ?? '—'
                })}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-[11px] font-bold">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{t('restPosSplitNewTotal')}</span>
                <span className="font-black">${splitSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>
                  {t('restPosSplitRemaining', {
                    number: order.orderNumber || order.id.slice(0, 5)
                  })}
                </span>
                <span className="font-black">
                  $
                  {(result.sourceTotals?.total ?? Math.max(0, order.total - splitSubtotal)).toFixed(
                    2
                  )}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md shadow-purple-500/20 active:scale-[0.98] transition-transform"
            >
              {t('restPosSplitDoneCta')}
            </button>
          </div>
        ) : (
          <>
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                {t('restPosSplitSelectSeats')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presentSeats.map((seat) => {
                  const isSelected = selectedSeats.includes(seat)
                  const count = order.items.filter(
                    (i) => i.status !== 'voided' && (i.seatNumber || 1) === seat
                  ).length

                  return (
                    <button
                      key={seat}
                      type="button"
                      onClick={() => handleToggleSeat(seat)}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 text-purple-600 ring-2 ring-purple-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-sm font-black">
                        <Users className="w-3.5 h-3.5" /> {t('restPosSplitSeatOption', { seat })}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {t('restPosSplitItemCount', { count })}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-purple-500 mt-1" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 leading-relaxed">
                  {error}
                </span>
              </div>
            )}

            {/* Live Estimate Card */}
            {selectedSeats.length > 0 && (
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-purple-900 dark:text-purple-300">
                    {t('restPosSplitNewTotal')}
                  </span>
                  <span className="text-base font-black text-purple-700 dark:text-purple-400">
                    ${splitSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-purple-700/80 dark:text-purple-400/80">
                  <span>
                    {t('restPosSplitRemaining', {
                      number: order.orderNumber || order.id.slice(0, 5)
                    })}
                  </span>
                  <span className="font-black">${Math.max(0, remainingSubtotal).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                {t('restPosSplitCancel')}
              </button>
              <button
                type="button"
                disabled={selectedSeats.length === 0 || isSubmitting}
                onClick={handleExecuteSplit}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.98] transition-transform"
              >
                {isSubmitting ? t('restPosSplitSubmitting') : t('restPosSplitSubmit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
