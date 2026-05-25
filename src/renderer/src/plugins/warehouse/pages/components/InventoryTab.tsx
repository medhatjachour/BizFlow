import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, AlertCircle, Plus, Minus, Edit2, Trash2, AlertTriangle, Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import InfoTooltip from './InfoTooltip'

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
  const [sortBy, setSortBy] = useState<'risk' | 'name' | 'qty'>('risk')
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
      toast.warning(t('warehouseSelectLocationFirst'))
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
      toast.success(t('warehouseStockEntryCreated'))
      loadStock()
    } catch (err: any) {
      setStock(prev => prev.filter(s => s.id !== tempId))
      toast.error(err?.message || t('warehouseAddStockFailed'))
    }
  }

  const handleAdjust = async (entry: StockEntry, delta: number) => {
    const newQty = Math.max(0, entry.quantity + delta)
    const before = entry.quantity
    setStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: newQty } : s))
    setLowStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: newQty } : s))
    try {
      await window.api.warehouse.adjustStock({ id: entry.id, quantity: newQty, actedBy: 'warehouse.operator' })
      toast.success(t('warehouseQuantityUpdated'))
    }
    catch (err: any) {
      setStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: before } : s))
      setLowStock(prev => prev.map(s => s.id === entry.id ? { ...s, quantity: before } : s))
      toast.error(err?.message || t('warehouseUpdateQuantityFailed'))
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await window.api.warehouse.adjustStock({ id: editing.id, quantity: Number(editForm.quantity), actedBy: 'warehouse.operator' })
      setEditing(null)
      toast.success(t('warehouseStockUpdated'))
      loadStock()
    } catch (err: any) { toast.error(err?.message || t('warehouseSaveChangesFailed')) }
  }

  const del = async (id: string) => {
    if (!confirm(t('warehouseDeleteStockConfirm'))) return
    const existing = stock.find(s => s.id === id) || lowStock.find(s => s.id === id)
    setStock(prev => prev.filter(s => s.id !== id))
    setLowStock(prev => prev.filter(s => s.id !== id))
    try {
      await window.api.warehouse.deleteStock(id, 'warehouse.operator')
      toast.success(t('warehouseStockDeleted'))
    }
    catch (err: any) {
      if (existing) {
        setStock(prev => [existing, ...prev])
        setLowStock(prev => [existing, ...prev])
      }
      toast.error(err?.message || t('warehouseDeleteStockFailed'))
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
    const healthyRate = totalItems === 0 ? 100 : Math.round(((totalItems - low) / totalItems) * 100)
    return { totalItems, low, totalQty, healthyRate }
  }, [filteredEntries])

  const sortedEntries = useMemo(() => {
    const entries = [...filteredEntries]
    if (sortBy === 'name') {
      entries.sort((a, b) => a.productName.localeCompare(b.productName))
      return entries
    }

    if (sortBy === 'qty') {
      entries.sort((a, b) => b.quantity - a.quantity)
      return entries
    }

    // Default risk sort: most critical first.
    entries.sort((a, b) => {
      const aRisk = a.minQuantity <= 0 ? (a.quantity <= 0 ? 9999 : 0) : (a.minQuantity - a.quantity) / a.minQuantity
      const bRisk = b.minQuantity <= 0 ? (b.quantity <= 0 ? 9999 : 0) : (b.minQuantity - b.quantity) / b.minQuantity
      return bRisk - aRisk
    })
    return entries
  }, [filteredEntries, sortBy])

  const selectedLocationName = useMemo(() => {
    return locations.find((l) => l.id === selectedLocation)?.name ?? ''
  }, [locations, selectedLocation])

  const getHealth = (entry: StockEntry) => {
    if (entry.minQuantity <= 0) {
      if (entry.quantity <= 0) return { pct: 0, label: 'out', className: 'bg-rose-500' }
      return { pct: 100, label: 'ok', className: 'bg-emerald-500' }
    }

    const pct = Math.max(0, Math.min(180, Math.round((entry.quantity / entry.minQuantity) * 100)))
    if (pct <= 60) return { pct, label: 'critical', className: 'bg-rose-500' }
    if (pct <= 100) return { pct, label: 'low', className: 'bg-amber-500' }
    return { pct, label: 'ok', className: 'bg-emerald-500' }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('warehouseInventoryTab')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {showLow
                ? t('warehouseLowStockItems')
                : (selectedLocationName ? `${selectedLocationName} - ${t('warehouseInventoryTab')}` : t('warehouseSelectLocationPrompt'))}
            </p>
          </div>

          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-1">
            <button
              onClick={() => { setShowLow(false) }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${!showLow ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-300'}`}
            >
              {t('warehouseInventoryTab')}
            </button>
            <button
              onClick={() => { setShowLow(true); setSelectedLocation('') }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${showLow ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'text-slate-500 dark:text-slate-300'}`}
            >
              {t('warehouseLowStockItems')}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_auto] gap-2">
          <select
            value={showLow ? '__low__' : selectedLocation}
            onChange={e => {
              if (e.target.value === '__low__') { setShowLow(true); setSelectedLocation('') }
              else { setShowLow(false); setSelectedLocation(e.target.value) }
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm min-w-[200px]"
          >
            <option value="">{t('warehouseSelectLocationPrompt')}</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
            <option value="__low__">{t('warehouseLowStockItems')}</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-3 text-slate-400" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('warehouseSearchProductOrSku')}
              className="pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm w-full"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={loadStock} className="h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />{t('warehouseRefresh')}</button>
            {selectedLocation && !showLow && (
              <button onClick={() => setShowAdd(true)} className="h-[42px] px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"><Plus className="w-4 h-4" /> {t('warehouseAddStock')}</button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {(selectedLocation || showLow) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <div className="text-xs text-slate-500">{t('warehouseVisibleItems')}</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{summary.totalItems}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <div className="text-xs text-slate-500">{t('warehouseTotalQuantity')}</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{summary.totalQty}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <div className="text-xs text-slate-500">{t('warehouseLowStock')}</div>
            <div className="text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1">{summary.low}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
            <div className="text-xs text-slate-500 inline-flex items-center gap-1">
              {t('warehouseHealthyRateLabel')}
              <InfoTooltip text={t('warehouseHealthyRateInfo')} />
            </div>
            <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{summary.healthyRate}%</div>
          </div>
        </div>
      )}

      {(selectedLocation || showLow) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {sortedEntries.length} {sortedEntries.length === 1 ? t('warehouseItems').slice(0, -1) : t('warehouseItems')}
          </div>
          <div className="inline-flex items-center gap-2 text-xs">
            <span className="text-slate-400 inline-flex items-center gap-1">
              {t('warehouseSortLabel')}
              <InfoTooltip text={t('warehouseSortInfo')} />
            </span>
            <button onClick={() => setSortBy('risk')} className={`px-2.5 py-1 rounded-md ${sortBy === 'risk' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{t('warehouseSortRisk')}</button>
            <button onClick={() => setSortBy('name')} className={`px-2.5 py-1 rounded-md ${sortBy === 'name' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{t('warehouseSortName')}</button>
            <button onClick={() => setSortBy('qty')} className={`px-2.5 py-1 rounded-md ${sortBy === 'qty' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{t('warehouseSortQty')}</button>
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
      ) : sortedEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{showLow ? t('warehouseNoLowStock') : t('warehouseNoStockEntries')}</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/30">
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseProduct')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseSKU')}</th>
                {showLow && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseLocation')}</th>}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseQty')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseMin')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    {t('warehouseHealthLabel')}
                    <InfoTooltip text={t('warehouseHealthInfo')} />
                  </span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('warehouseActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {sortedEntries.map(entry => {
                const isLow = entry.quantity <= entry.minQuantity
                const health = getHealth(entry)
                const healthLabel = health.label === 'critical'
                  ? t('warehouseHealthStatusCritical')
                  : health.label === 'low'
                    ? t('warehouseHealthStatusLow')
                    : health.label === 'out'
                      ? t('warehouseHealthStatusOut')
                      : t('warehouseHealthStatusOk')
                return (
                  <tr key={entry.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isLow ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                        <span className="font-medium text-slate-900 dark:text-white">{entry.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.sku || t('warehouseDash')}</td>
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
                    <td className="px-4 py-3 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className={`h-full ${health.className}`} style={{ width: `${Math.min(100, health.pct)}%` }} />
                        </div>
                        <span className={`text-[11px] font-medium ${health.label === 'critical' || health.label === 'out' ? 'text-rose-600 dark:text-rose-400' : health.label === 'low' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{healthLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 rounded-lg bg-slate-50 dark:bg-slate-700/40 p-0.5">
                        <button onClick={() => { setEditing(entry); setEditForm({ quantity: String(entry.quantity), unit: entry.unit, minQuantity: String(entry.minQuantity), sku: entry.sku }) }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(entry.id)} className="p-1.5 rounded-md text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
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
                  placeholder={t('warehouseUnitExample')}
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
