import React, { useState, useEffect } from 'react'
import { Calendar, ChefHat, Clock, Hash, FileText, X, Loader2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { QTY_PRESETS } from '../constants'
import { Recipe, ScheduleFormData } from '../types'
import { getTodayStr, dateOffset } from '../utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ScheduleFormData) => Promise<void>
  recipes: Recipe[]
}

export const ScheduleFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, recipes }) => {
  const { t } = useLanguage()

  const DATE_CHIPS = [
    { label: 'Today', value: dateOffset(0) },
    { label: 'Tomorrow', value: dateOffset(1) },
    { label: 'In 2 days', value: dateOffset(2) },
    { label: 'Next week', value: dateOffset(7) },
  ]

  const [form, setForm] = useState<ScheduleFormData>({
    recipeId: '',
    scheduledDate: getTodayStr(),
    plannedQuantity: 1,
    notes: '',
  })

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setForm({
        recipeId: '',
        scheduledDate: getTodayStr(),
        plannedQuantity: 1,
        notes: '',
      })
      setFormError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const selectedRecipe = recipes.find(r => r.id === form.recipeId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.recipeId) {
      setFormError(t('bakerySelectRecipeError') || 'Please select a recipe.')
      return
    }
    if (!form.scheduledDate) {
      setFormError(t('bakeryPickDateError') || 'Please pick a scheduled date.')
      return
    }
    if (Number(form.plannedQuantity) < 1) {
      setFormError(t('bakeryMinQuantityError') || 'Quantity must be at least 1 batch.')
      return
    }

    setSaving(true)
    try {
      await onSave(form)
    } catch (err: any) {
      setFormError(err?.message || t('bakeryScheduleSaveFailed') || 'Failed to schedule run.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('bakeryAddSchedule') || 'Schedule Production Run'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Plan and assign upcoming bake batches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Recipe Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5" />
                  {t('bakeryRecipeName') || 'Recipe'} *
                </span>
              </label>
              <select
                value={form.recipeId}
                onChange={e => setForm(prev => ({ ...prev, recipeId: e.target.value }))}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">— Select recipe to bake —</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {selectedRecipe && (
                <div className="mt-2.5 flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {selectedRecipe.name}
                  </span>
                  {selectedRecipe.yieldQty && (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      Yields {selectedRecipe.yieldQty} {selectedRecipe.yieldUnit ?? 'pcs'} / batch
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('bakeryScheduledDate') || 'Scheduled Date'} *
                </span>
              </label>
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {DATE_CHIPS.map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, scheduledDate: chip.value }))}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      form.scheduledDate === chip.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={e => setForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                className={inputClass}
              />
            </div>

            {/* Planned Batches */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  {t('bakeryPlannedQty') || 'Planned Batches'} *
                </span>
              </label>

              <div className="flex gap-1.5 mb-2 flex-wrap">
                {QTY_PRESETS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, plannedQuantity: q }))}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      form.plannedQuantity === q
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                    }`}
                  >
                    {q} {q === 1 ? 'batch' : 'batches'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      plannedQuantity: Math.max(1, prev.plannedQuantity - 1),
                    }))
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-lg leading-none"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={form.plannedQuantity}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      plannedQuantity: Math.max(1, Number(e.target.value)),
                    }))
                  }
                  className={`${inputClass} text-center font-bold text-base`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      plannedQuantity: prev.plannedQuantity + 1,
                    }))
                  }
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-lg leading-none"
                >
                  +
                </button>
              </div>

              {selectedRecipe?.yieldQty && form.plannedQuantity > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  Total expected yield:{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {(form.plannedQuantity * selectedRecipe.yieldQty).toLocaleString()}{' '}
                    {selectedRecipe.yieldUnit ?? 'pcs'}
                  </strong>
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {t('bakeryNotesLabel') || 'Notes'} (Optional)
                </span>
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Special instructions, priority reminders, baker shifts…"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-4">
            {formError && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {t('bakeryCancelBtn') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving || !form.recipeId}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t('bakeryScheduleBtn') || 'Schedule Run'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}