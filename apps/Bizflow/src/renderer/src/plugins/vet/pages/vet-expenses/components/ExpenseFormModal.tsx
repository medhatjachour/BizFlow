import { useState, useEffect } from 'react'
import { X, Loader2, DollarSign, FileText, Building } from 'lucide-react'
import { ExpenseRecord, ExpenseFormData } from '../types'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants'
import DateField from '@renderer/components/DateField'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ExpenseFormModalProps {
  expense?: ExpenseRecord | null
  onSave: (payload: any) => Promise<void>
  onClose: () => void
}

const inputCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

const selectCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

export function ExpenseFormModal({ expense, onSave, onClose }: ExpenseFormModalProps) {
  const isEdit = Boolean(expense)
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [form, setForm] = useState<ExpenseFormData>({
    date: new Date().toISOString().slice(0, 10),
    category: 'medical_supplies',
    description: '',
    amount: '',
    vendor: '',
    paymentMethod: 'cash',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (expense) {
      setForm({
        date: expense.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        category: expense.category || 'other',
        description: expense.description || '',
        amount: expense.amount ? String(expense.amount) : '',
        vendor: expense.vendor || '',
        paymentMethod: expense.paymentMethod || 'cash',
        notes: expense.notes || ''
      })
    }
  }, [expense])

  const setField = (k: keyof ExpenseFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) {
      setError(isAr ? 'وصف أو بيان المصروف مطلوب' : 'Description is required')
      return
    }
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setError(isAr ? 'يرجى إدخال مبلغ صحيح' : 'A valid positive amount is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      // Robust ISO conversion for Prisma DateTime
      let isoDate: string
      try {
        const d = new Date(form.date)
        isoDate = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString()
      } catch {
        isoDate = new Date().toISOString()
      }

      const payload = {
        date: isoDate,
        category: form.category,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        vendor: form.vendor.trim() || undefined,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes.trim() || undefined
      }

      await onSave(payload)
    } catch (err: any) {
      setError(err.message ?? (isAr ? 'فشل حفظ المصروف' : 'Failed to save expense'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEdit ? (isAr ? 'تعديل المصروف' : 'Edit Expense') : (isAr ? 'تسجيل مصروف جديد' : 'Record New Expense')}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'إدارة النفقات والتكاليف التشغيلية للعيادة' : 'Clinic operational costs & invoices'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Date & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'تاريخ المصروف' : 'Expense Date'} *
                </label>
                <DateField
                  value={form.date}
                  onChange={(v) => setField('date')({ target: { value: v } } as any)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'فئة المصروف' : 'Category'} *
                </label>
                <select value={form.category} onChange={setField('category')} className={selectCls}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {isAr ? c.labelAr : c.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'بيان / وصف المصروف' : 'Description'} *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={form.description}
                  onChange={setField('description')}
                  placeholder={isAr ? 'مثال: شراء شاش ومطهرات طبية' : 'e.g. Surgical gloves & gauze restock'}
                  required
                  className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9`}
                />
              </div>
            </div>

            {/* Amount & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'المبلغ' : 'Amount ($)'} *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={setField('amount')}
                    placeholder="0.00"
                    required
                    className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9 font-black text-rose-600 dark:text-rose-400`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select value={form.paymentMethod} onChange={setField('paymentMethod')} className={selectCls}>
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {isAr ? pm.labelAr : pm.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'المورد / الشركة / الجهة المستفيدة' : 'Vendor / Supplier'}
              </label>
              <div className="relative">
                <Building className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={form.vendor}
                  onChange={setField('vendor')}
                  placeholder={isAr ? 'مثال: شركة الأهرام للأدوية' : 'e.g. Medical Supplies Co.'}
                  className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9`}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
              </label>
              <textarea
                value={form.notes}
                onChange={setField('notes')}
                rows={2}
                placeholder={isAr ? 'أي تفاصيل أو رقم فاتورة...' : 'Invoice number or additional details...'}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isAr ? 'جاري الحفظ...' : 'Saving…'}</span>
                </>
              ) : (
                <span>{isEdit ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'حفظ المصروف' : 'Save Expense')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}