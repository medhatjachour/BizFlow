import React, { useState, useEffect } from 'react'
import { Receipt, X, Loader2, ChevronDown } from 'lucide-react'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, RECURRENCE_OPTIONS } from '../constants'
import { BakeryExpense, ExpenseFormData } from '../types'

interface Props {
  existing?: BakeryExpense | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: ExpenseFormData, id?: string) => Promise<void>
}

export const ExpenseFormModal: React.FC<Props> = ({ existing, isOpen, onClose, onSave }) => {
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState<ExpenseFormData>({
    date: new Date().toISOString().slice(0, 10),
    category: 'ingredients',
    description: '',
    amount: '',
    vendor: '',
    paymentMethod: 'cash',
    recurrence: 'one_time',
    notes: '',
  })

  useEffect(() => {
    if (existing) {
      setForm({
        date: new Date(existing.date).toISOString().slice(0, 10),
        category: existing.category,
        description: existing.description,
        amount: existing.amount.toString(),
        vendor: existing.vendor ?? '',
        paymentMethod: existing.paymentMethod,
        recurrence: existing.recurrence,
        notes: existing.notes ?? '',
      })
    } else {
      setForm({
        date: new Date().toISOString().slice(0, 10),
        category: 'ingredients',
        description: '',
        amount: '',
        vendor: '',
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: '',
      })
    }
    setErrors({})
  }, [existing, isOpen])

  if (!isOpen) return null

  const handleChange =
    (key: keyof ExpenseFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (errors[key]) {
        setErrors(prev => ({ ...prev, [key]: '' }))
      }
    }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.description.trim()) {
      nextErrors.description = 'Description is required'
    }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) {
      nextErrors.amount = 'Enter a valid amount > 0'
    }
    if (!form.date) {
      nextErrors.date = 'Date is required'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await onSave(form, existing?.id)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent transition-all shadow-sm'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                {existing ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record bakery operational expenditure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={handleChange('date')}
                  className={`${inputClass} ${errors.date ? 'border-rose-500 ring-rose-500' : ''}`}
                />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Category *
                </label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={handleChange('category')}
                    className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Description *
              </label>
              <input
                type="text"
                value={form.description}
                onChange={handleChange('description')}
                placeholder="e.g. Organic Flour 50kg Batch"
                className={`${inputClass} ${errors.description ? 'border-rose-500 ring-rose-500' : ''}`}
              />
              {errors.description && (
                <p className="text-xs text-rose-500 mt-1">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange('amount')}
                  placeholder="0.00"
                  className={`${inputClass} ${errors.amount ? 'border-rose-500 ring-rose-500' : ''}`}
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Vendor / Supplier
                </label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={handleChange('vendor')}
                  placeholder="e.g. Grain Mills Co."
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Payment Method
                </label>
                <div className="relative">
                  <select
                    value={form.paymentMethod}
                    onChange={handleChange('paymentMethod')}
                    className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Recurrence
                </label>
                <div className="relative">
                  <select
                    value={form.recurrence}
                    onChange={handleChange('recurrence')}
                    className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                  >
                    {RECURRENCE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Notes
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={handleChange('notes')}
                placeholder="Optional notes or invoice references…"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{existing ? 'Save Changes' : 'Add Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}