import React, { useState } from 'react'
import { Boxes, X, Loader2, RefreshCw, TrendingDown, AlertCircle, AlertTriangle, Pencil, Trash2, Plus, Save } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useMaterialBatches } from '../hooks/useMaterialBatches'
import { formatDate } from '../utils'

import type { Material, Batch, BatchFormData } from '../types'
import { AdjustStockModal } from './AdjustStockModal'
import { LogLossModal } from './LogLossModal'
import { LogExpiryModal } from './LogExpiryModal'

interface Props {
  material: Material
  onClose: () => void
}

export const BatchManagementModal: React.FC<Props> = ({ material, onClose }) => {
  const { t } = useLanguage()
  const { batches, loading, saving, createBatch, updateBatch, deleteBatch, reload } = useMaterialBatches(material.id)

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [adjustBatch, setAdjustBatch] = useState<Batch | null>(null)
  const [logLossBatch, setLogLossBatch] = useState<Batch | null>(null)
  const [logExpiryBatch, setLogExpiryBatch] = useState<Batch | null>(null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs overflow-y-auto py-8 px-4 animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {t('manageBatches') || 'Lots & Batches Tracking'}
              </h3>
              <p className="text-xs text-slate-400">
                {material.name} • Total Stock:{' '}
                <span className="font-extrabold text-teal-600 dark:text-teal-400">
                  {material.quantity} {material.unit}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : batches.length === 0 && !adding ? (
            <p className="text-center text-xs text-slate-400 py-6 font-semibold">
              {t('noBatches') || 'No individual lots registered. Add one to track expiry dates & costs per batch.'}
            </p>
          ) : (
            batches.map((b) => {
              const exp = b.expiryDate ? new Date(b.expiryDate) : null
              const now = new Date()
              const soon = new Date()
              soon.setDate(now.getDate() + 30)
              const expSt = exp ? (exp < now ? 'expired' : exp <= soon ? 'soon' : 'ok') : 'none'

              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    !b.isActive
                      ? 'opacity-60 border-slate-200 dark:border-slate-800'
                      : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-2xs'
                  }`}
                >
                  {editingId === b.id ? (
                    <div className="p-3.5">
                      <BatchForm
                        initial={{
                          batchNumber: b.batchNumber ?? '',
                          quantity: String(b.quantity),
                          expiryDate: b.expiryDate ? b.expiryDate.slice(0, 10) : '',
                          costPerUnit: b.costPerUnit != null ? String(b.costPerUnit) : '',
                          supplier: b.supplier ?? '',
                          notes: b.notes ?? '',
                          isActive: b.isActive
                        }}
                        showActive
                        saving={saving}
                        onSave={async (vals) => {
                          await updateBatch(b.id, vals)
                          setEditingId(null)
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {b.batchNumber && (
                            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-200">
                              #{b.batchNumber}
                            </span>
                          )}
                          {expSt === 'expired' && (
                            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.2 rounded-full">
                              <AlertCircle className="h-3 w-3" /> Expired {formatDate(b.expiryDate)}
                            </span>
                          )}
                          {expSt === 'soon' && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.2 rounded-full">
                              <AlertTriangle className="h-3 w-3" /> Expires {formatDate(b.expiryDate)}
                            </span>
                          )}
                          {expSt === 'ok' && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Exp: {formatDate(b.expiryDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {b.quantity} {material.unit}
                          </span>
                          {b.supplier && <span>• {b.supplier}</span>}
                          {b.costPerUnit != null && <span>• ${b.costPerUnit}/{material.unit}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setAdjustBatch(b)}
                          title={t('clinicMaterialAdjustStock') || 'Adjust Stock'}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setLogLossBatch(b)}
                          title={t('logMaterialLoss') || 'Record Loss / Damage'}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <TrendingDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setLogExpiryBatch(b)}
                          title={t('logMaterialExpiry') || 'Record Expiry Write-Off'}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(b.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteBatch(b.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {adding && (
            <BatchForm
              saving={saving}
              onSave={async (vals) => {
                await createBatch(vals)
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <button
            onClick={() => setAdding(true)}
            disabled={adding}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addBatch') || 'Add Lot / Batch'}</span>
          </button>
        </div>
      </div>

      {adjustBatch && (
        <AdjustStockModal
          material={material}
          batch={adjustBatch}
          onClose={() => setAdjustBatch(null)}
          onSaved={() => {
            setAdjustBatch(null)
            reload()
          }}
        />
      )}
      {logLossBatch && (
        <LogLossModal
          material={material}
          batch={logLossBatch}
          onClose={() => setLogLossBatch(null)}
          onSaved={() => {
            setLogLossBatch(null)
            reload()
          }}
        />
      )}
      {logExpiryBatch && (
        <LogExpiryModal
          material={material}
          batch={logExpiryBatch}
          onClose={() => setLogExpiryBatch(null)}
          onSaved={() => {
            setLogExpiryBatch(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function BatchForm({
  initial,
  saving,
  onSave,
  onCancel
}: {
  initial?: Partial<BatchFormData>
  showActive?: boolean
  saving: boolean
  onSave: (v: BatchFormData) => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const [form, setForm] = useState<BatchFormData>({
    batchNumber: initial?.batchNumber ?? '',
    quantity: initial?.quantity ?? '',
    expiryDate: initial?.expiryDate ?? '',
    costPerUnit: initial?.costPerUnit ?? '',
    supplier: initial?.supplier ?? '',
    notes: initial?.notes ?? '',
    isActive: initial?.isActive ?? true
  })

  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1'

  return (
    <div className="space-y-3 p-4 rounded-2xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('materialBatchNumber') || 'Batch #'}</label>
          <input
            className={inputCls}
            value={form.batchNumber}
            onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))}
            placeholder="e.g. LOT-2026-X"
          />
        </div>
        <div>
          <label className={labelCls}>{t('materialQuantity') || 'Quantity'} *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={labelCls}>{t('materialExpiryDate') || 'Expiry Date'}</label>
          <input
            type="date"
            className={inputCls}
            value={form.expiryDate}
            onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls}>{t('materialCostPerUnit') || 'Cost / Unit ($)'}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={form.costPerUnit}
            onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.quantity}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 shadow-xs"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>{t('save') || 'Save Batch'}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
        >
          {t('cancel') || 'Cancel'}
        </button>
      </div>
    </div>
  )
}