import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, ChevronDown, ChevronUp, PackageCheck, Truck } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Category { id: string; name: string }
interface Product { id: string; name: string; cost: number; categoryId?: string; category?: Category; stock: number }
interface ReceiptItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  lineTotal: number
  notes?: string | null
  product?: { id: string; categoryId?: string; category?: Category }
}
interface IncomingReceipt {
  id: string
  receiptNumber: string
  supplierName?: string | null
  invoiceNumber?: string | null
  receivedAt: string
  totalCost: number
  notes?: string | null
  items: ReceiptItem[]
}
interface Summary {
  totalReceipts: number
  totalCost: number
  totalUnits: number
  averageReceiptCost: number
  supplierCount: number
  topCategories: Array<{ categoryName: string; units: number; totalCost: number }>
}
interface DraftItem { productId: string; quantity: string; unitCost: string; notes: string }

export default function IncomingReceiptsTab() {
  const toast = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [receipts, setReceipts] = useState<IncomingReceipt[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ productId: '', quantity: '1', unitCost: '', notes: '' }])

  const filters = useMemo(() => ({
    page,
    pageSize: 15,
    search: search.trim() || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId
  }), [page, search, categoryId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum, prods, cats] = await Promise.all([
        window.api.coffee.incomingReceipts.getAll(filters),
        window.api.coffee.incomingReceipts.getSummary({ categoryId: filters.categoryId }),
        window.api.coffee.products.getAll(),
        window.api.coffee.categories.getAll()
      ])
      setReceipts(list?.items ?? [])
      setTotalPages(list?.totalPages ?? 1)
      setSummary(sum)
      setProducts(prods ?? [])
      setCategories(cats ?? [])
    } catch {
      toast.error('Failed to load incoming receipts')
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, categoryId])

  function addRow() {
    setDraftItems(prev => [...prev, { productId: '', quantity: '1', unitCost: '', notes: '' }])
  }

  function updateRow(index: number, patch: Partial<DraftItem>) {
    setDraftItems(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  function removeRow(index: number) {
    setDraftItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))
  }

  const draftTotal = draftItems.reduce((sum, row) => sum + (Number(row.quantity || 0) * Number(row.unitCost || 0)), 0)

  async function handleCreate() {
    const items = draftItems.map(row => ({
      productId: row.productId,
      quantity: Number(row.quantity),
      unitCost: Number(row.unitCost),
      notes: row.notes || undefined
    }))

    if (!items.length || items.some(item => !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitCost) || item.unitCost < 0)) {
      toast.error('Complete all receipt items with valid product, quantity, and cost')
      return
    }

    setSaving(true)
    try {
      await window.api.coffee.incomingReceipts.create({
        supplierName: supplierName || undefined,
        invoiceNumber: invoiceNumber || undefined,
        receivedAt,
        notes: notes || undefined,
        createdById: user?.id,
        items
      })
      setModalOpen(false)
      setSupplierName('')
      setInvoiceNumber('')
      setReceivedAt(new Date().toISOString().slice(0, 10))
      setNotes('')
      setDraftItems([{ productId: '', quantity: '1', unitCost: '', notes: '' }])
      load()
      toast.success('Incoming receipt saved and stock updated')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create incoming receipt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500">{t('cfReceipts')}</p><p className="text-lg font-bold text-amber-600">{summary.totalReceipts}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500">{t('cfTotalCost')}</p><p className="text-lg font-bold text-emerald-600">{summary.totalCost.toFixed(2)}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500">{t('cfUnitsReceivedLc')}</p><p className="text-lg font-bold text-sky-600">{summary.totalUnits}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500">{t('cfAvgReceipt')}</p><p className="text-lg font-bold text-violet-600">{summary.averageReceiptCost.toFixed(2)}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500">{t('cfSuppliers')}</p><p className="text-lg font-bold text-orange-600">{summary.supplierCount}</p></div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipt, supplier, invoice, product..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
        </div>
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
          <option value="all">All Categories</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add Incoming Receipt</button>
      </div>

      {summary && summary.topCategories.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Top Restocked Categories</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.topCategories.map(row => (
              <div key={row.categoryName} className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{row.categoryName}</p>
                <p className="text-xs text-slate-500">{row.units} units</p>
                <p className="text-sm font-semibold text-emerald-600 mt-1">{row.totalCost.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <PackageCheck className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{loading ? 'Loading...' : 'No incoming receipts found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map(receipt => (
            <div key={receipt.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => setExpanded(expanded === receipt.id ? null : receipt.id)} className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{receipt.receiptNumber}</span>
                    {receipt.invoiceNumber && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">Inv {receipt.invoiceNumber}</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{receipt.supplierName || 'Unknown supplier'} · {new Date(receipt.receivedAt).toLocaleString()} · {receipt.items.length} items</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{receipt.totalCost.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">{receipt.items.reduce((sum, item) => sum + item.quantity, 0)} units</p>
                  </div>
                  {expanded === receipt.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              {expanded === receipt.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                  {receipt.items.map(item => (
                    <div key={item.id} className="px-4 py-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">{item.product?.category?.name || 'Uncategorized'}{item.notes ? ` · ${item.notes}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.quantity} × {item.unitCost.toFixed(2)}</p>
                        <p className="text-xs text-emerald-600">{item.lineTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {receipt.notes && <p className="px-4 py-2 text-[11px] italic text-slate-400">{receipt.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Prev</button>
          <span className="px-3 py-1.5 text-xs text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Next</button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">New Incoming Receipt</h3>
                <p className="text-xs text-slate-400">Restock products and update inventory from one document.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">Close</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Supplier Name</label>
                  <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Invoice Number</label>
                  <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Received Date</label>
                  <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 resize-none" />
              </div>

              <div className="space-y-3">
                {draftItems.map((row, index) => {
                  const selected = products.find(product => product.id === row.productId)
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr_100px_120px_1.5fr_auto] gap-2 items-end p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Product</label>
                        <select value={row.productId} onChange={e => updateRow(index, { productId: e.target.value, unitCost: selected ? row.unitCost : '' })} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                          <option value="">Select product</option>
                          {products.map(product => <option key={product.id} value={product.id}>{product.name} · stock {product.stock}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                        <input type="number" min={1} value={row.quantity} onChange={e => updateRow(index, { quantity: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Unit Cost</label>
                        <input type="number" min={0} step="0.01" value={row.unitCost} onChange={e => updateRow(index, { unitCost: e.target.value })} placeholder={selected ? String(selected.cost) : '0.00'} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                        <input value={row.notes} onChange={e => updateRow(index, { notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
                      </div>
                      <button onClick={() => removeRow(index)} className="px-3 py-2 text-xs rounded-lg border border-red-200 text-red-500">Remove</button>
                    </div>
                  )
                })}
                <button onClick={addRow} className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">+ Add Item</button>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Total receipt cost</p>
                <p className="text-lg font-bold text-emerald-600">{draftTotal.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">{saving ? 'Saving...' : 'Save Receipt'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
