import { useState } from 'react'
import { TrendingDown, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Material } from './materialsTab.types'
import { expiryStatus, formatDate } from './materialsTab.shared'

// ─── Log Material Loss Modal ──────────────────────────────────────────────────
export function LogMaterialLossModal({ material, onClose, onSaved }: { material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const estimatedCost = parseFloat(qty) > 0 ? parseFloat(qty) * material.costPerUnit : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!qty.trim() || isNaN(q) || q <= 0) { showToast('error', t('materialAdjustInvalid')); return }
    setSaving(true)
    try {
      const description = `${t('materialLossExpenseDesc')} — ${material.name} (${q} ${material.unit})`
      await window.api.clinic.expenses.create({
        date: new Date().toISOString(),
        category: 'material_loss',
        description,
        amount: estimatedCost > 0 ? estimatedCost : q,
        vendor: material.supplier ?? null,
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: notes.trim() || null,
      })
      // Also reduce stock
      await window.api.clinic.materials.adjustStock(material.id, -q)
      showToast('success', t('expenseAdded'))
      onSaved()
    } catch {
      showToast('error', t('failedSaveExpense'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('logMaterialLossTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('clinicMaterialCurrentStock')}: <span className="text-rose-600 dark:text-rose-400 font-bold">{material.quantity} {material.unit}</span></p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('clinicMaterialQuantity')} ({t('unit')})</label>
              <input
                type="number" min="0.01" step="0.01"
                className={inputCls}
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="e.g. 5"
                autoFocus
              />
              {estimatedCost > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {t('expenseAmount')}: <span className="font-semibold text-rose-600 dark:text-rose-400">{estimatedCost.toFixed(2)}</span> ({material.costPerUnit.toFixed(2)} × {qty})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('expenseNotes')}</label>
              <textarea className={`${inputCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('optional')} />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
                {t('logMaterialLoss')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Log Material Expiry Modal ────────────────────────────────────────────────
export function LogMaterialExpiryModal({ material, onClose, onSaved }: { material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [qty, setQty] = useState(() =>
    // default to full quantity if material is expired
    expiryStatus(material.expiryDate) === 'expired' ? String(material.quantity) : ''
  )
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const estimatedCost = parseFloat(qty) > 0 ? parseFloat(qty) * material.costPerUnit : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!qty.trim() || isNaN(q) || q <= 0) { showToast('error', t('materialAdjustInvalid')); return }
    setSaving(true)
    try {
      const description = `${t('materialExpiryExpenseDesc')} — ${material.name} (${q} ${material.unit})`
      await window.api.clinic.expenses.create({
        date: new Date().toISOString(),
        category: 'material_expiry',
        description,
        amount: estimatedCost > 0 ? estimatedCost : q,
        vendor: material.supplier ?? null,
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: notes.trim() || null,
      })
      await window.api.clinic.materials.adjustStock(material.id, -q)
      showToast('success', t('expenseAdded'))
      onSaved()
    } catch {
      showToast('error', t('failedSaveExpense'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('logMaterialExpiryTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('clinicMaterialCurrentStock')}: <span className="text-amber-600 dark:text-amber-400 font-bold">{material.quantity} {material.unit}</span></p>
            {material.expiryDate && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">{t('materialExpiryDate')}: {formatDate(material.expiryDate)}</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('logExpiredQtyLabel')} ({t('unit')})</label>
              <input
                type="number" min="0.01" step="0.01"
                className={inputCls}
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="e.g. 5"
                autoFocus
              />
              {estimatedCost > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {t('expenseAmount')}: <span className="font-semibold text-amber-600 dark:text-amber-400">{estimatedCost.toFixed(2)}</span> ({material.costPerUnit.toFixed(2)} × {qty})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('logExpiredNotes')}</label>
              <textarea className={`${inputCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('optional')} />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                {t('logMaterialExpiry')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Adjust Stock Modal ───────────────────────────────────────────────────────
export function AdjustStockModal({ material, onClose, onSaved }: { material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [delta, setDelta] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const d = parseFloat(delta)
    if (!delta.trim() || isNaN(d) || d === 0) { showToast('error', t('materialAdjustInvalid')); return }
    setSaving(true)
    try {
      await window.api.clinic.materials.adjustStock(material.id, d)
      showToast('success', t('updatedSuccessfully'))
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('clinicMaterialAdjustStock')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('clinicMaterialCurrentStock')}: <span className="text-teal-600 dark:text-teal-400 font-bold">{material.quantity} {material.unit}</span></p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('materialAdjustDelta')}</label>
              <input
                type="number" step="0.01"
                className={inputCls}
                value={delta}
                onChange={e => setDelta(e.target.value)}
                placeholder={t('materialAdjustPlaceholder')}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1.5">{t('materialAdjustHint')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t('save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
