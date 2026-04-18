import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Loader2, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

function ExpensesHelp() {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.top, right: window.innerWidth - r.right }) } }}
      onMouseLeave={() => setPos(null)}>
      <Info size={13} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos && createPortal(
        <div style={{ position:'fixed', top: pos.top, right: pos.right, transform:'translateY(-100%) translateY(-8px)', zIndex:9999 }}
          className="w-60 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl">
          <span className="block font-semibold text-violet-400 mb-1.5">Expenses</span>
          <span className="block mb-0.5">Track clinic-specific costs: rent, supplies, medications, salaries etc.</span>
          <span className="block mb-0.5"><span className="text-blue-300">Pencil</span> — edit an existing expense record.</span>
          <span className="block"><span className="text-red-300">Trash</span> — permanently delete an expense record.</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>,
        document.body
      )}
    </span>
  )
}

type Period = 'today' | 'week' | 'month' | 'year'

const EXPENSE_CATEGORIES = [
  'rent', 'utilities', 'medical_supplies', 'medications', 'equipment',
  'maintenance', 'lab_fees', 'insurance', 'marketing', 'cleaning', 'salaries', 'other'
]

interface ExpenseForm {
  date: string
  category: string
  description: string
  amount: string
  vendor: string
  paymentMethod: string
  notes: string
}

const defaultForm = (): ExpenseForm => ({
  date:          new Date().toISOString().slice(0, 10),
  category:      'other',
  description:   '',
  amount:        '',
  vendor:        '',
  paymentMethod: '',
  notes:         ''
})

export default function VetExpensesTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const [period,   setPeriod]   = useState<Period>('month')
  const [expenses, setExpenses] = useState<any[]>([])
  const [summary,  setSummary]  = useState<any | null>(null)
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [page,     setPage]     = useState(0)
  const PAGE_SIZE = 50

  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting,   setIsDeleting]   = useState(false)
  const [form, setForm] = useState<ExpenseForm>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const currentPage = reset ? 0 : page
      if (reset) setPage(0)
      const [expResult, sumResult] = await Promise.all([
        window.api.vet?.expenses.getAll({ period, skip: currentPage * PAGE_SIZE, take: PAGE_SIZE }),
        window.api.vet?.expenses.summary(period)
      ])
      if (expResult) {
        setExpenses(reset || currentPage === 0 ? expResult.data : prev => [...prev, ...expResult.data])
        setTotal(expResult.total)
      }
      setSummary(sumResult ?? null)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [period, page])

  useEffect(() => { load(true) }, [period])

  const openEdit = (expense: any) => {
    setEditTarget(expense)
    setForm({
      date:          expense.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      category:      expense.category ?? 'other',
      description:   expense.description ?? '',
      amount:        expense.amount?.toString() ?? '',
      vendor:        expense.vendor ?? '',
      paymentMethod: expense.paymentMethod ?? '',
      notes:         expense.notes ?? ''
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) { setFormError('Description is required'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setFormError('Valid amount is required'); return }

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        date:          new Date(form.date + 'T00:00:00').toISOString(),
        category:      form.category,
        description:   form.description.trim(),
        amount:        parseFloat(form.amount),
        vendor:        form.vendor.trim() || undefined,
        paymentMethod: form.paymentMethod || undefined,
        notes:         form.notes.trim() || undefined
      }
      if (editTarget) {
        await window.api.vet?.expenses.update(editTarget.id, payload)
      } else {
        await window.api.vet?.expenses.create(payload)
      }
      setShowForm(false)
      setEditTarget(null)
      setForm(defaultForm())
      load(true)
      toast.success('Expense saved')
    } catch (err: any) {
      setFormError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await window.api.vet?.expenses.delete(deleteTarget.id)
      setDeleteTarget(null)
      load(true)
      toast.success('Expense deleted')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const setF = (k: keyof ExpenseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-6 space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['today', 'week', 'month', 'year'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${period === p ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {p === 'today' ? (t('vetFilterToday')||'Today') : p === 'week' ? (t('vetFilterWeek')||'Week') : p === 'month' ? (t('vetFilterMonth')||'Month') : (t('vetFilterYear')||'Year')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditTarget(null); setForm(defaultForm()); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg">
            <Plus className="h-4 w-4" /> {t('vetAddExpense')||'Add Expense'}
          </button>
          <ExpensesHelp />
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
                        { label: t('vetRevenue')||'Revenue',    value: summary.revenue,       icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400' },
            { label: t('vetExpenses')||'Expenses',   value: summary.totalExpenses, icon: TrendingDown, color: 'text-red-600 dark:text-red-400' },
            { label: t('vetNetIncome')||'Net Income', value: summary.netIncome,     icon: DollarSign,   color: summary.netIncome >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400' },
            { label: t('vetOutstanding')||'Outstanding',value: summary.outstanding, icon: DollarSign,   color: summary.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-bold ${color}`}>{(value ?? 0).toFixed(2)}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Expense list */}
      {loading && expenses.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="font-medium">{t('noExpenses')||'No expenses for this period'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{exp.description}</p>
                <p className="text-xs text-slate-400">{new Date(exp.date).toLocaleDateString()} · <span className="capitalize">{exp.category.replace('_', ' ')}</span>{exp.vendor ? ` · ${exp.vendor}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">{Number(exp.amount).toFixed(2)}</span>
                <button onClick={() => openEdit(exp)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(exp)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {expenses.length < total && (
            <div className="flex justify-center pt-4">
              <button onClick={() => { setPage(p => p + 1); load() }} disabled={loading}
                className="px-6 py-2 text-sm text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `${t('vetLoadMore')||'Load more'} (${total - expenses.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expense form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">{editTarget ? (t('vetEditExpense')||'Edit Expense') : (t('vetAddExpense')||'Add Expense')}</h2>
              <button onClick={() => { setShowForm(false); setEditTarget(null) }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('date')||'Date'} *</label>
                  <input type="date" value={form.date} onChange={setF('date')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('category')||'Category'}</label>
                  <select value={form.category} onChange={setF('category')} className={inputCls}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('description')||'Description'} *</label>
                  <input value={form.description} onChange={setF('description')} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('amount')||'Amount'} *</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={setF('amount')} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('paymentMethod')||'Payment Method'}</label>
                  <select value={form.paymentMethod} onChange={setF('paymentMethod')} className={inputCls}>
                    <option value="">—</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vendor')||'Vendor'}</label>
                  <input value={form.vendor} onChange={setF('vendor')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetNotes')||'Notes'}</label>
                  <input value={form.notes} onChange={setF('notes')} className={inputCls} />
                </div>
              </div>
              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditTarget(null) }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl">{t('cancel')||'Cancel'}</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (t('save')||'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="font-semibold text-slate-900 dark:text-white mb-4">{t('vetDeleteExpense')||'Delete Expense?'}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('cancel')||'Cancel'}</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (t('vetDeleteConfirm')||'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'
