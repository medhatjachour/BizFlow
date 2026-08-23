import React from 'react'
import { Boxes, X, Plus, Loader2, Pencil, PackageX, Trash2, Settings2, Check } from 'lucide-react'
import { PharmacyProductItem } from '../types'
import { money, expiryTone, inputCls } from '../../components/_shared'
import { useBatchManager } from '../hooks/useBatchManager'
import { computeExpiryDays } from '../utils'

interface BatchManagerModalProps {
  product: PharmacyProductItem
  onClose: () => void
  toast: any
  t: (k: string) => string
}

export const BatchManagerModal: React.FC<BatchManagerModalProps> = ({
  product,
  onClose,
  toast,
  t,
}) => {
  const {
    batches,
    suppliers,
    loading,
    adding,
    newBatchForm,
    setNewBatchForm,
    editId,
    setEditId,
    editForm,
    setEditForm,
    editBusy,
    adj,
    setAdj,
    adjBusy,
    addBatch,
    startEdit,
    saveEdit,
    applyAdjust,
    disposeBatch,
    deleteBatch,
  } = useBatchManager(product, toast, t)

  const hasSub = Boolean(product.subUnit && product.subUnitsPerContainer)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes size={16} className="text-emerald-500" /> {product.name}
            </h2>
            <p className="text-[11px] text-slate-400">Manage Stock Batches, Expiry Dates & Restocking</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Add Batch Quick Form */}
        <form onSubmit={addBatch} className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Batch #</label>
              <input
                value={newBatchForm.batchNumber}
                onChange={e => setNewBatchForm({ ...newBatchForm, batchNumber: e.target.value })}
                placeholder="BTH-01"
                className={`${inputCls} py-1 text-xs`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Qty *</label>
              <input
                value={newBatchForm.quantity}
                onChange={e => setNewBatchForm({ ...newBatchForm, quantity: e.target.value })}
                type="number"
                min="1"
                required
                className={`${inputCls} py-1 text-xs`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Cost ($)</label>
              <input
                value={newBatchForm.costPerUnit}
                onChange={e => setNewBatchForm({ ...newBatchForm, costPerUnit: e.target.value })}
                type="number"
                min="0"
                step="0.01"
                className={`${inputCls} py-1 text-xs`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Sell ($)</label>
              <input
                value={newBatchForm.sellingPrice}
                onChange={e => setNewBatchForm({ ...newBatchForm, sellingPrice: e.target.value })}
                type="number"
                min="0"
                step="0.01"
                placeholder={String(product.sellingPrice ?? '')}
                className={`${inputCls} py-1 text-xs`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Expiry *</label>
              <input
                value={newBatchForm.expiryDate}
                onChange={e => setNewBatchForm({ ...newBatchForm, expiryDate: e.target.value })}
                type="date"
                required
                className={`${inputCls} py-1 text-xs`}
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
            </button>
          </div>

          {suppliers.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-400">Supplier:</span>
              <select
                value={newBatchForm.supplierId}
                onChange={e => setNewBatchForm({ ...newBatchForm, supplierId: e.target.value })}
                className={`${inputCls} py-0.5 text-xs w-auto`}
              >
                <option value="">No Supplier Linked</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </form>

        {/* Batches List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-1" />
              <p className="text-xs">Loading batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">
              No inventory batches recorded yet. Add one above to populate stock.
            </p>
          ) : (
            batches.map(b => {
              const days = computeExpiryDays(b.expiryDate)
              const depleted = b.quantity <= 0
              const isEditing = editId === b.id

              return (
                <div
                  key={b.id}
                  className={`rounded-xl border transition-colors ${
                    depleted
                      ? 'border-slate-200 dark:border-slate-800 opacity-50'
                      : days !== null && days < 0
                      ? 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {b.quantity} {product.unit}
                        </span>
                        {b.batchNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">#{b.batchNumber}</span>
                        )}
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                            b.status === 'active' && !depleted
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                          }`}
                        >
                          {depleted ? 'depleted' : b.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cost: ${money(b.costPerUnit)} · Sell: ${money(b.sellingPrice ?? product.sellingPrice)} ·{' '}
                        <span className={days !== null ? expiryTone(days) : ''}>
                          Exp: {new Date(b.expiryDate).toLocaleDateString()} {days !== null ? `(${days < 0 ? 'expired' : `${days}d`})` : ''}
                        </span>
                        {b.supplier && ` · ${b.supplier.name}`}
                      </div>
                    </div>

                    <button
                      onClick={() => (isEditing ? setEditId(null) : startEdit(b))}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isEditing
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Pencil size={13} />
                    </button>
                    {!depleted && (
                      <button
                        onClick={() => disposeBatch(b.id)}
                        title="Dispose remaining batch stock"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <PackageX size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteBatch(b.id)}
                      title="Delete batch"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Inline Batch Editor & Stock Adjust Drawer */}
                  {isEditing && (
                    <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Cost</label>
                          <input
                            value={editForm.costPerUnit}
                            onChange={e => setEditForm({ ...editForm, costPerUnit: e.target.value })}
                            type="number"
                            min="0"
                            step="0.01"
                            className={`${inputCls} py-1 text-xs`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Sell</label>
                          <input
                            value={editForm.sellingPrice}
                            onChange={e => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                            type="number"
                            min="0"
                            step="0.01"
                            className={`${inputCls} py-1 text-xs`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Expiry</label>
                          <input
                            value={editForm.expiryDate}
                            onChange={e => setEditForm({ ...editForm, expiryDate: e.target.value })}
                            type="date"
                            className={`${inputCls} py-1 text-xs`}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => saveEdit(b.id)}
                          disabled={editBusy}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"
                        >
                          {editBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Info
                        </button>
                      </div>

                      {/* Adjust Stock Controls */}
                      <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          <Settings2 size={12} />
                          <span>Adjust Batch Units</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <div className="flex items-center gap-0.5 p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            {(['add', 'remove', 'set'] as const).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setAdj(prev => ({ ...prev, mode }))}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize ${
                                  adj.mode === mode
                                    ? 'bg-amber-600 text-white'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>

                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={adj.amount}
                            onChange={e => setAdj(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="Qty"
                            className={`${inputCls} py-0.5 text-xs w-20 text-center font-bold`}
                          />

                          {hasSub && (
                            <div className="flex items-center gap-0.5 p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => setAdj(prev => ({ ...prev, unit: 'base' }))}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  adj.unit === 'base' ? 'bg-amber-600 text-white' : 'text-slate-500'
                                }`}
                              >
                                {product.unit}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdj(prev => ({ ...prev, unit: 'sub' }))}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  adj.unit === 'sub' ? 'bg-amber-600 text-white' : 'text-slate-500'
                                }`}
                              >
                                {product.subUnit}
                              </button>
                            </div>
                          )}
                        </div>

                        <input
                          value={adj.reason}
                          onChange={e => setAdj(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Reason (e.g. damaged, counted on shelf)"
                          className={`${inputCls} py-1 text-xs`}
                        />

                        <div className="flex justify-end">
                          <button
                            onClick={() => applyAdjust(b.id)}
                            disabled={adjBusy || !adj.amount}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1 disabled:opacity-40"
                          >
                            {adjBusy ? <Loader2 size={12} className="animate-spin" /> : null} Apply Stock
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}