import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Plus, Trash2, X, ClipboardList, PackageCheck, Pencil, ScanLine, Check, Minus, AlertTriangle } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, PO_STATUS_BADGE, inputCls } from './_shared'
import { Button } from './ui'

export default function PharmacyPurchaseOrders() {
  const toast = useToast()
  const { t } = useLanguage()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<any | null | 'new'>(null)
  const [receiving, setReceiving] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await pharma()?.purchaseOrders.getAll({ status, take: 100 }); setRows(r?.data ?? []) }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [status])
  useEffect(() => { load() }, [load])

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
        <Button icon={Plus} onClick={() => setEditing('new')}>{t('phNewOrder') || 'New Order'}</Button>
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
                        <button onClick={() => setReceiving(o)} title={t('phReceive') || 'Receive into stock'} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><PackageCheck size={15} /></button>
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
      {receiving && <ReceiveScanModal order={receiving} onClose={() => setReceiving(null)} onReceived={() => { setReceiving(null); load() }} />}
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
            <Button variant="secondary" onClick={onClose}>{t('phCancel') || 'Cancel'}</Button>
            <Button onClick={submit} loading={busy}>{t('phSave') || 'Save'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Barcode-first receiving — scan each delivered item to verify against the PO ──
function ReceiveScanModal({ order, onClose, onReceived }: { order: any; onClose: () => void; onReceived: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [items, setItems] = useState<any[]>([])
  const [scanned, setScanned] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const scanRef = useRef<HTMLInputElement>(null)
  const focusScan = () => requestAnimationFrame(() => scanRef.current?.focus())

  useEffect(() => {
    (async () => {
      try {
        const full = await pharma()?.purchaseOrders.getById(order.id)
        setItems(full?.items ?? [])
      } catch { toast.error(t('phFailedLoad') || 'Failed to load order') }
      finally { setLoading(false); focusScan() }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  const orderedFor = (it: any) => Number(it.quantity) || 0
  const scannedFor = (it: any) => scanned[it.id] ?? 0
  const linesComplete = items.filter(it => scannedFor(it) >= orderedFor(it)).length
  const allScanned = items.length > 0 && linesComplete === items.length

  function bump(it: any, delta: number) {
    setScanned(prev => {
      const cur = prev[it.id] ?? 0
      const next = Math.max(0, Math.min(orderedFor(it), cur + delta))
      return { ...prev, [it.id]: next }
    })
  }

  async function onScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const c = code.trim()
    if (!c) return
    setCode('')
    // Resolve the scanned barcode to a product, then match it to a PO line.
    let product: any = null
    try {
      const r = await pharma()?.products.getAll({ search: c, take: 5 })
      const list: any[] = r?.data ?? []
      product = list.find(p => p.barcode === c) ?? null
    } catch { /* ignore */ }
    if (!product) { toast.error(`${t('phUnknownBarcode') || 'Unknown barcode'}: ${c}`); focusScan(); return }
    const line = items.find(it => it.productId && it.productId === product.id)
    if (!line) { toast.error(`${product.name} — ${t('phNotInOrder') || 'not in this order'}`); focusScan(); return }
    if (scannedFor(line) >= orderedFor(line)) { toast.info?.(`${product.name} — ${t('phAlreadyComplete') || 'already fully scanned'}`); focusScan(); return }
    bump(line, 1)
    focusScan()
  }

  async function commit() {
    setBusy(true)
    try {
      const r = await pharma()?.purchaseOrders.receive(order.id)
      toast.success(`${t('phReceived') || 'Received'} · ${r?.createdBatches ?? 0} ${t('phBatchesLc') || 'batches'}`)
      onReceived()
    } catch (e: any) { toast.error(e?.message ?? 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-emerald-500" />
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{t('phReceiveScan') || 'Receive — scan to verify'}</h2>
              <p className="text-xs text-slate-400">#{order.orderNumber ?? '—'} · {linesComplete}/{items.length} {t('phLinesVerified') || 'lines verified'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>

        <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input ref={scanRef} value={code} onChange={e => setCode(e.target.value)} onKeyDown={onScan} autoFocus
              placeholder={t('phScanPlaceholder') || 'Scan a barcode…'} className={inputCls + ' pl-9'} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">{t('phScanHint') || 'Scan each delivered item. Unknown barcodes are ignored — nothing is created.'}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
          : items.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">{t('phNoItems') || 'This order has no line items.'}</p>
          : items.map(it => {
            const ord = orderedFor(it), got = scannedFor(it)
            const done = got >= ord
            const over = got > ord
            return (
              <div key={it.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${done ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/15' : 'border-slate-200 dark:border-slate-700'}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {done ? <Check size={12} className="text-white" strokeWidth={3} /> : <span className="text-[10px] font-bold text-slate-500">{got}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{it.productName}</p>
                  <p className="text-[11px] text-slate-400">{got} / {ord} {it.productId ? '' : `· ${t('phUnlinked') || 'unlinked'}`}{over ? ` · ${t('phOverReceived') || 'over'}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => bump(it, -1)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><Minus size={14} /></button>
                  <button onClick={() => bump(it, 1)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><Plus size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
          {!allScanned && items.length > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={12} /> {t('phReceivePartialNote') || 'Not all items verified — you can still receive the full order into stock.'}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>{t('phCancel') || 'Cancel'}</Button>
            <Button className="flex-1" icon={PackageCheck} loading={busy} disabled={loading} onClick={commit}>{t('phReceiveIntoStock') || 'Receive into stock'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
