import { X, Save, Building2, Zap, Package, CreditCard, Briefcase, ShoppingBag, Wrench, Megaphone, MoreHorizontal } from 'lucide-react'
import { EXPENSE_CATEGORIES } from '../hooks/useExpenses'
import type { Expense, ExpenseCategory, ExpenseFormData } from '../types'

const ICON_MAP: Record<string, React.ElementType> = {
  rent:        Building2,
  utilities:   Zap,
  supplies:    Package,
  inventory:   ShoppingBag,
  marketing:   Megaphone,
  maintenance: Wrench,
  fees:        CreditCard,
  insurance:   Briefcase,
  other:       MoreHorizontal,
}

interface Props {
  editingExpense: Expense | null
  formData: ExpenseFormData
  setFormData: (v: ExpenseFormData) => void
  onSave: () => void
  onClose: () => void
  t: (key: string) => string
}

export default function ExpenseModal({ editingExpense, formData, setFormData, onSave, onClose, t }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {editingExpense ? `${t('edit')} ${t('expenses')}` : `${t('add')} ${t('expenses')}`}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Category grid */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('category')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const Icon = ICON_MAP[cat.id] ?? MoreHorizontal
                const active = formData.category === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFormData({ ...formData, category: cat.id as ExpenseCategory })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon size={20} className="mx-auto mb-1" />
                    <p className="text-xs font-medium text-center truncate">{t(cat.nameKey).split(' ')[0]}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('amount')} ($)
            </label>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
              min="0"
              step="1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('description')}
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t('expenseDetails')}
              rows={3}
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('vendor')} <span className="text-slate-400 font-normal text-xs">({t('optional')})</span>
            </label>
            <input
              type="text"
              value={formData.vendor}
              onChange={e => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t('vendorPlaceholder') || 'e.g. Landlord, Utility Co...'}
            />
          </div>

          {/* Date + Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('date')}</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('paymentMethod')}</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('recurrence')}</label>
            <select
              value={formData.recurrence}
              onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="one_time">One Time</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('notes')} <span className="text-slate-400 font-normal text-xs">({t('optional')})</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={2}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Save size={18} />
            {editingExpense ? `${t('edit')} ${t('expenses')}` : `${t('add')} ${t('expenses')}`}
          </button>
        </div>
      </div>
    </div>
  )
}
