import { useState } from 'react'
import {
  Pill, X, Pencil, RotateCcw, Receipt, Package, Calendar, Hash, ChevronDown, ChevronRight, ExternalLink,
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { PAY_COLOR, GROUP_STATUS } from './vetSales.shared'
import type { Sale, SaleGroup } from './vetSales.types'

// ── Grouped Transaction Row (combined receipt) ────────────────────────────────

function GroupLineItem({ item, onPaid, onEdit, onRefund }: {
  item: Sale; onPaid: () => void; onEdit: () => void; onRefund: () => void
}) {
  const toast = useToast()
  const { t } = useLanguage()
  const [paying, setPaying] = useState(false)
  const [payAmt, setPayAmt] = useState('')
  const [busy, setBusy] = useState(false)

  const cogs      = item.costTotal ?? item.quantity * (item.batch?.costPerUnit ?? 0)
  const paidAmt   = item.amountPaid ?? item.totalPrice
  const remaining = Math.max(0, item.totalPrice - paidAmt)
  const pstatus   = item.paymentStatus ?? (remaining > 0.005 ? 'partial' : 'paid')
  const unitLabel = item.saleUnit === 'sub' ? (item.medicine.subUnit ?? 'sub') : item.medicine.unit
  const isRefunded = item.status === 'refunded'

  async function handlePay() {
    const val = parseFloat(payAmt)
    if (isNaN(val) || val <= 0) { toast.error(t('vetEnterValidAmount') || 'Enter a valid amount'); return }
    setBusy(true)
    try {
      await window.api.vet?.medicines.updateSalePayment(item.id, Math.min(paidAmt + val, item.totalPrice))
      toast.success(t('vetPaymentRecorded') || 'Payment recorded')
      setPaying(false); setPayAmt(''); onPaid()
    } catch { toast.error(t('vetPaymentFailed') || 'Failed to record payment') }
    finally { setBusy(false) }
  }

  return (
    <div className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${isRefunded ? 'opacity-60 bg-red-50/30 dark:bg-red-900/5' : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/20'}`}>
      <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
        <Pill className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
          <span className={isRefunded ? 'line-through' : ''}>{item.medicine.name}</span>
          {isRefunded && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 no-underline inline-block">{t('vetRefundedBadge') || 'Refunded'}</span>}
        </p>
        <p className="text-[10px] text-slate-400">
          {t('vetLotPrefix') || 'Lot:'} {item.batch?.batchNumber ?? '—'} · {item.quantity} {unitLabel} × ${item.unitPrice.toFixed(2)}
          {item.discount > 0 && <span className="text-emerald-600 dark:text-emerald-400"> −${item.discount.toFixed(2)}</span>}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-bold text-slate-900 dark:text-white">${item.totalPrice.toFixed(2)}</p>
        <p className="text-[10px] text-slate-400">{t('vetCostShort') || 'cost'} ${cogs.toFixed(2)}</p>
      </div>
      <div className="shrink-0 w-16 text-right">
        {!isRefunded && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${GROUP_STATUS[pstatus] ?? GROUP_STATUS.paid}`}>{pstatus}</span>}
      </div>
      <div className="shrink-0 w-24 text-right flex items-center justify-end gap-0.5">
        {!isRefunded && pstatus !== 'paid' && !paying && (
          <button onClick={() => setPaying(true)}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 transition-colors">
            {t('vetPay') || 'Pay'} ${remaining.toFixed(2)}
          </button>
        )}
        {paying && (
          <div className="flex items-center gap-1 justify-end">
            <input type="number" min="0" max={remaining} step="any" placeholder={remaining.toFixed(2)}
              value={payAmt} onChange={e => setPayAmt(e.target.value)} autoFocus
              className="w-16 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-[11px] bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            <button onClick={handlePay} disabled={busy}
              className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 disabled:opacity-50">
              {busy ? '…' : '✓'}
            </button>
            <button onClick={() => { setPaying(false); setPayAmt('') }} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
          </div>
        )}
        {!paying && !isRefunded && (
          <>
            <button onClick={onEdit} title={t('vetEditSale') || 'Edit sale'}
              className="p-1 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={onRefund} title={t('vetRefund') || 'Refund'}
              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <RotateCcw className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SaleGroupRow({ group, onPaid, onEdit, onRefundItem, onRefundGroup }: {
  group: SaleGroup; onPaid: () => void
  onEdit: (s: Sale) => void; onRefundItem: (s: Sale) => void; onRefundGroup: (g: SaleGroup) => void
}) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const date = group.saleDate ? new Date(group.saleDate) : null
  const payColor = PAY_COLOR[group.paymentMethod ?? 'other'] ?? PAY_COLOR.other
  const isRefunded = group.txStatus === 'refunded'
  const isPartRefund = group.txStatus === 'partially_refunded'
  const netTotal = Math.max(0, group.total - (group.refunded ?? 0))

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      open ? 'border-violet-300 dark:border-violet-700 shadow-sm' : 'border-slate-200 dark:border-slate-700'
    } ${isRefunded ? 'bg-red-50/40 dark:bg-red-900/5' : 'bg-white dark:bg-slate-800/60'}`}>
      {/* Summary header */}
      <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-3 text-left flex-1 min-w-0">
        <div className="shrink-0 text-slate-400">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isRefunded ? 'bg-red-100 dark:bg-red-900/40' : 'bg-violet-100 dark:bg-violet-900/40'}`}>
          <Receipt className={`h-4 w-4 ${isRefunded ? 'text-red-600 dark:text-red-400' : 'text-violet-600 dark:text-violet-400'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{group.ownerName ?? (t('vetWalkIn') || 'Walk-in')}</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
              <Package className="h-2.5 w-2.5" /> {group.itemCount} {group.itemCount === 1 ? (t('vetItemLabel') || 'item') : (t('vetItemsLabel') || 'items')}
            </span>
            {group.paymentMethod && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${payColor}`}>{group.paymentMethod}</span>
            )}
            {isRefunded && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">{t('vetRefundedBadge') || 'Refunded'}</span>}
            {isPartRefund && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">{t('vetPartRefund') || 'part. refund'}</span>}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}
            {group.saleGroupId && <span className="inline-flex items-center gap-0.5 text-slate-300 dark:text-slate-600"><Hash className="h-2.5 w-2.5" />{group.groupKey.slice(0, 6)}</span>}
          </p>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <p className={`text-xs font-semibold ${group.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {group.grossProfit >= 0 ? '+' : ''}${group.grossProfit.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400">{t('vetProfit') || 'profit'}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-base font-black ${isRefunded ? 'text-slate-400 line-through' : 'text-violet-700 dark:text-violet-300'}`}>${group.total.toFixed(2)}</p>
          {(group.refunded ?? 0) > 0.005 && <p className="text-[10px] text-red-500">−${(group.refunded ?? 0).toFixed(2)} {t('vetRefundedLabel') || 'refunded'}{isPartRefund ? ` · $${netTotal.toFixed(2)} net` : ''}</p>}
          <div className="flex items-center gap-1 justify-end mt-0.5">
            {!isRefunded && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${GROUP_STATUS[group.paymentStatus] ?? GROUP_STATUS.paid}`}>{group.paymentStatus}</span>}
          </div>
          {!isRefunded && group.remaining > 0.005 && <p className="text-[10px] text-red-500 mt-0.5">−${group.remaining.toFixed(2)} {t('vetDue') || 'due'}</p>}
        </div>
        </button>
        {group.ownerId && (
          <button onClick={() => navigate(`/vet/owners/${group.ownerId}`)} title={t('vetViewCustomerProfile') || 'View customer profile'}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
        {!isRefunded && (
          <button onClick={() => onRefundGroup(group)} title={t('vetRefundTransaction') || 'Refund transaction'}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expanded line items */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
          {group.items.map(it => (
            <GroupLineItem key={it.id} item={it} onPaid={onPaid}
              onEdit={() => onEdit(it)} onRefund={() => onRefundItem(it)} />
          ))}
          {group.notes && (
            <div className="px-4 py-2 text-[11px] text-slate-400 italic">{t('vetNotesPrefix') || 'Notes:'} {group.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}
