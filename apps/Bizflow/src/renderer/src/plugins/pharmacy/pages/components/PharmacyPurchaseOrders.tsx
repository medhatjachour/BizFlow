import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, Trash2, X, ClipboardList, PackageCheck, Pencil } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, PO_STATUS_BADGE, inputCls } from './_shared'

export default function PharmacyPurchaseOrders() {
  const toast = useToast()
  const { t } = useLanguage()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<any | null | 'new'>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await pharma()?.purchaseOrders.getAll({ status, take: 100 }); setRows(r?.data ?? []) }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [status])
  useEffect(() => { load() }, [load])

  async function receive(o: any) {
    if (!confirm(t('phConfirmReceive') || 'Receive this order into stock? A batch is created for each linked product.')) return
    try { const r = await pharma()?.purchaseOrders.receive(o.id); toast.success(`${t('phReceived') || 'Received'} · ${r?.createdBatches ?? 0} ${t('phBatchesLc') || 'batches'}`); load() }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
  }
  async function del(o: any) {
    if (!confirm(t('phConfirmDeleteOrder') || 'Delete this purchase order?')) return
    try { await pharma()?.purchaseOrders.delete(o.id); toast.success(t('phOrderDeleted') || 'Order deleted'); load() }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls + ' w-auto'}>
          <option value="all">{t('phAllStatuses') || 'All statuses'}</option>
          <option value="draft">{t('phDraft') || 'Draft'}</option>
          <option value="ordered">{t('phOrdered') || 'Ordered'}</option>
          <option value="received">{t('phReceived') || 'Received'}</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => setEditing('new')} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"><Plus size={15} /> {t('phNewOrder') || 'New Order'}</button>
      </div>

      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
        : rows.length === 0 ? <p className="text-sm text-slate-400 text-center py-16">{t('phNoOrders') || 'No purchase orders yet.'}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">{t('phSupplier') || 'Supplier'}</th>
                <th className="px-4 py-2.5 font-medium">{t('phDate') || 'Date'}</th>
                <th className="px-4 py-2.5 font-medium text-center">{t('phItems') || 'Items'}</th>
                <th className="px-4 py-2.5 font-medium text-right">{t('phTotal') || 'Total'}</th>
                <th className="px-4 py-2.5 font-medium text-center">{t('phStatus') || 'Status'}</th>
                <th className="px-4 py-2.5"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {rows.map(o => (
                  <tr key={o.id} className="text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-2.5 font-semibold text-slate-500">#{o.orderNumber ?? '—'}</td>
                    <td className="px-4 py-2.5">{o.supplier?.name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{o.itemCount}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">${money(o.total)}</td>
                    <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PO_STATUS_BADGE[o.status] ?? ''}`}>{o.status}</span></td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {o.status !== 'received' && (
                        <button onClick={() => receive(o)} title={t('phReceive') || 'Receive into stock'} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><PackageCheck size={15} /></button>
                      )}
                      {o.status !== 'received' && (
                        <button onClick={() => setEditing(o)} title={t('phEdit') || 'Edit'} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={15} /></button>
                      )}
                      <button onClick={() => del(o)} title={t('phDelete') || 'Delete'} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <POModal order={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

interface POLine { productId: string; productName: string; quantity: string; costPerUnit: string; sellingPrice: string; expiryDate: string }

function POModal({ order, onClose, onSaved }: { order: any | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? '')
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [status, setStatus] = useState(order?.status ?? 'draft')
  const [full, setFull] = useState<any | null>(order)
  const emptyLine: POLine = { productId: '', productName: '', quantity: '', costPerUnit: '', sellingPrice: '', expiryDate: '' }
  const [lines, setLines] = useState<POLine[]>([{ ...emptyLine }])

  useEffect(() => {
    pharma()?.suppliers.getAll().then(setSuppliers).catch(() => {})
    pharma()?.products.getAll({ status: 'active', take: 1000 }).then((r: any) => setProducts(r?.data ?? [])).catch(() => {})
    if (order?.id) pharma()?.purchaseOrders.getById(order.id).then((o: any) => {
      if (!o) return
      setFull(o)
      setLines((o.items ?? []).map((it: any) => ({
        productId: it.productId ?? '', productName: it.productName, quantity: String(it.quantity),
        costPerUnit: String(it.costPerUnit), sellingPrice: it.sellingPrice != null ? String(it.sellingPrice) : '',
        expiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString().slice(0, 10) : '',
      })))
    }).catch(() => {})
  }, [order?.id])
  void full

  function setLine(i: number, patch: Partial<POLine>) { setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l)) }
  function pickProduct(i: number, productId: string) {
    const p = products.find(x => x.id === productId)
    setLine(i, { productId, productName: p?.name ?? '', sellingPrice: p?.sellingPrice != null ? String(p.sellingPrice) : '' })
  }
  const total = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.costPerUnit) || 0), 0)

  async function submit() {
    const items = lines.filter(l => l.productName.trim() && parseFloat(l.quantity) > 0).map(l => ({
      productId: l.productId || undefined, productName: l.productName,
      quantity: parseFloat(l.quantity), costPerUnit: parseFloat(l.costPerUnit) || 0,
      sellingPrice: l.sellingPrice ? parseFloat(l.sellingPrice) : undefined,
      expiryDate: l.expiryDate || undefined,
    }))
    if (items.length === 0) { toast.error(t('phAddOneItem') || 'Add at least one item'); return }
    setBusy(true)
    try {
      const payload = { supplierId: supplierId || undefined, notes, status, items }
      if (order?.id) await pharma()?.purchaseOrders.update(order.id, payload)
      else await pharma()?.purchaseOrders.create(payload)
      toast.success(order?.id ? (t('phOrderUpdated') || 'Order updated') : (t('phOrderCreated') || 'Order created')); onSaved()
    } catch (e: any) { toast.error(e?.message ?? 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardList size={18} className="text-emerald-500" /> {order?.id ? (t('phEditOrder') || 'Edit Order') + ` #${order.orderNumber ?? ''}` : (t('phNewOrder') || 'New Purchase Order')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phSupplier') || 'Supplier'}</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputCls}>
                <option value="">{t('phNoSupplier') || 'No supplier'}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phStatus') || 'Status'}</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                <option value="draft">{t('phDraft') || 'Draft'}</option>
                <option value="ordered">{t('phOrdered') || 'Ordered'}</option>
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('phItems') || 'Items'}</label>
              <button onClick={() => setLines(ls => [...ls, { ...emptyLine }])} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Plus size={13} /> {t('phAddLine') || 'Add line'}</button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                  <select value={l.productId} onChange={e => pickProduct(i, e.target.value)} className={inputCls + ' col-span-4 py-1.5 text-xs'}>
                    <option value="">{t('phPickProduct') || 'Pick product…'}</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} type="number" min="0" placeholder={t('phQty') || 'Qty'} className={inputCls + ' col-span-2 py-1.5 text-xs'} />
                  <input value={l.costPerUnit} onChange={e => setLine(i, { costPerUnit: e.target.value })} type="number" min="0" step="0.01" placeholder={t('phCost') || 'Cost'} className={inputCls + ' col-span-2 py-1.5 text-xs'} />
                  <input value={l.expiryDate} onChange={e => setLine(i, { expiryDate: e.target.value })} type="date" title={t('phExpiry') || 'Expiry'} className={inputCls + ' col-span-3 py-1.5 text-xs'} />
                  <button onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="col-span-1 text-slate-300 hover:text-red-500 flex justify-center"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('phNotes') || 'Notes'} className={inputCls} />
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('phTotal') || 'Total'}: <span className="text-emerald-600 dark:text-emerald-400">${money(total)}</span></span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 rounded-lg">{t('phCancel') || 'Cancel'}</button>
            <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">{busy && <Loader2 size={14} className="animate-spin" />}{t('phSave') || 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
