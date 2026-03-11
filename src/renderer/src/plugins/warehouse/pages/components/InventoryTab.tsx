import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle, Plus, Minus, Edit2, Trash2, AlertTriangle } from 'lucide-react'

interface Location { id: string; name: string; code: string; type: string }
interface StockEntry { id: string; locationId: string; productName: string; productId: string | null; sku: string; quantity: number; unit: string; minQuantity: number }

export default function InventoryTab() {
  const [locations, setLocations] = useState<Location[]>([])
  const [stock, setStock] = useState<StockEntry[]>([])
  const [lowStock, setLowStock] = useState<StockEntry[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showLow, setShowLow] = useState(false)

  // Form state (inline add)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ productName: '', sku: '', quantity: '0', unit: 'pcs', minQuantity: '0' })

  // Edit modal
  const [editing, setEditing] = useState<StockEntry | null>(null)
  const [editForm, setEditForm] = useState({ quantity: '0', unit: 'pcs', minQuantity: '0', sku: '' })

  const loadLocations = async () => {
    try { setLocations(await window.api.warehouse.getLocations()) }
    catch { /* ignore */ }
  }

  const loadStock = async () => {
    if (!selectedLocation && !showLow) { setStock([]); return }
    setLoading(true); setError('')
    try {
      if (showLow) setLowStock(await window.api.warehouse.getLowStock())
      else setStock(await window.api.warehouse.getStock({ locationId: selectedLocation }))
    } catch { setError('Failed to load stock') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadLocations() }, [])
  useEffect(() => { loadStock() }, [selectedLocation, showLow])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation) return
    try {
      await window.api.warehouse.upsertStock({ locationId: selectedLocation, productName: addForm.productName, sku: addForm.sku, quantity: Number(addForm.quantity), unit: addForm.unit, minQuantity: Number(addForm.minQuantity) })
      setShowAdd(false); setAddForm({ productName: '', sku: '', quantity: '0', unit: 'pcs', minQuantity: '0' }); loadStock()
    } catch (err: any) { alert(err?.message || 'Failed to add') }
  }

  const handleAdjust = async (entry: StockEntry, delta: number) => {
    const newQty = Math.max(0, entry.quantity + delta)
    try { await window.api.warehouse.adjustStock({ id: entry.id, quantity: newQty }); loadStock() }
    catch (err: any) { alert(err?.message || 'Failed') }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await window.api.warehouse.adjustStock({ id: editing.id, quantity: Number(editForm.quantity) })
      setEditing(null); loadStock()
    } catch (err: any) { alert(err?.message || 'Failed') }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this stock entry?')) return
    try { await window.api.warehouse.deleteStock(id); loadStock() }
    catch (err: any) { alert(err?.message || 'Failed') }
  }

  const displayEntries = showLow ? lowStock : stock

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-1">
          <select
            value={showLow ? '__low__' : selectedLocation}
            onChange={e => {
              if (e.target.value === '__low__') { setShowLow(true); setSelectedLocation('') }
              else { setShowLow(false); setSelectedLocation(e.target.value) }
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm min-w-[200px]">
            <option value="">Select a location...</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
            <option value="__low__">⚠ Low Stock Items</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={loadStock} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          {selectedLocation && !showLow && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Add Stock</button>
          )}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {(!selectedLocation && !showLow) ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Select a location to view stock</div>
      ) : loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
      ) : displayEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{showLow ? 'No low stock items' : 'No stock entries for this location'}</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SKU</th>
                {showLow && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Location</th>}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Min</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {displayEntries.map(entry => {
                const isLow = entry.quantity <= entry.minQuantity
                return (
                  <tr key={entry.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isLow ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                        <span className="font-medium text-slate-900 dark:text-white">{entry.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.sku || '—'}</td>
                    {showLow && <td className="px-4 py-3 text-xs text-slate-500">{locations.find(l => l.id === entry.locationId)?.name ?? entry.locationId}</td>}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleAdjust(entry, -1)} className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"><Minus className="w-3 h-3" /></button>
                        <span className={`w-10 text-center font-semibold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{entry.quantity}</span>
                        <button onClick={() => handleAdjust(entry, 1)} className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="text-xs text-center text-slate-400">{entry.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-500">{entry.minQuantity}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(entry); setEditForm({ quantity: String(entry.quantity), unit: entry.unit, minQuantity: String(entry.minQuantity), sku: entry.sku }) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(entry.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Stock Entry</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Name *</span>
              <input required value={addForm.productName} onChange={e => setAddForm(f => ({ ...f, productName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">SKU</span>
                <input value={addForm.sku} onChange={e => setAddForm(f => ({ ...f, sku: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm font-mono" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit</span>
                <input value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="pcs, kg, box..."
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</span>
                <input type="number" min="0" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Min Qty</span>
                <input type="number" min="0" value={addForm.minQuantity} onChange={e => setAddForm(f => ({ ...f, minQuantity: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Add</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleEditSave} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit — {editing.productName}</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</span>
              <input type="number" min="0" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
