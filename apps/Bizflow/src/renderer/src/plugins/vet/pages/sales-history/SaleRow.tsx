import { useState } from 'react'
import { Pencil, RotateCcw } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Sale } from './vetSales.types'

// ── Sale Row (with inline pay) ────────────────────────────────────────────────
export default function SaleRow({ s, cogs, profit, paidAmt, remaining, pstatus, statusMap, onPaid, onEdit, onRefund }: {
  s: Sale; cogs: number; profit: number; paidAmt: number; remaining: number
  pstatus: string; statusMap: Record<string, string>; onPaid: () => void
  onEdit: () => void; onRefund: () => void
}) {
  const [paying, setPaying] = useState(false)
  const [payAmt, setPayAmt]  = useState('')
  const [busy, setBusy]      = useState(false)
  const toast = useToast()
  const { t } = useLanguage()
  const isRefunded = s.status === 'refunded'
  const isPartRefund = s.status === 'partially_refunded'

  async function handlePay() {
    const val = parseFloat(payAmt)
    if (isNaN(val) || val <= 0) { toast.error('Enter a valid amount'); return }
    const total = Math.min(paidAmt + val, s.totalPrice)
    setBusy(true)
    try {
      await window.api.vet?.medicines.updateSalePayment(s.id, total)
      toast.success('Payment recorded')
      setPaying(false); setPayAmt('')
      onPaid()
    } catch { toast.error('Failed to record payment') }
    finally { setBusy(false) }
  }

  return (
    <>
      <tr className={`transition-colors ${isRefunded ? 'opacity-60 bg-red-50/30 dark:bg-red-900/5' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/20'}`}>
        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(s.saleDate).toLocaleDateString()}</td>
        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
          <span className={isRefunded ? 'line-through' : ''}>{s.medicine.name}</span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="font-mono text-slate-600 dark:text-slate-300">{s.batch.batchNumber ?? '—'}</p>
          <p className="text-[10px] text-slate-400">{new Date(s.batch.expiryDate).toLocaleDateString()}</p>
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.ownerName ?? s.patientName ?? '—'}</td>
        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
          {s.quantity} <span className="text-slate-400 font-normal">{s.saleUnit === 'sub' ? (s.medicine.subUnit ?? 'sub') : s.medicine.unit}</span>
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.unitPrice > 0 ? `$${s.unitPrice.toFixed(2)}` : '—'}</td>
        <td className="px-4 py-3">{s.discount > 0 ? <span className="text-emerald-600 dark:text-emerald-400">-${s.discount.toFixed(2)}</span> : <span className="text-slate-400">—</span>}</td>
        <td className="px-4 py-3 font-black text-violet-700 dark:text-violet-300 whitespace-nowrap">${s.totalPrice.toFixed(2)}</td>
        <td className="px-4 py-3 text-orange-600 dark:text-orange-400 whitespace-nowrap">{cogs > 0 ? `$${cogs.toFixed(2)}` : '—'}</td>
        <td className={`px-4 py-3 font-semibold whitespace-nowrap ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="font-semibold text-slate-700 dark:text-slate-300">${paidAmt.toFixed(2)}</p>
          {remaining > 0.005 && <p className="text-[10px] text-red-500">-${remaining.toFixed(2)}</p>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {isRefunded ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">{t('vetRefundedBadge') || 'Refunded'}</span>
            ) : (
              <>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusMap[pstatus] ?? statusMap.paid}`}>{pstatus}</span>
                {isPartRefund && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">{t('vetPartRefund') || 'part. refund'}</span>}
                {pstatus !== 'paid' && (
                  <button onClick={() => setPaying(v => !v)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 transition-colors">
                    {t('vetPay') || 'Pay'}
                  </button>
                )}
              </>
            )}
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-0.5">
            <button onClick={onEdit} disabled={isRefunded} title={t('vetEditSale') || 'Edit sale'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onRefund} disabled={isRefunded} title={t('vetRefund') || 'Refund'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {paying && (
        <tr className="bg-amber-50/60 dark:bg-amber-900/10">
          <td colSpan={13} className="px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Record payment for {s.medicine.name} (remaining: ${remaining.toFixed(2)})</span>
              <input type="number" min="0" max={remaining} step="any"
                placeholder={remaining.toFixed(2)}
                value={payAmt} onChange={e => setPayAmt(e.target.value)}
                className="w-28 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              <button onClick={handlePay} disabled={busy}
                className="px-3 py-1 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {busy ? '...' : 'Record'}
              </button>
              <button onClick={() => { setPaying(false); setPayAmt('') }}
                className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
