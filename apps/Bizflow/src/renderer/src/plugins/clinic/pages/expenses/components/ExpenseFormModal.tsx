import React from 'react'
import { X, Receipt, Loader2, Check } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useExpenseForm } from '../hooks/useExpenseForm'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, RECURRENCE_OPTIONS } from '../constants'
import type { Expense } from '../types'

interface Props {
  existing?: Expense | null
  onClose: () => void
  onSaved: () => void
}

export const ExpenseFormModal: React.FC<Props> = ({ existing, onClose, onSaved }) => {
  const { t, language } = useLanguage()
  const { form, saving, setField, save } = useExpenseForm(existing, onSaved)

  const inputCls =
    'w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500'
  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {existing ? t('editExpense') || 'Edit Expense' : t('addExpense') || 'Record Expense'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={save} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Date & Amount */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>{t('date') || 'Date'} *</label>
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>{t('expenseAmount') || 'Amount'} *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={inputCls}
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>{t('expenseCategory') || 'Category'} *</label>
            <select
              className={inputCls}
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {language === 'ar' ? c.labelAr : c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>{t('expenseDescription') || 'Description'} *</label>
            <input
              type="text"
              placeholder="e.g. Monthly Clinic Rent, Medical Gloves Box"
              className={inputCls}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              required
            />
          </div>

          {/* Vendor */}
          <div>
            <label className={labelCls}>{t('expenseVendor') || 'Vendor / Supplier'}</label>
            <input
              type="text"
              placeholder="e.g. City Pharmacy Supplies Co."
              className={inputCls}
              value={form.vendor}
              onChange={(e) => setField('vendor', e.target.value)}
            />
          </div>

          {/* Payment Method + Recurrence */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>{t('paymentMethod') || 'Payment Method'}</label>
              <select
                className={inputCls}
                value={form.paymentMethod}
                onChange={(e) => setField('paymentMethod', e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {language === 'ar' ? m.labelAr : m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('expenseRecurrence') || 'Recurrence'}</label>
              <select
                className={inputCls}
                value={form.recurrence}
                onChange={(e) => setField('recurrence', e.target.value)}
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {language === 'ar' ? r.labelAr : r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>{t('notes') || 'Additional Notes'}</label>
            <textarea
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder={t('optionalNotes') || 'Add receipt reference, tax invoice #, etc.'}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving || !form.description || !form.amount}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{existing ? t('editExpense') || 'Update Expense' : t('addExpense') || 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}