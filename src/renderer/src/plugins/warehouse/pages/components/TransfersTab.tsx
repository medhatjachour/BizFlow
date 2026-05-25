import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, ArrowRight, X, Trash2, Check, Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

interface Location { id: string; name: string; code: string; type: string }
interface TransferItem { id: string; productName: string; sku: string; quantity: number; unit: string }
interface Transfer { id: string; fromLocationId: string; toLocationId: string; status: string; transferDate: string; completedAt: string | null; items?: TransferItem[] }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
}

const NEXT_STATUS: Record<string, string> = { draft: 'in_transit', in_transit: 'completed' }

export default function TransfersTab() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Create transfer modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ fromLocationId: '', toLocationId: '', items: [{ productName: '', sku: '', quantity: '1', unit: 'pcs' }] })
  const { t } = useLanguage()
  const toast = useToast()

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [tr, l] = await Promise.all([
        window.api.warehouse.getTransfers({ status: filterStatus || undefined }),
        window.api.warehouse.getLocations()
      ])
      setTransfers(tr); setLocations(l)
    } catch { setError(t('warehouseLoadTransfersFailed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setShowCreate(true)
        return
      }

      if (!typing && e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'Escape' && showCreate) {
        setShowCreate(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showCreate])

  const createTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const items = createForm.items.filter(i => i.productName.trim()).map(i => ({ productName: i.productName, sku: i.sku || undefined, quantity: Number(i.quantity), unit: i.unit }))
      if (items.length === 0) { toast.warning('Add at least one item'); return }
      await window.api.warehouse.createTransfer({ fromLocationId: createForm.fromLocationId, toLocationId: createForm.toLocationId, createdBy: 'warehouse.operator', items })
      setShowCreate(false)
      setCreateForm({ fromLocationId: '', toLocationId: '', items: [{ productName: '', sku: '', quantity: '1', unit: 'pcs' }] })
      toast.success('Transfer created')
      load()
    } catch (err: any) { toast.error(err?.message || 'Failed to create transfer') }
  }

  const updateStatus = async (id: string, status: string) => {
    const label = status.replace('_', ' ')
    const isComplete = status === 'completed'
    if (!confirm(`${t('warehouseStatusInTransit') ? label : label}?${isComplete ? ' This will move stock.' : ''}`)) return
    const before = transfers
    setTransfers(prev => prev.map(tr => tr.id === id ? { ...tr, status, completedAt: status === 'completed' ? new Date().toISOString() : tr.completedAt } : tr))
    try {
      await window.api.warehouse.updateTransferStatus({ id, status, actedBy: 'warehouse.operator' })
      toast.success(`Transfer moved to ${label}`)
      load()
    }
    catch (err: any) {
      setTransfers(before)
      toast.error(err?.message || 'Failed to update transfer')
    }
  }

  const del = async (id: string) => {
    if (!confirm(t('warehouseDeleteTransferConfirm'))) return
    const before = transfers
    setTransfers(prev => prev.filter(tr => tr.id !== id))
    try {
      await window.api.warehouse.deleteTransfer(id)
      toast.success('Transfer deleted')
    }
    catch (err: any) {
      setTransfers(before)
      toast.error(err?.message || 'Failed to delete transfer')
    }
  }

  const addItem = () => setCreateForm(f => ({ ...f, items: [...f.items, { productName: '', sku: '', quantity: '1', unit: 'pcs' }] }))
  const removeItem = (i: number) => setCreateForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: string, val: string) => setCreateForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }))

  const locName = (id: string) => locations.find(l => l.id === id)?.name ?? id

  const filteredTransfers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return transfers
    return transfers.filter((tr) => {
      const names = `${locName(tr.fromLocationId)} ${locName(tr.toLocationId)}`.toLowerCase()
      const itemText = (tr.items ?? []).map((i) => `${i.productName} ${i.sku || ''}`).join(' ').toLowerCase()
      return `${names} ${tr.status} ${itemText}`.includes(q)
    })
  }, [query, transfers, locations])

  const stats = useMemo(() => {
    return {
      total: filteredTransfers.length,
      draft: filteredTransfers.filter((t) => t.status === 'draft').length,
      moving: filteredTransfers.filter((t) => t.status === 'in_transit').length,
      completed: filteredTransfers.filter((t) => t.status === 'completed').length
    }
  }, [filteredTransfers])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterStatus ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            {t('warehouseAll')}
          </button>
          {(['draft', 'in_transit', 'completed', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filterStatus === s ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
              {t(`warehouseStatus${s.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as any)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search routes or products"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm w-52"
            />
          </div>
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> {t('warehouseNewTransfer')}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm"><div className="text-xs text-slate-500">Visible</div><div className="text-xl font-semibold text-slate-900 dark:text-white">{stats.total}</div></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm"><div className="text-xs text-slate-500">Draft</div><div className="text-xl font-semibold text-slate-900 dark:text-white">{stats.draft}</div></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm"><div className="text-xs text-slate-500">In Transit</div><div className="text-xl font-semibold text-blue-600 dark:text-blue-400">{stats.moving}</div></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm"><div className="text-xs text-slate-500">Completed</div><div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.completed}</div></div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="h-3.5 w-1/2 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
              <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{t('warehouseNoTransfers')}</div>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map(tr => (
            <div key={tr.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{locName(tr.fromLocationId)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{locName(tr.toLocationId)}</span>
                  </div>
                  <div className="text-xs text-slate-400">{new Date(tr.transferDate).toLocaleDateString()}{tr.completedAt ? ` · completed ${new Date(tr.completedAt).toLocaleDateString()}` : ''}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${STATUS_COLORS[tr.status]}`}>{tr.status.replace('_', ' ')}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {NEXT_STATUS[tr.status] && (
                    <button onClick={() => updateStatus(tr.id, NEXT_STATUS[tr.status])}
                      title={`Advance to ${NEXT_STATUS[tr.status].replace('_', ' ')}`}
                      className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><Check className="w-4 h-4" /></button>
                  )}
                  {tr.status === 'draft' && (
                    <button onClick={() => updateStatus(tr.id, 'cancelled')} title="Cancel" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><X className="w-4 h-4" /></button>
                  )}
                  {(tr.status === 'cancelled' || tr.status === 'draft') && (
                    <button onClick={() => del(tr.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => setExpanded(expanded === tr.id ? null : tr.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs">
                    {expanded === tr.id ? t('warehouseHide') : t('warehouseItems')}
                  </button>
                </div>
              </div>

              {expanded === tr.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                  {!tr.items || tr.items.length === 0 ? (
                    <p className="text-sm text-slate-400">{t('warehouseNoItemsInTransfer')}</p>
                  ) : (
                    <div className="space-y-1">
                      {tr.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          <span className="flex-1 text-slate-700 dark:text-slate-300">{item.productName}</span>
                          {item.sku && <span className="text-xs text-slate-400 font-mono">{item.sku}</span>}
                          <span className="text-slate-500">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Transfer Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={createTransfer} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('warehouseNewStockTransfer')}</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseFrom')} *</span>
                <select required value={createForm.fromLocationId} onChange={e => setCreateForm(f => ({ ...f, fromLocationId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                  <option value="">{t('warehouseSelectFrom')}</option>
                  {locations.filter(l => l.id !== createForm.toLocationId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseTo')} *</span>
                <select required value={createForm.toLocationId} onChange={e => setCreateForm(f => ({ ...f, toLocationId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                  <option value="">{t('warehouseSelectFrom')}</option>
                  {locations.filter(l => l.id !== createForm.fromLocationId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseTransferItems')}</span>
                <button type="button" onClick={addItem} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{t('warehouseAddRow')}</button>
              </div>
              {createForm.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input required value={item.productName} onChange={e => updateItem(i, 'productName', e.target.value)}
                    placeholder="Product name"
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-1.5 text-sm" />
                  <input value={item.sku} onChange={e => updateItem(i, 'sku', e.target.value)}
                    placeholder="SKU"
                    className="w-20 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-1.5 text-sm font-mono" />
                  <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)}
                    className="w-16 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-1.5 text-sm text-center" />
                  <input value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                    placeholder="unit"
                    className="w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-1.5 text-sm" />
                  {createForm.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">{t('warehouseCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">{t('warehouseCreateTransfer')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
