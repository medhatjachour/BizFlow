import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, RotateCcw, Wallet, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, PAY_BADGE, SALE_STATUS_BADGE, inputCls } from './_shared'
import { Toolbar, SearchBox, Segmented } from './ui'

const PAGE = 20

export default function PharmacySales() {
  const toast = useToast()
  const { t } = useLanguage()
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [status, setStatus] = useState('all')
  const [detail, setDetail] = useState<any | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await pharma()?.sales.getAll({ search, paymentStatus, status, skip: page * PAGE, take: PAGE })
      setRows(r?.data ?? []); setTotal(r?.total ?? 0)
    } catch (e: any) { toast.error(e?.message ?? 'Failed to load sales') }
    finally { setLoading(false) }
  }, [search, paymentStatus, status, page])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(load, 200)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [load])
  useEffect(() => { setPage(0) }, [search, paymentStatus, status])

  const pageCount = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="p-6 space-y-4">
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder={t('phSearchSales') || 'Search sale #, customer, product…'} />
        <Segmented value={paymentStatus} onChange={setPaymentStatus} options={[
          { value: 'all', label: t('phAll') || 'All' },
          { value: 'paid', label: t('phPaid') || 'Paid' },
          { value: 'partial', label: t('phPartial') || 'Partial' },
          { value: 'unpaid', label: t('phUnpaid') || 'Unpaid' },
        ]} />
        <Segmented value={status} onChange={setStatus} options={[
          { value: 'all', label: t('phAll') || 'All' },
          { value: 'completed', label: t('phCompleted') || 'Completed' },
          { value: 'refunded', label: t('phRefunded') || 'Refunded' },
        ]} />
      </Toolbar>

      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
        : rows.length === 0 ? <p className="text-sm text-slate-400 text-center py-16">{t('phNoSales') || 'No sales found'}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">{t('phDate') || 'Date'}</th>
                <th className="px-4 py-2.5 font-medium">{t('phCustomer') || 'Customer'}</th>
                <th className="px-4 py-2.5 font-medium text-center">{t('phItems') || 'Items'}</th>
                <th className="px-4 py-2.5 font-medium text-right">{t('phTotal') || 'Total'}</th>
                <th className="px-4 py-2.5 font-medium text-center">{t('phPayment') || 'Payment'}</th>
                <th className="px-4 py-2.5 font-medium text-center">{t('phStatus') || 'Status'}</th>
                <th className="px-4 py-2.5"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {rows.map(s => {
                  const net = s.total - (s.refundedAmount ?? 0)
                  const outstanding = Math.max(0, net - s.amountPaid)
                  return (
                    <tr key={s.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onClick={() => setDetail(s)}>
                      <td className="px-4 py-2.5 font-semibold text-slate-500">#{s.saleNumber ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{new Date(s.saleDate).toLocaleString()}</td>
                      <td className="px-4 py-2.5">{s.customerName || <span className="text-slate-300">{t('phWalkIn') || 'Walk-in'}</span>}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500">{s.items?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">${money(s.total)}{outstanding > 0.005 && <span className="block text-[10px] text-red-500">−${money(outstanding)} {t('phDue') || 'due'}</span>}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PAY_BADGE[s.paymentStatus] ?? PAY_BADGE.unpaid}`}>{s.paymentStatus}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SALE_STATUS_BADGE[s.status] ?? ''}`}>{(s.status || '').replace('_', ' ')}</span></td>
                      <td className="px-4 py-2.5 text-right"><Eye size={15} className="text-slate-300 inline" /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-400">{total} {t('phSalesLc') || 'sales'}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page <= 0} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="text-xs px-2">{page + 1} / {pageCount}</span>
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {detail && <SaleDetailModal sale={detail} onClose={() => setDetail(null)} onChanged={() => { setDetail(null); load() }} />}
    </div>
  )
}

function SaleDetailModal({ sale: initial, onClose, onChanged }: { sale: any; onClose: () => void; onChanged: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [sale, setSale] = useState<any>(initial)
  const [busy, setBusy] = useState(false)
  const [payAmt, setPayAmt] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => { pharma()?.sales.getById(initial.id).then((s: any) => s && setSale(s)).catch(() => {}) }, [initial.id])

  const net = sale.total - (sale.refundedAmount ?? 0)
  const outstanding = Math.max(0, net - sale.amountPaid)

  async function refundWhole() {
    if (!confirm(t('phConfirmRefund') || 'Refund this whole sale and restock all items?')) return
    setBusy(true)
    try { await pharma()?.sales.refund(sale.id); toast.success(t('phRefunded') || 'Sale refunded'); onChanged() }
    catch (e: any) { toast.error(e?.message ?? 'Refund failed') }
    finally { setBusy(false) }
  }
  async function refundItem(item: any) {
    setBusy(true)
    try { await pharma()?.sales.refundItem(item.id); toast.success(t('phItemRefunded') || 'Item refunded'); const s = await pharma()?.sales.getById(sale.id); if (s) setSale(s) }
    catch (e: any) { toast.error(e?.message ?? 'Refund failed') }
    finally { setBusy(false) }
  }
  async function settle(full: boolean) {
    setBusy(true)
    try {
      await pharma()?.sales.updatePayment(sale.id, full ? { payFull: true } : { amount: parseFloat(payAmt) })
      toast.success(t('phPaymentRecorded') || 'Payment recorded')
      const s = await pharma()?.sales.getById(sale.id); if (s) setSale(s); setPaying(false); setPayAmt('')
    } catch (e: any) { toast.error(e?.message ?? 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">{t('phSale') || 'Sale'} #{sale.saleNumber ?? ''}</h2>
            <p className="text-xs text-slate-400">{new Date(sale.saleDate).toLocaleString()} · {sale.customerName || (t('phWalkIn') || 'Walk-in')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Items */}
          <div className="space-y-1.5">
            {sale.items?.map((it: any) => {
              const refundable = it.quantity - (it.refundedQty ?? 0)
              return (
                <div key={it.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="flex-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{it.productName}</span>
                    <span className="text-slate-400 text-xs"> · {it.quantity} × ${money(it.unitPrice)}</span>
                    {(it.refundedQty ?? 0) > 0 && <span className="text-[10px] text-amber-500 ml-1">({it.refundedQty} {t('phRefundedLc') || 'refunded'})</span>}
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">${money(it.lineTotal)}</span>
                  {sale.status !== 'refunded' && refundable > 0.0001 && (
                    <button onClick={() => refundItem(it)} disabled={busy} title={t('phRefundItem') || 'Refund item'} className="p-1 rounded text-slate-300 hover:text-amber-600"><RotateCcw size={13} /></button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Totals */}
          <div className="text-sm space-y-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <div className="flex justify-between"><span className="text-slate-500">{t('phSubtotal') || 'Subtotal'}</span><span>${money(sale.subtotal)}</span></div>
            {sale.discount > 0 && <div className="flex justify-between"><span className="text-slate-500">{t('phDiscount') || 'Discount'}</span><span className="text-red-500">−${money(sale.discount)}</span></div>}
            <div className="flex justify-between font-bold text-base"><span>{t('phTotal') || 'Total'}</span><span className="text-emerald-600 dark:text-emerald-400">${money(sale.total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('phPaid') || 'Paid'}</span><span>${money(sale.amountPaid)}</span></div>
            {(sale.refundedAmount ?? 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">{t('phRefundedLc') || 'refunded'}</span><span className="text-amber-500">−${money(sale.refundedAmount)}</span></div>}
            {outstanding > 0.005 && <div className="flex justify-between font-semibold"><span className="text-amber-600">{t('phOutstanding') || 'Outstanding'}</span><span className="text-amber-600">${money(outstanding)}</span></div>}
          </div>

          {/* Settle payment */}
          {sale.status !== 'refunded' && outstanding > 0.005 && (
            paying ? (
              <div className="flex items-center gap-2">
                <span className="relative flex-1"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input value={payAmt} onChange={e => setPayAmt(e.target.value)} type="number" min="0" max={outstanding} placeholder={money(outstanding)} autoFocus className={inputCls + ' pl-5 py-1.5 text-sm'} /></span>
                <button onClick={() => settle(false)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200">{t('phPayAmount') || 'Pay'}</button>
                <button onClick={() => settle(true)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700">{t('phPayAll') || 'Pay all'}</button>
                <button onClick={() => setPaying(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
              </div>
            ) : (
              <button onClick={() => setPaying(true)} className="w-full py-2 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 flex items-center justify-center gap-1.5"><Wallet size={15} /> {t('phRecordPayment') || 'Record payment'}</button>
            )
          )}
        </div>

        {/* Footer actions */}
        {sale.status !== 'refunded' && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800">
            <button onClick={refundWhole} disabled={busy} className="w-full py-2 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 flex items-center justify-center gap-1.5">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={15} />} {t('phRefundWholeSale') || 'Refund whole sale & restock'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
