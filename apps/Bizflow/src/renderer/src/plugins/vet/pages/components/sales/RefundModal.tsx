import { useState } from 'react'
import { RotateCcw, Loader2, Minus, Plus } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Sale, SaleGroup } from './vetSales.types'

// ── Refund Modal (single sale or whole transaction) ──────────────────────────
export default function RefundModal({ target, onClose, onDone }: {
  target: { kind: 'sale'; sale: Sale } | { kind: 'group'; group: SaleGroup }
  onClose: () => void; onDone: () => void
}) {
  const toast = useToast()
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const isGroup = target.kind === 'group'
  const itemCount = isGroup ? target.group.itemCount : 1

  // Single-item refunds can be partial: refund N of the still-refundable units.
  const sale = !isGroup ? target.sale : null
  const refundableQty = sale ? Math.max(0, sale.quantity - (sale.refundedQty ?? 0)) : 0
  const unitLabel = sale
    ? (sale.saleUnit === 'sub' && sale.medicine.subUnit ? sale.medicine.subUnit : sale.medicine.unit)
    : ''
  const [qtyStr, setQtyStr] = useState(() => String(refundableQty))
  const qty = Math.max(0, parseFloat(qtyStr) || 0)
  const qtyValid = !sale || (qty > 0 && qty <= refundableQty + 0.0001)

  const amount = isGroup
    ? Math.max(0, target.group.total - (target.group.refunded ?? 0))
    : sale && sale.quantity > 0
      ? Math.round((qty / sale.quantity) * sale.totalPrice * 100) / 100
      : 0

  async function confirm() {
    if (!qtyValid) return
    setBusy(true)
    try {
      if (isGroup) {
        const res = await window.api.vet?.medicines.refundSaleGroup(target.group.groupKey, { reason: reason || undefined })
        toast.success(`${t('vetRefunded') || 'Refunded'} $${(res?.totalRefund ?? amount).toFixed(2)}`)
      } else {
        const res = await window.api.vet?.medicines.refundSale(target.sale.id, { quantity: qty, reason: reason || undefined })
        toast.success(`${t('vetRefunded') || 'Refunded'} $${(res?.refundAmount ?? amount).toFixed(2)}`)
      }
      onDone(); onClose()
    } catch (e: any) { toast.error(e?.message ?? 'Refund failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0"><RotateCcw className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{isGroup ? (t('vetRefundTransaction') || 'Refund transaction') : (t('vetRefundSale') || 'Refund item')}</h3>
            <p className="text-xs text-slate-400">{isGroup ? `${itemCount} ${itemCount === 1 ? (t('vetItemLabel') || 'item') : (t('vetItemsLabel') || 'items')}` : (target as any).sale.medicine.name}</p>
          </div>
        </div>

        {/* Quantity to refund — partial refunds for single items */}
        {sale && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('vetRefundQty') || 'Quantity to refund'}
              <span className="text-slate-400 font-normal"> · {t('vetRefundableOf') || 'of'} {refundableQty} {unitLabel}</span>
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQtyStr(String(Math.max(0, Math.round((qty - 1) * 100) / 100)))}
                className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><Minus className="h-4 w-4" /></button>
              <input type="number" min="0" step="any" value={qtyStr} onChange={e => setQtyStr(e.target.value)}
                className={`flex-1 px-3 py-2 text-sm text-center border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 ${qtyValid ? 'border-slate-200 dark:border-slate-700' : 'border-red-400 ring-1 ring-red-400/40'}`} />
              <button type="button" onClick={() => setQtyStr(String(Math.min(refundableQty, Math.round((qty + 1) * 100) / 100)))}
                className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><Plus className="h-4 w-4" /></button>
              <button type="button" onClick={() => setQtyStr(String(refundableQty))}
                className="px-2.5 h-9 shrink-0 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20">{t('vetRefundAll') || 'All'}</button>
            </div>
            {!qtyValid && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{(t('vetRefundMax') || 'Max {n}').replace('{n}', `${refundableQty} ${unitLabel}`)}</p>}
          </div>
        )}

        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 mb-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{t('vetRefundAmount') || 'Amount to refund'}</span>
            <span className="font-bold text-red-700 dark:text-red-400">${amount.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('vetRefundRestockNote') || 'Stock will be returned to the batch.'}</p>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetWriteOffReason') || 'Reason (optional)'}</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t('vetRefundReasonPlaceholder') || 'e.g. Customer returned item'}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('vetMedCancel') || 'Cancel'}</button>
          <button onClick={confirm} disabled={busy || !qtyValid} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-3.5 w-3.5" /> {t('vetRefund') || 'Refund'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
