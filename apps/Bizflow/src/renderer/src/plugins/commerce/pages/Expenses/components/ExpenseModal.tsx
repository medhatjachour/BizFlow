import React, { useEffect } from 'react'
import { X, Save, DollarSign, Calendar, Building, Hash } from 'lucide-react'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, RECURRENCE_OPTIONS } from '../constants'
import type { Expense, ExpenseFormData, PaymentMethod, RecurrenceType } from '../types'

interface ExpenseModalProps {
  editingExpense: Expense | null
  formData: ExpenseFormData
  setFormData: React.Dispatch<React.SetStateAction<ExpenseFormData>>
  onSave: () => void
  onClose: () => void
  t: (key: string) => string
}

export default function ExpenseModal({
  editingExpense,
  formData,
  setFormData,
  onSave,
  onClose,
  t,
}: ExpenseModalProps) {
  // ESC Hotkey Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingExpense
                ? t('editExpense') || 'Update Expense Record'
                : t('addExpense') || 'Record Business Expense'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Category Chip Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t('expenseCategory') || 'Expense Category'} *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = formData.category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, category: cat.id }))}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-semibold truncate w-full">
                      {t(cat.nameKey) || cat.id}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('amount') || 'Amount ($)'} *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                  placeholder="0.00"
                  className="w-full ps-9 pe-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('date') || 'Expense Date'} *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full ps-9 pe-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('description') || 'Description / Note'} *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Office electricity bill, store plumbing..."
              className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Vendor & Reference # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('vendor') || 'Vendor / Payee'}
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vendor: e.target.value }))}
                  placeholder="e.g. Landlord, Electric Company"
                  className="w-full ps-9 pe-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('referenceNumber') || 'Invoice / Ref #'}
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                  placeholder="INV-98210"
                  className="w-full ps-9 pe-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('paymentMethod') || 'Payment Method'}
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {t(pm.labelKey) || pm.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('recurrence') || 'Recurrence'}
              </label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData((prev) => ({ ...prev, recurrence: e.target.value as RecurrenceType }))}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white outline-none"
              >
                {RECURRENCE_OPTIONS.map((ro) => (
                  <option key={ro.id} value={ro.id}>
                    {t(ro.labelKey) || ro.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tax Deductible Checkbox */}
          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isTaxDeductible}
                onChange={(e) => setFormData((prev) => ({ ...prev, isTaxDeductible: e.target.checked }))}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('markAsTaxDeductible') || 'Mark as official Tax Deductible business expense'}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{editingExpense ? t('update') || 'Save Changes' : t('saveExpense') || 'Record Expense'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}