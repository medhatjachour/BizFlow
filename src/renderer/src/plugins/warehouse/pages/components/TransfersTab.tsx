import { useEffect, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, ArrowRight, X, Trash2, Check } from 'lucide-react'

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
  const [expanded, setExpanded] = useState<string | null>(null)

  // Create transfer modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ fromLocationId: '', toLocationId: '', items: [{ productName: '', sku: '', quantity: '1', unit: 'pcs' }] })

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [t, l] = await Promise.all([
        window.api.warehouse.getTransfers({ status: filterStatus || undefined }),
        window.api.warehouse.getLocations()
      ])
      setTransfers(t); setLocations(l)
    } catch { setError('Failed to load transfers') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  const createTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const items = createForm.items.filter(i => i.productName.trim()).map(i => ({ productName: i.productName, sku: i.sku || undefined, quantity: Number(i.quantity), unit: i.unit }))
      if (items.length === 0) { alert('Add at least one item'); return }
      await window.api.warehouse.createTransfer({ fromLocationId: createForm.fromLocationId, toLocationId: createForm.toLocationId, items })
      setShowCreate(false); setCreateForm({ fromLocationId: '', toLocationId: '', items: [{ productName: '', sku: '', quantity: '1', unit: 'pcs' }] }); load()
    } catch (err: any) { alert(err?.message || 'Failed to create transfer') }
  }

  const updateStatus = async (id: string, status: string) => {
    if (!confirm(`Change status to "${status.replace('_', ' ')}"?${status === 'completed' ? ' This will move stock.' : ''}`)) return
    try { await window.api.warehouse.updateTransferStatus({ id, status }); load() }
    catch (err: any) { alert(err?.message || 'Failed') }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this transfer?')) return
    try { await window.api.warehouse.deleteTransfer(id); load() }
    catch (err: any) { alert(err?.message || 'Failed') }
  }

  const addItem = () => setCreateForm(f => ({ ...f, items: [...f.items, { productName: '', sku: '', quantity: '1', unit: 'pcs' }] }))
  const removeItem = (i: number) => setCreateForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: string, val: string) => setCreateForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }))

  const locName = (id: string) => locations.find(l => l.id === id)?.name ?? id

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterStatus ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            All
          </button>
          {['draft', 'in_transit', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filterStatus === s ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> New Transfer</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">No transfers found</div>
      ) : (
        <div className="space-y-3">
          {transfers.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{locName(t.fromLocationId)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{locName(t.toLocationId)}</span>
                  </div>
                  <div className="text-xs text-slate-400">{new Date(t.transferDate).toLocaleDateString()}{t.completedAt ? ` · completed ${new Date(t.completedAt).toLocaleDateString()}` : ''}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${STATUS_COLORS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {NEXT_STATUS[t.status] && (
                    <button onClick={() => updateStatus(t.id, NEXT_STATUS[t.status])}
                      title={`Advance to ${NEXT_STATUS[t.status].replace('_', ' ')}`}
                      className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><Check className="w-4 h-4" /></button>
                  )}
                  {t.status === 'draft' && (
                    <button onClick={() => updateStatus(t.id, 'cancelled')} title="Cancel" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><X className="w-4 h-4" /></button>
                  )}
                  {(t.status === 'cancelled' || t.status === 'draft') && (
                    <button onClick={() => del(t.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs">
                    {expanded === t.id ? 'Hide' : 'Items'}
                  </button>
                </div>
              </div>

              {expanded === t.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                  {!t.items || t.items.length === 0 ? (
                    <p className="text-sm text-slate-400">No items</p>
                  ) : (
                    <div className="space-y-1">
                      {t.items.map(item => (
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
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">New Stock Transfer</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">From *</span>
                <select required value={createForm.fromLocationId} onChange={e => setCreateForm(f => ({ ...f, fromLocationId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {locations.filter(l => l.id !== createForm.toLocationId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">To *</span>
                <select required value={createForm.toLocationId} onChange={e => setCreateForm(f => ({ ...f, toLocationId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {locations.filter(l => l.id !== createForm.fromLocationId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Items</span>
                <button type="button" onClick={addItem} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Add row</button>
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
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Create Transfer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
