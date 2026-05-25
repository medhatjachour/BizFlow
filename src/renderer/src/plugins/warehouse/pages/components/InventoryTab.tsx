import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, AlertCircle, Plus, Minus, Edit2, Trash2, AlertTriangle, Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

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
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Form state (inline add)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ productName: '', sku: '', quantity: '0', unit: 'pcs', minQuantity: '0' })

  // Edit modal
  const [editing, setEditing] = useState<StockEntry | null>(null)
  const [editForm, setEditForm] = useState({ quantity: '0', unit: 'pcs', minQuantity: '0', sku: '' })

  const { t } = useLanguage()
  const toast = useToast()

  const loadLocations = async () => {
    try { setLocations(await window.api.warehouse.getLocations()) }
    catch { /* ignore */ }
  }

  const loadStock = async () => {
    if (!selectedLocation && !showLow) { setStock([]); return }
    setLoading(true); setError('')
    try {
      if (showLow) setLowStock(await window.api.warehouse.getLowStock())
      else setStock(await window.api.warehouse.getStock(selectedLocation))
    } catch { setError(t('warehouseLoadStockFailed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadLocations() }, [])
  useEffect(() => { loadStock() }, [selectedLocation, showLow])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && selectedLocation && !showLow) {
        e.preventDefault()
        setShowAdd(true)
        return
      }

      if (!typing && e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'Escape') {
        if (showAdd) setShowAdd(false)
        if (editing) setEditing(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedLocation, showLow, showAdd, editing])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation) {
      toast.warning('Select a location first')
      return
    }

    const tempId = `temp-${Date.now()}`
    const optimisticRow: StockEntry = {
      id: tempId,
      locationId: selectedLocation,
      productName: addForm.productName,
      productId: null,
      sku: addForm.sku,
      quantity: Number(addForm.quantity),
      unit: addForm.unit,
      minQuantity: Number(addForm.minQuantity)
    }

    setStock(prev => [optimisticRow, ...prev])

    try {
      await window.api.warehouse.upsertStock({ locationId: selectedLocation, productName: addForm.productName, sku: addForm.sku, quantity: Number(addForm.quantity), unit: addForm.unit, minQuantity: Number(addForm.minQuantity), actedBy: 'warehouse.operator' })
      setShowAdd(false)
      setAddForm({ productName: '', sku: '', quantity: '0', unit: 'pcs', minQuantity: '0' })
      toast.success('Stock entry created')
      loadStock()
    } catch (err: any) {
      setStock(prev => prev.filter(s => s.id !== tempId))
      toast.error(err?.message || 'Failed to add stock')
    }
  }

  const handleAdjust = async (entry: StockEntry, delta: number) => {
    const newQty = Math.max(0, entry.quantity + delta)
    const before = entry.quantity
    setStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: newQty } : s))
    setLowStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: newQty } : s))
    try {
      await window.api.warehouse.adjustStock({ id: entry.id, quantity: newQty, actedBy: 'warehouse.operator' })
      toast.success('Quantity updated')
    }
    catch (err: any) {
      setStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: before } : s))
      setLowStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: before } : s))
      toast.error(err?.message || 'Failed to update quantity')
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await window.api.warehouse.adjustStock({ id: editing.id, quantity: Number(editForm.quantity), actedBy: 'warehouse.operator' })
      setEditing(null)
      toast.success('Stock updated')
      loadStock()
    } catch (err: any) { toast.error(err?.message || 'Failed to save changes') }
  }

  const del = async (id: string) => {
    if (!confirm(t('warehouseDeleteStockConfirm'))) return
    const existing = stock.find(s => s.id === id) || lowStock.find(s => s.id === id)
    setStock(prev => prev.filter(s => s.id !== id))
    setLowStock(prev => prev.filter(s => s.id !== id))
    try {
      await window.api.warehouse.deleteStock(id, 'warehouse.operator')
      toast.success('Stock deleted')
    }
    catch (err: any) {
      if (existing) {
        setStock(prev => [existing, ...prev])
        setLowStock(prev => [existing, ...prev])
      }
      toast.error(err?.message || 'Failed to delete stock')
    }
  }

  const displayEntries = showLow ? lowStock : stock
  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return displayEntries
    return displayEntries.filter((entry) => `${entry.productName} ${entry.sku || ''}`.toLowerCase().includes(q))
  }, [displayEntries, query])

  const summary = useMemo(() => {
    const totalItems = filteredEntries.length
    const low = filteredEntries.filter((e) => e.quantity <= e.minQuantity).length
    const totalQty = filteredEntries.reduce((acc, e) => acc + Number(e.quantity || 0), 0)
    return { totalItems, low, totalQty }
  }, [filteredEntries])

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
            <option value="">{t('warehouseSelectLocationPrompt')}</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
            <option value="__low__">{t('warehouseLowStockItems')}</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product or SKU"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm w-full min-w-[220px]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadStock} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          {selectedLocation && !showLow && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> {t('warehouseAddStock')}</button>
          )}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {(selectedLocation || showLow) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <div className="text-xs text-slate-500">Visible Items</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{summary.totalItems}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <div className="text-xs text-slate-500">Total Quantity</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{summary.totalQty}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <div className="text-xs text-slate-500">Low Stock</div>
            <div className="text-xl font-semibold text-rose-600 dark:text-rose-400 mt-1">{summary.low}</div>
          </div>
        </div>
      )}

      {(!selectedLocation && !showLow) ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{t('warehouseSelectLocation')}</div>
      ) : loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="animate-pulse divide-y divide-slate-100 dark:divide-slate-700">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{showLow ? t('warehouseNoLowStock') : t('warehouseNoStockEntries')}</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseProduct')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseSKU')}</th>
                {showLow && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseLocation')}</th>}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseQty')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseMin')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filteredEntries.map(entry => {
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('warehouseAddStockEntry')}</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseProductName')} *</span>
              <input required value={addForm.productName} onChange={e => setAddForm(f => ({ ...f, productName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseSKU')}</span>
                <input value={addForm.sku} onChange={e => setAddForm(f => ({ ...f, sku: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm font-mono" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseUnit')}</span>
                <input value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="pcs, kg, box..."
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseQuantity')}</span>
                <input type="number" min="0" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseMinQty')}</span>
                <input type="number" min="0" value={addForm.minQuantity} onChange={e => setAddForm(f => ({ ...f, minQuantity: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">{t('warehouseCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">{t('warehouseSave')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleEditSave} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('edit')} — {editing.productName}</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseQuantity')}</span>
              <input type="number" min="0" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">{t('warehouseCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">{t('warehouseSave')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
