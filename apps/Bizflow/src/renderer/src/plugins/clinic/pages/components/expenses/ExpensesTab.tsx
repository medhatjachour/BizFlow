import { useState, useEffect, useCallback } from 'react'
import {
  Receipt, Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown,
  AlertCircle, Check, X, ChevronDown
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

// ─── Data shapes ──────────────────────────────────────────────────────────────
interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  vendor?: string | null
  paymentMethod: string
  recurrence: string
  notes?: string | null
}

interface Summary {
  revenue: number
  totalExpenses: number
  totalSalaries: number
  netIncome: number
  outstanding: number
  byCategory: { category: string; total: number }[]
}

// ─── Static metadata ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'rent',             label: 'Rent',             labelAr: 'الإيجار' },
  { value: 'utilities',        label: 'Utilities',        labelAr: 'المرافق' },
  { value: 'medical_supplies', label: 'Medical Supplies', labelAr: 'مستلزمات طبية' },
  { value: 'medications',      label: 'Medications',      labelAr: 'أدوية' },
  { value: 'equipment',        label: 'Equipment',        labelAr: 'معدات' },
  { value: 'maintenance',      label: 'Maintenance',      labelAr: 'صيانة' },
  { value: 'lab_fees',         label: 'Lab Fees',         labelAr: 'رسوم مختبر' },
  { value: 'insurance',        label: 'Insurance',        labelAr: 'تأمين' },
  { value: 'marketing',        label: 'Marketing',        labelAr: 'تسويق' },
  { value: 'cleaning',         label: 'Cleaning',         labelAr: 'تنظيف' },
  { value: 'salaries',         label: 'Salaries',         labelAr: 'رواتب' },
  { value: 'other',            label: 'Other',            labelAr: 'أخرى' },
]

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Cash',     labelAr: 'نقداً' },
  { value: 'card',     label: 'Card',     labelAr: 'بطاقة' },
  { value: 'transfer', label: 'Transfer', labelAr: 'تحويل' },
  { value: 'cheque',   label: 'Cheque',   labelAr: 'شيك' },
]

const RECURRENCES = [
  { value: 'one_time', label: 'One Time', labelAr: 'مرة واحدة' },
  { value: 'weekly',   label: 'Weekly',   labelAr: 'أسبوعي' },
  { value: 'monthly',  label: 'Monthly',  labelAr: 'شهري' },
  { value: 'yearly',   label: 'Yearly',   labelAr: 'سنوي' },
]

const CATEGORY_BADGE: Record<string, string> = {
  rent:             'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  utilities:        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  medical_supplies: 'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400',
  medications:      'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  equipment:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  maintenance:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  lab_fees:         'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/30   dark:text-cyan-400',
  insurance:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  marketing:        'bg-pink-100   text-pink-700   dark:bg-pink-900/30   dark:text-pink-400',
  cleaning:         'bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400',
  salaries:         'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  other:            'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-300',
}

const CATEGORY_BAR_COLOR: Record<string, string> = {
  rent:             '#8b5cf6',
  utilities:        '#eab308',
  medical_supplies: '#0d9488',
  medications:      '#3b82f6',
  equipment:        '#6366f1',
  maintenance:      '#f97316',
  lab_fees:         '#06b6d4',
  insurance:        '#10b981',
  marketing:        '#ec4899',
  cleaning:         '#0ea5e9',
  salaries:         '#f59e0b',
  other:            '#94a3b8',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCategoryLabel(cat: string, language: string): string {
  const found = CATEGORIES.find((c) => c.value === cat)
  if (!found) return cat.replace(/_/g, ' ')
  return language === 'ar' ? found.labelAr : found.label
}

function getPaymentMethodLabel(pm: string, language: string): string {
  const found = PAYMENT_METHODS.find((m) => m.value === pm)
  if (!found) return pm
  return language === 'ar' ? found.labelAr : found.label
}

function getRecurrenceLabel(rec: string, language: string): string {
  const found = RECURRENCES.find((r) => r.value === rec)
  if (!found) return rec
  return language === 'ar' ? found.labelAr : found.label
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Expense Form Modal ───────────────────────────────────────────────────────
interface ExpenseFormModalProps {
  existing?: Expense | null
  onClose: () => void
  onSaved: () => void
}

function ExpenseFormModal({ existing, onClose, onSaved }: ExpenseFormModalProps) {
  const { t, language } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    date:          existing ? new Date(existing.date).toISOString().slice(0, 10) : today,
    category:      existing?.category      ?? 'medical_supplies',
    description:   existing?.description   ?? '',
    amount:        existing?.amount?.toString() ?? '',
    vendor:        existing?.vendor        ?? '',
    paymentMethod: existing?.paymentMethod ?? 'cash',
    recurrence:    existing?.recurrence    ?? 'one_time',
    notes:         existing?.notes         ?? '',
  })

  const patch = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.description.trim()) { showToast('error', t('expenseDescRequired')); return }
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { showToast('error', t('expenseAmountRequired')); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: amt,
        date: new Date(form.date).toISOString(),
        vendor: form.vendor.trim() || null,
        notes:  form.notes.trim()  || null,
      }
      if (existing?.id) {
        await (window as any).api.clinic.expenses.update(existing.id, payload)
        showToast('success', t('updatedSuccessfully'))
      } else {
        await (window as any).api.clinic.expenses.create(payload)
        showToast('success', t('createdSuccessfully'))
      }
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-shadow'

  const field = (label: string, child: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {child}
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {existing ? t('editExpense') : t('addExpense')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-4">
            {field(t('date'), (
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={patch('date')}
              />
            ))}
            {field(t('expenseAmount'), (
              <input
                type="number"
                className={inputCls}
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={patch('amount')}
              />
            ))}
          </div>

          {/* Category */}
          {field(t('expenseCategory'), (
            <select className={inputCls} value={form.category} onChange={patch('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {language === 'ar' ? c.labelAr : c.label}
                </option>
              ))}
            </select>
          ))}

          {/* Description */}
          {field(t('expenseDescription'), (
            <input
              type="text"
              className={inputCls}
              placeholder={t('optionalField')}
              value={form.description}
              onChange={patch('description')}
            />
          ))}

          {/* Vendor */}
          {field(t('expenseVendor'), (
            <input
              type="text"
              className={inputCls}
              placeholder={t('optionalField')}
              value={form.vendor}
              onChange={patch('vendor')}
            />
          ))}

          {/* Payment Method + Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            {field(t('paymentMethod'), (
              <select className={inputCls} value={form.paymentMethod} onChange={patch('paymentMethod')}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {language === 'ar' ? m.labelAr : m.label}
                  </option>
                ))}
              </select>
            ))}
            {field(t('expenseRecurrence'), (
              <select className={inputCls} value={form.recurrence} onChange={patch('recurrence')}>
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {language === 'ar' ? r.labelAr : r.label}
                  </option>
                ))}
              </select>
            ))}
          </div>

          {/* Notes */}
          {field(t('notes'), (
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder={t('optionalNotes')}
              value={form.notes}
              onChange={patch('notes')}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 px-6 pb-5 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.description || !form.amount}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {existing ? t('editExpense') : t('addExpense')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('confirmDelete')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t('cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  positive,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
  sub?: string
  positive?: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-start gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-xl font-bold truncate ${positive === undefined ? 'text-slate-900 dark:text-white' : positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function ExpensesTab() {
  const { t, language } = useLanguage()
  const { showToast } = useToast()

  const PERIODS = [
    { key: 'today',  label: t('today') },
    { key: 'week',   label: t('thisWeek') },
    { key: 'month',  label: t('thisMonth') },
    { key: 'year',   label: t('year') ?? 'Year' },
  ]

  const [period, setPeriod]     = useState('month')
  const [category, setCategory] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null)
  const [catOpen, setCatOpen]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [expData, sumData] = await Promise.all([
        (window as any).api.clinic.expenses.getAll({ period, category: category || undefined }),
        (window as any).api.clinic.expenses.summary(period),
      ])
      setExpenses(expData ?? [])
      setSummary(sumData)
    } catch {
      showToast('error', t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [period, category, showToast, t])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await (window as any).api.clinic.expenses.delete(deleteItem.id)
      showToast('success', t('deletedSuccessfully'))
      setDeleteItem(null)
      load()
    } catch {
      showToast('error', t('errorDeletingRecord'))
    }
  }

  const byCategory = summary?.byCategory ?? []
  const maxCat = Math.max(...byCategory.map((c) => c.total), 1)

  const netPositive = (summary?.netIncome ?? 0) >= 0

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Period pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Category filter */}
          <div className="relative">
            <button
              onClick={() => setCatOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              {category
                ? getCategoryLabel(category, language)
                : (language === 'ar' ? 'كل الفئات' : 'All Categories')}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {catOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => { setCategory(''); setCatOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${!category ? 'font-semibold text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {language === 'ar' ? 'كل الفئات' : 'All Categories'}
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setCategory(c.value); setCatOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${category === c.value ? 'font-semibold text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    {language === 'ar' ? c.labelAr : c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add expense */}
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-red-500/20"
          >
            <Plus className="h-4 w-4" />
            {t('addExpense')}
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('revenue')}
          value={`${fmt(summary?.revenue ?? 0)}`}
          icon={TrendingUp}
          color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
        />
        <KpiCard
          label={t('totalExpenses')}
          value={`${fmt(summary?.totalExpenses ?? 0)}`}
          icon={Receipt}
          color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        />
        <KpiCard
          label={t('netIncome')}
          value={`${fmt(summary?.netIncome ?? 0)}`}
          icon={netPositive ? TrendingUp : TrendingDown}
          color={netPositive
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
          positive={netPositive}
        />
        <KpiCard
          label={t('outstanding')}
          value={`${fmt(summary?.outstanding ?? 0)}`}
          icon={AlertCircle}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* ── Category breakdown ── */}
      {byCategory.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            {t('expenseCategory')} {language === 'ar' ? 'حسب الفئة' : 'Breakdown'}
          </h3>
          <div className="space-y-3">
            {byCategory.map(({ category: cat, total }) => (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${CATEGORY_BADGE[cat] ?? CATEGORY_BADGE.other}`}>
                    {getCategoryLabel(cat, language)}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {fmt(total)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(total / maxCat) * 100}%`,
                      background: CATEGORY_BAR_COLOR[cat] ?? CATEGORY_BAR_COLOR.other,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expense list ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Receipt className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">{t('noExpensesFound')}</p>
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> {t('addExpense')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            <span>{t('date')}</span>
            <span>{t('expenseCategory')}</span>
            <span>{t('expenseDescription')}</span>
            <span>{t('paymentMethod')}</span>
            <span className="text-right">{t('expenseAmount')}</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
              >
                {/* Date */}
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(exp.date)}
                </span>

                {/* Category */}
                <span className={`inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-md ${CATEGORY_BADGE[exp.category] ?? CATEGORY_BADGE.other}`}>
                  {getCategoryLabel(exp.category, language)}
                </span>

                {/* Description + vendor + recurrence */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {exp.vendor && (
                      <span className="text-xs text-slate-400 truncate">{exp.vendor}</span>
                    )}
                    {exp.recurrence !== 'one_time' && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">
                        {getRecurrenceLabel(exp.recurrence, language)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment method */}
                <span className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                  {getPaymentMethodLabel(exp.paymentMethod, language)}
                </span>

                {/* Amount */}
                <span className="text-sm font-semibold text-red-600 dark:text-red-400 text-right tabular-nums">
                  {fmt(exp.amount)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditItem(exp); setShowForm(true) }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title={t('edit')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteItem(exp)}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer total */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">{expenses.length} {language === 'ar' ? 'سجل' : 'records'}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{t('totalExpenses')}:</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
                {fmt(expenses.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showForm && (
        <ExpenseFormModal
          existing={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); load() }}
        />
      )}
      {deleteItem && (
        <DeleteConfirmModal
          onCancel={() => setDeleteItem(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
