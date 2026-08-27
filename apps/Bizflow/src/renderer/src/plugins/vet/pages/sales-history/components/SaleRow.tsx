import React, { useState } from 'react'
import { Pencil, RotateCcw, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PAYMENT_STATUS_COLORS } from '../constants'
import { formatDate } from '../utils'
import type { Sale } from '../types'

interface Props {
  sale: Sale
  onPaid: () => void
  onEdit: () => void
  onRefund: () => void
}

export const SaleRow: React.FC<Props> = ({ sale, onPaid, onEdit, onRefund }) => {
  const toast = useToast()
  const { t } = useLanguage()

  const [paying, setPaying] = useState(false)
  const [payAmt, setPayAmt] = useState('')
  const [busy, setBusy] = useState(false)

  const isRefunded = sale.status === 'refunded'
//   const isPartRefund = sale.status === 'partially_refunded'

  const cogs =
    sale.costTotal ??
    (sale.quantity / (sale.saleUnit === 'sub' ? sale.medicine?.subUnitsPerContainer ?? 1 : 1)) *
      (sale.batch?.costPerUnit ?? 0)
  const profit = sale.grossProfit ?? sale.totalPrice - cogs
  const paidAmt = sale.amountPaid ?? sale.totalPrice
  const remaining = Math.max(0, sale.totalPrice - paidAmt)
  const pstatus = sale.paymentStatus ?? (remaining > 0.005 ? 'partial' : 'paid')
  const unitLabel = sale.saleUnit === 'sub' ? (sale.medicine.subUnit ?? 'sub') : sale.medicine.unit

  const handlePay = async () => {
    const val = parseFloat(payAmt)
    if (isNaN(val) || val <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setBusy(true)
    try {
      await (window as any).api?.vet?.medicines?.updateSalePayment(
        sale.id,
        Math.min(paidAmt + val, sale.totalPrice)
      )
      toast.success('Payment recorded')
      setPaying(false)
      setPayAmt('')
      onPaid()
    } catch {
      toast.error('Failed to record payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <tr
        className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
          isRefunded
            ? 'opacity-60 bg-red-50/20 dark:bg-red-950/10'
            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
        }`}
      >
        <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
          {formatDate(sale.saleDate)}
        </td>
        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
          <span className={isRefunded ? 'line-through' : ''}>{sale.medicine.name}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="font-mono text-slate-600 dark:text-slate-300">
            {sale.batch.batchNumber || '—'}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
          {sale.ownerName || sale.patientName || '—'}
        </td>
        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
          {sale.quantity} <span className="text-slate-400 font-normal">{unitLabel}</span>
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
          ${sale.unitPrice.toFixed(2)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {sale.discount > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              -${sale.discount.toFixed(2)}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 font-black text-slate-900 dark:text-white whitespace-nowrap">
          ${sale.totalPrice.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">${cogs.toFixed(2)}</td>
        <td
          className={`px-4 py-3 font-bold whitespace-nowrap ${
            profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
          }`}
        >
          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
              PAYMENT_STATUS_COLORS[pstatus] ?? PAYMENT_STATUS_COLORS.paid
            }`}
          >
            {pstatus}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-1">
            {!isRefunded && pstatus !== 'paid' && (
              <button
                type="button"
                onClick={() => setPaying(v => !v)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800"
              >
                Pay
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              disabled={isRefunded}
              className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg disabled:opacity-30"
              title="Edit Line"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={onRefund}
              disabled={isRefunded}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg disabled:opacity-30"
              title="Refund Line"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Inline Pay Stepper Row */}
      {paying && (
        <tr className="bg-violet-50/60 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900/40">
          <td colSpan={12} className="px-4 py-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Collect Payment for {sale.medicine.name} (Due: ${remaining.toFixed(2)}):
              </span>
              <input
                type="number"
                min="0"
                max={remaining}
                step="any"
                value={payAmt}
                onChange={e => setPayAmt(e.target.value)}
                placeholder={remaining.toFixed(2)}
                className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
              />
              <button
                onClick={handlePay}
                disabled={busy}
                className="px-3 py-1 bg-violet-600 text-white rounded-lg font-bold flex items-center gap-1"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
              </button>
              <button
                onClick={() => setPaying(false)}
                className="px-2 py-1 text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}