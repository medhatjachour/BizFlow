import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, Plus, Pencil, Trash2, Layers, X, PackageX, AlertTriangle, Boxes, History
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, inputCls, expiryTone } from './_shared'
import { Toolbar, SearchBox, Segmented, FilterSelect, Button, IconButton, Pagination } from './ui'
import ProductDetailModal from './ProductDetailModal'

// Default selling units (user can still type a custom one)
const DEFAULT_UNITS = ['box', 'bottle', 'strip', 'pack', 'tablet', 'capsule', 'vial', 'ampoule', 'sachet', 'tube', 'piece', 'unit', 'ml', 'g', 'mg', 'kg', 'L']
const DEFAULT_SUBUNITS = ['tablet', 'capsule', 'piece', 'strip', 'ml', 'g', 'mg', 'drop', 'dose']

export default function PharmacyProducts() {
  const toast = useToast()
  const { t } = useLanguage()
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [categories, setCategories] = useState<string[]>([])
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [batchTarget, setBatchTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [detailTarget, setDetailTarget] = useState<any | null>(null)
  const [page, setPage] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const PAGE_SIZE = 24

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await pharma()?.products.getAll({ search, category, stockFilter, status: 'all', skip: page * PAGE_SIZE, take: PAGE_SIZE, sortBy: 'name' })
      setRows(r?.data ?? []); setTotal(r?.total ?? 0)
    } catch (e: any) { toast.error(e?.message ?? 'Failed to load products') }
    finally { setLoading(false) }
  }, [search, category, stockFilter, page])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(load, 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [load])
  useEffect(() => { setPage(0) }, [search, category, stockFilter])

  useEffect(() => { pharma()?.products.getCategories().then(setCategories).catch(() => {}) }, [])

  async function doDelete() {
    if (!deleteTarget) return
    try {
      const r = await pharma()?.products.delete(deleteTarget.id)
      toast.success(r?.softDeleted ? (t('phProductDisabled') || 'Product disabled (has sales history)') : (t('phProductDeleted') || 'Product deleted'))
      setDeleteTarget(null); load()
    } catch (e: any) { toast.error(e?.message ?? 'Delete failed') }
  }

  return (
    <div className="p-6 space-y-4">
      <Toolbar right={
        <Button icon={Plus} onClick={() => { setEditTarget(null); setShowForm(true) }}>
          {t('phAddProduct') || 'Add Product'}
        </Button>
      }>
        <SearchBox value={search} onChange={setSearch} placeholder={t('phSearchProduct') || 'Search products…'} />
        <FilterSelect value={category} onChange={setCategory}>
          <option value="all">{t('phAllCategories') || 'All categories'}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <Segmented value={stockFilter} onChange={setStockFilter} options={[
          { value: 'all', label: t('phAll') || 'All' },
          { value: 'low', label: t('phLow') || 'Low' },
          { value: 'out', label: t('phOut') || 'Out' },
          { value: 'expiring', label: t('phExpiring') || 'Expiring' },
          { value: 'expired', label: t('phExpired') || 'Expired' },
        ]} />
      </Toolbar>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">{t('phNoProducts') || 'No products yet — add one to get started.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-2.5 font-medium">{t('phProduct') || 'Product'}</th>
                  <th className="px-4 py-2.5 font-medium">{t('phCategory') || 'Category'}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t('phStock') || 'Stock'}</th>
                  <th className="px-4 py-2.5 font-medium">{t('phNearestExpiry') || 'Nearest Expiry'}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t('phPrice') || 'Price'}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t('phValue') || 'Value'}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t('phActions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {rows.map(p => {
                  const days = p.nearestExpiry ? Math.floor((new Date(p.nearestExpiry).getTime() - Date.now()) / 86_400_000) : null
                  return (
                    <tr key={p.id} className={`text-slate-700 dark:text-slate-300 ${!p.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          {p.hasExpired && <span title="Has expired stock"><AlertTriangle size={12} className="text-red-500" /></span>}
                        </div>
                        {p.genericName && <div className="text-[11px] text-slate-400">{p.genericName}</div>}
                      </td>
                      <td className="px-4 py-2.5 capitalize text-slate-500">{p.category}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-semibold ${p.isOutOfStock ? 'text-red-500' : p.isLowStock ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>
                          {p.isOutOfStock ? (t('phOut') || 'OUT') : `${p.totalStock} ${p.unit}`}
                        </span>
                        {p.isLowStock && !p.isOutOfStock && <span className="block text-[10px] text-amber-500">{t('phLow') || 'low'} (min {p.minimumStock})</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {days == null ? <span className="text-slate-300">—</span> : (
                          <span className={`text-xs font-medium ${expiryTone(days)}`}>
                            {new Date(p.nearestExpiry).toLocaleDateString()} {days < 0 ? `(${t('phExpired') || 'expired'})` : `(${days}d)`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">${money(p.sellingPrice)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">${money(p.stockValue)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <IconButton icon={History} tone="violet" onClick={() => setDetailTarget(p)} title={t('phHistory') || 'History & details'} />
                        <IconButton icon={Layers} tone="emerald" onClick={() => setBatchTarget(p)} title={t('phBatches') || 'Batches'} />
                        <IconButton icon={Pencil} tone="slate" onClick={() => { setEditTarget(p); setShowForm(true) }} title={t('phEdit') || 'Edit'} />
                        <IconButton icon={Trash2} tone="red" onClick={() => setDeleteTarget(p)} title={t('phDelete') || 'Delete'} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && rows.length > 0 && <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} onPage={setPage} label={t('phProductsLc') || 'products'} />}

      {detailTarget && <ProductDetailModal product={detailTarget} onClose={() => setDetailTarget(null)} />}
      {showForm && <ProductModal initial={editTarget} categories={categories} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {batchTarget && <BatchModal product={batchTarget} onClose={() => { setBatchTarget(null); load() }} />}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-slate-900 dark:text-white mb-1">{t('phDeleteProduct') || 'Delete product'}?</p>
            <p className="text-sm text-slate-500 mb-5">{deleteTarget.name}. {deleteTarget.salesCount > 0 ? (t('phWillDisable') || 'It has sales history and will be disabled instead of deleted.') : (t('phCannotUndo') || 'This cannot be undone.')}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>{t('phCancel') || 'Cancel'}</Button>
              <Button variant="danger" className="flex-1" onClick={doDelete}>{t('phDelete') || 'Delete'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Product create/edit modal ─────────────────────────────────────────────────
function ProductModal({ initial, categories, onClose, onSaved }: { initial: any | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: initial?.name ?? '', genericName: initial?.genericName ?? '',
    category: initial?.category ?? 'general', unit: initial?.unit ?? 'unit',
    subUnit: initial?.subUnit ?? '', subUnitsPerContainer: initial?.subUnitsPerContainer ? String(initial.subUnitsPerContainer) : '',
    subUnitPrice: initial?.subUnitPrice != null ? String(initial.subUnitPrice) : '',
    barcode: initial?.barcode ?? '', sellingPrice: String(initial?.sellingPrice ?? ''),
    minimumStock: String(initial?.minimumStock ?? ''), description: initial?.description ?? '',
    isActive: initial?.isActive ?? true,
  })
  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const data = {
        ...form,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        minimumStock: parseFloat(form.minimumStock) || 0,
        subUnit: form.subUnit.trim() || null,
        subUnitsPerContainer: form.subUnit.trim() && parseFloat(form.subUnitsPerContainer) > 0 ? parseFloat(form.subUnitsPerContainer) : null,
        subUnitPrice: form.subUnit.trim() && form.subUnitPrice !== '' ? parseFloat(form.subUnitPrice) : null,
      }
      if (initial) await pharma()?.products.update(initial.id, data)
      else await pharma()?.products.create(data)
      toast.success(initial ? (t('phProductUpdated') || 'Product updated') : (t('phProductAdded') || 'Product added'))
      onSaved()
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="font-bold text-slate-900 dark:text-white">{initial ? (t('phEditProduct') || 'Edit Product') : (t('phAddProduct') || 'Add Product')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phName') || 'Name'} *</label>
            <input value={form.name} onChange={set('name')} required className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phGenericName') || 'Generic name'}</label>
              <input value={form.genericName} onChange={set('genericName')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phBarcode') || 'Barcode'}</label>
              <input value={form.barcode} onChange={set('barcode')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phCategory') || 'Category'}</label>
              <input value={form.category} onChange={set('category')} list="ph-cats" className={inputCls} />
              <datalist id="ph-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phUnit') || 'Unit'}</label>
              <input value={form.unit} onChange={set('unit')} list="ph-units" placeholder={t('phUnitPlaceholder') || 'Pick or type a unit…'} className={inputCls} />
              <datalist id="ph-units">{DEFAULT_UNITS.map(u => <option key={u} value={u} />)}</datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phSellPrice') || 'Selling price'}</label>
              <input value={form.sellingPrice} onChange={set('sellingPrice')} type="number" min="0" step="0.01" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phMinStock') || 'Min stock (reorder level)'}</label>
              <input value={form.minimumStock} onChange={set('minimumStock')} type="number" min="0" className={inputCls} />
            </div>
          </div>

          {/* Sub-unit conversion (e.g. sell grams out of a kg) */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10 p-3 space-y-2.5">
            <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">{t('phSubUnitTitle') || 'Sub-unit selling (optional)'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('phSubUnitHint') || 'Enable to sell fractions of a unit — e.g. grams from a kg, or tablets from a box.'}</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phSubUnitName') || 'Sub-unit'}</label>
                <input value={form.subUnit} onChange={set('subUnit')} list="ph-subunits" placeholder={form.unit ? `g, ${form.unit}…` : 'g, tablet…'} className={inputCls + ' py-1.5 text-xs'} />
                <datalist id="ph-subunits">{DEFAULT_SUBUNITS.map(u => <option key={u} value={u} />)}</datalist>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phSubUnitsPer') || 'Per'} 1 {form.unit || 'unit'}</label>
                <input value={form.subUnitsPerContainer} onChange={set('subUnitsPerContainer')} type="number" min="0" placeholder="1000" className={inputCls + ' py-1.5 text-xs'} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phSubUnitPrice') || 'Sub price'}</label>
                <input value={form.subUnitPrice} onChange={set('subUnitPrice')} type="number" min="0" step="0.001" placeholder={form.subUnitsPerContainer && form.sellingPrice ? (parseFloat(form.sellingPrice) / parseFloat(form.subUnitsPerContainer || '1')).toFixed(3) : 'auto'} className={inputCls + ' py-1.5 text-xs'} />
              </div>
            </div>
            {form.subUnit && form.subUnitsPerContainer && (
              <p className="text-[10px] text-violet-600 dark:text-violet-400">1 {form.unit || 'unit'} = {form.subUnitsPerContainer} {form.subUnit}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phDescription') || 'Description'}</label>
            <textarea value={form.description} onChange={set('description')} rows={2} className={inputCls} />
          </div>
          {initial && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              {t('phActive') || 'Active (available for sale)'}
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t('phCancel') || 'Cancel'}</Button>
            <Button type="submit" className="flex-1" loading={busy}>{t('phSave') || 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Batch manager modal ───────────────────────────────────────────────────────
function BatchModal({ product, onClose }: { product: any; onClose: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [batches, setBatches] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const blank = { batchNumber: '', quantity: '', costPerUnit: '', sellingPrice: '', expiryDate: '', supplierId: '' }
  const [form, setForm] = useState(blank)
  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const load = useCallback(async () => {
    setLoading(true)
    try { setBatches(await pharma()?.batches.getByProduct(product.id) ?? []) }
    finally { setLoading(false) }
  }, [product.id])
  useEffect(() => { load(); pharma()?.suppliers.getAll().then(setSuppliers).catch(() => {}) }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.quantity || !form.expiryDate) { toast.error(t('phQtyExpiryRequired') || 'Quantity and expiry are required'); return }
    setAdding(true)
    try {
      await pharma()?.batches.add({
        productId: product.id, batchNumber: form.batchNumber || undefined,
        quantity: parseFloat(form.quantity), costPerUnit: parseFloat(form.costPerUnit) || 0,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : undefined,
        expiryDate: form.expiryDate, supplierId: form.supplierId || undefined,
      })
      toast.success(t('phBatchAdded') || 'Batch added'); setForm(blank); load()
    } catch (err: any) { toast.error(err?.message ?? 'Failed to add batch') }
    finally { setAdding(false) }
  }

  async function dispose(b: any) {
    try { await pharma()?.batches.dispose(b.id, { reason: 'Disposed' }); toast.success(t('phBatchDisposed') || 'Batch disposed'); load() }
    catch (err: any) { toast.error(err?.message ?? 'Failed') }
  }
  async function del(b: any) {
    try { await pharma()?.batches.delete(b.id); toast.success(t('phBatchDeleted') || 'Batch deleted'); load() }
    catch (err: any) { toast.error(err?.message ?? 'Failed') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Boxes size={18} className="text-emerald-500" /> {product.name}</h2>
            <p className="text-xs text-slate-400">{t('phManageBatches') || 'Manage stock batches & expiry'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Add batch */}
        <form onSubmit={add} className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
            <div className="col-span-2 sm:col-span-1"><label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phBatchNo') || 'Batch #'}</label><input value={form.batchNumber} onChange={set('batchNumber')} className={inputCls + ' py-1.5 text-xs'} /></div>
            <div><label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phQty') || 'Qty'} *</label><input value={form.quantity} onChange={set('quantity')} type="number" min="0" className={inputCls + ' py-1.5 text-xs'} /></div>
            <div><label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phCost') || 'Cost'}</label><input value={form.costPerUnit} onChange={set('costPerUnit')} type="number" min="0" step="0.01" className={inputCls + ' py-1.5 text-xs'} /></div>
            <div><label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phSell') || 'Sell'}</label><input value={form.sellingPrice} onChange={set('sellingPrice')} type="number" min="0" step="0.01" placeholder={String(product.sellingPrice ?? '')} className={inputCls + ' py-1.5 text-xs'} /></div>
            <div><label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('phExpiry') || 'Expiry'} *</label><input value={form.expiryDate} onChange={set('expiryDate')} type="date" className={inputCls + ' py-1.5 text-xs'} /></div>
            <button type="submit" disabled={adding} className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1">
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} {t('phAdd') || 'Add'}
            </button>
          </div>
          {suppliers.length > 0 && (
            <div className="mt-2">
              <select value={form.supplierId} onChange={set('supplierId')} className={inputCls + ' py-1.5 text-xs w-auto'}>
                <option value="">{t('phNoSupplier') || 'No supplier'}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </form>

        {/* Batches */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
          : batches.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">{t('phNoBatches') || 'No batches yet — add stock above.'}</p>
          : (
            <div className="space-y-2">
              {batches.map(b => {
                const days = Math.floor((new Date(b.expiryDate).getTime() - Date.now()) / 86_400_000)
                const depleted = b.quantity <= 0
                return (
                  <div key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${depleted ? 'border-slate-200 dark:border-slate-700 opacity-60' : days < 0 ? 'border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{b.quantity} {product.unit}</span>
                        {b.batchNumber && <span className="text-[11px] text-slate-400">#{b.batchNumber}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${b.status === 'active' && !depleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>{depleted ? (t('phDepleted') || 'depleted') : b.status}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t('phCost') || 'Cost'} ${money(b.costPerUnit)} · {t('phSell') || 'Sell'} ${money(b.sellingPrice ?? product.sellingPrice)} · <span className={expiryTone(days)}>{t('phExp') || 'Exp'} {new Date(b.expiryDate).toLocaleDateString()} {days < 0 ? `(${t('phExpired') || 'expired'})` : `(${days}d)`}</span>
                        {b.supplier && ` · ${b.supplier.name}`}
                      </div>
                    </div>
                    {!depleted && (
                      <button onClick={() => dispose(b)} title={t('phDispose') || 'Dispose / write-off'} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"><PackageX size={15} /></button>
                    )}
                    <button onClick={() => del(b)} title={t('phDelete') || 'Delete'} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={15} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Product history & details moved to ./ProductDetailModal ──────────────────
