import React, { useState } from 'react'
import { Pill, Pencil, RotateCcw, Check, X, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PAYMENT_STATUS_COLORS } from '../constants'
import type { Sale } from '../types'

interface Props {
  item: Sale
  onPaid: () => void
  onEdit: () => void
  onRefund: () => void
}

export const GroupLineItem: React.FC<Props> = ({ item, onPaid, onEdit, onRefund }) => {
  const toast = useToast()
  const { t } = useLanguage()

  const [paying, setPaying] = useState(false)
  const [payAmt, setPayAmt] = useState('')
  const [busy, setBusy] = useState(false)

  const cogs = item.costTotal ?? item.quantity * (item.batch?.costPerUnit ?? 0)
  const paidAmt = item.amountPaid ?? item.totalPrice
  const remaining = Math.max(0, item.totalPrice - paidAmt)
  const pstatus = item.paymentStatus ?? (remaining > 0.005 ? 'partial' : 'paid')
  const unitLabel = item.saleUnit === 'sub' ? (item.medicine.subUnit ?? 'sub') : item.medicine.unit
  const isRefunded = item.status === 'refunded'

  const handleRecordPay = async () => {
    const val = parseFloat(payAmt)
    if (isNaN(val) || val <= 0) {
      toast.error(t('vetEnterValidAmount') || 'Enter a valid amount')
      return
    }
    setBusy(true)
    try {
      await (window as any).api?.vet?.medicines?.updateSalePayment(
        item.id,
        Math.min(paidAmt + val, item.totalPrice)
      )
      toast.success(t('vetPaymentRecorded') || 'Payment recorded')
      setPaying(false)
      setPayAmt('')
      onPaid()
    } catch {
      toast.error(t('vetPaymentFailed') || 'Failed to record payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`px-4 py-3 flex items-center justify-between gap-4 transition-colors ${
        isRefunded
          ? 'opacity-60 bg-red-50/30 dark:bg-red-950/10'
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
          <Pill className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-xs text-slate-900 dark:text-white truncate ${
                isRefunded ? 'line-through' : ''
              }`}
            >
              {item.medicine.name}
            </span>
            {isRefunded && (
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                Refunded
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Lot: {item.batch?.batchNumber || '—'} · {item.quantity} {unitLabel} × $
            {item.unitPrice.toFixed(2)}
            {item.discount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {' '}
                -${item.discount.toFixed(2)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Pricing and Status */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-xs font-black text-slate-900 dark:text-white">
            ${item.totalPrice.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400">Cost: ${cogs.toFixed(2)}</p>
        </div>

        {!isRefunded && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
              PAYMENT_STATUS_COLORS[pstatus] ?? PAYMENT_STATUS_COLORS.paid
            }`}
          >
            {pstatus}
          </span>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1 justify-end min-w-[80px]">
          {paying ? (
            <div className="flex items-center gap-1 animate-in fade-in">
              <input
                type="number"
                min="0"
                max={remaining}
                step="any"
                autoFocus
                placeholder={remaining.toFixed(2)}
                value={payAmt}
                onChange={e => setPayAmt(e.target.value)}
                className="w-16 px-1.5 py-0.5 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={handleRecordPay}
                disabled={busy}
                className="p-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </button>
              <button
                type="button"
                onClick={() => setPaying(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              {!isRefunded && pstatus !== 'paid' && (
                <button
                  type="button"
                  onClick={() => setPaying(true)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60 hover:bg-violet-100"
                >
                  Pay ${remaining.toFixed(2)}
                </button>
              )}
              {!isRefunded && (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                    title="Edit Item"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={onRefund}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Refund Item"
                  >
                    <RotateCcw size={13} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}