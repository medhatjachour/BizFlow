import { X, Loader2, Calendar, DollarSign, Tag, Store, CreditCard, Repeat, Briefcase, StickyNote } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { ExpenseForm, ExpenseRow } from '../types'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, RECURRENCES, catMeta } from '../constants'
import { hexToRgba, formatMoney } from '../utils'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  form: ExpenseForm
  patchForm: (p: Partial<ExpenseForm>) => void
  editing: ExpenseRow | null
  saving: boolean
  activeShift: any
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition'

export function ExpenseModal({
  open, onClose, onSubmit, form, patchForm, editing, saving, activeShift,
}: Props) {
  const { t } = useLanguage()
  if (!open) return null

  const amount = Number(form.amount) || 0
  const cat = catMeta(form.category)
  const CatIcon = cat.icon

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with live preview */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: hexToRgba(cat.color, 0.15) }}
            >
              <CatIcon size={20} style={{ color: cat.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Expense' : 'New Expense'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {form.description || 'Untitled expense'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={e => { e.preventDefault(); onSubmit() }}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Row 1: Date + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" icon={Calendar}>
              <input
                type="date"
                value={form.date}
                onChange={e => patchForm({ date: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Amount" icon={DollarSign} required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={e => patchForm({ amount: e.target.value })}
                  placeholder="0.00"
                  className={inputCls + ' pl-7'}
                  autoFocus
                />
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" icon={Tag} required>
            <input
              type="text"
              value={form.description}
              onChange={e => patchForm({ description: e.target.value })}
              placeholder="e.g. Espresso beans restock"
              className={inputCls}
            />
          </Field>

          {/* Vendor */}
          <Field label="Vendor" icon={Store}>
            <input
              type="text"
              value={form.vendor}
              onChange={e => patchForm({ vendor: e.target.value })}
              placeholder="e.g. Local Roastery (optional)"
              className={inputCls}
            />
          </Field>

          {/* Category — visual grid */}
          <Field label="Category" icon={Tag}>
            <div className="grid grid-cols-5 gap-2">
              {EXPENSE_CATEGORIES.map(c => {
                const Icon = c.icon
                const selected = form.category === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => patchForm({ category: c.value })}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-[10px] font-medium transition-all ${
                      selected
                        ? 'border-transparent'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                    }`}
                    style={selected ? {
                      backgroundColor: hexToRgba(c.color, 0.12),
                      color: c.color,
                    } : undefined}
                  >
                    <Icon size={18} />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Row 2: Payment + Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Payment Method" icon={CreditCard}>
              <select
                value={form.paymentMethod}
                onChange={e => patchForm({ paymentMethod: e.target.value })}
                className={inputCls}
              >
                {PAYMENT_METHODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Recurrence" icon={Repeat}>
              <select
                value={form.recurrence}
                onChange={e => patchForm({ recurrence: e.target.value })}
                className={inputCls}
              >
                {RECURRENCES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Shift */}
          <Field label="Shift" icon={Briefcase}>
            <select
              value={form.shiftId}
              onChange={e => patchForm({ shiftId: e.target.value })}
              className={inputCls}
            >
              <option value="">Unlinked</option>
              {activeShift?.id && (
                <option value={activeShift.id}>
                  Active Shift ({activeShift.cashier?.fullName ?? activeShift.cashier?.username ?? 'Open'})
                </option>
              )}
            </select>
          </Field>

          {/* Notes */}
          <Field label="Notes" icon={StickyNote}>
            <textarea
              value={form.notes}
              onChange={e => patchForm({ notes: e.target.value })}
              rows={2}
              placeholder="Optional notes..."
              className={inputCls + ' resize-none'}
            />
          </Field>
        </form>

        {/* Footer with live total */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Total</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {formatMoney(amount)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string
  icon: any
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
        <Icon size={13} className="text-slate-400" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
