import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Trash2, PencilLine, RefreshCw, Plus, Receipt, CalendarDays, Briefcase } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

type ExpenseRow = {
  id: string
  date: string
  category: string
  description: string
  amount: number
  vendor?: string | null
  paymentMethod: string
  recurrence: string
  shiftId?: string | null
  notes?: string | null
  shift?: { id: string; openedAt: string; closedAt?: string | null; cashier?: { username: string; fullName?: string | null } }
}

type Summary = {
  totalExpenses: number
  expenseCount: number
  averageExpense: number
  linkedToShifts: number
  unlinkedExpenses: number
  byCategory: Array<{ category: string; total: number }>
  byPaymentMethod: Array<{ paymentMethod: string; total: number }>
}

const EXPENSE_CATEGORIES = [
  'beans', 'milk', 'packaging', 'rent', 'utilities', 'maintenance', 'marketing', 'wages', 'delivery', 'other'
] as const

const PAYMENT_METHODS = ['cash', 'card', 'vodafone_cash', 'bank_transfer', 'other'] as const
const RECURRENCES = ['one_time', 'weekly', 'monthly', 'yearly'] as const

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateRange(period: 'today' | 'week' | 'month' | 'all') {
  if (period === 'all') return { startDate: undefined as string | undefined, endDate: undefined as string | undefined }
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (period === 'week') start.setDate(start.getDate() - 6)
  if (period === 'month') start.setDate(1)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

export default function ExpensesTab() {
  const toast = useToast()
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [paymentMethod, setPaymentMethod] = useState('all')
  const [shiftId, setShiftId] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ExpenseRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [activeShift, setActiveShift] = useState<any>(null)
  const [editing, setEditing] = useState<ExpenseRow | null>(null)
  const [form, setForm] = useState({
    date: fmtDate(new Date()),
    category: 'other',
    description: '',
    amount: '',
    vendor: '',
    paymentMethod: 'cash',
    recurrence: 'one_time',
    shiftId: '',
    notes: ''
  })

  const filters = useMemo(() => ({
    ...dateRange(period),
    category: category === 'all' ? undefined : category,
    paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
    shiftId: shiftId === 'all' ? undefined : shiftId,
    search: search.trim() || undefined,
    page,
    pageSize: 20
  }), [period, category, paymentMethod, shiftId, search, page])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum, shift] = await Promise.all([
        window.api.coffee.expenses.getAll(filters),
        window.api.coffee.expenses.getSummary(filters),
        window.api.coffee.shifts.getActive().catch(() => null)
      ])
      const items = list?.items ?? list?.data ?? []
      setRows(items)
      setSummary(sum)
      setActiveShift(shift)
      if (!editing && shift?.id && !form.shiftId) {
        setForm(prev => ({ ...prev, shiftId: shift.id }))
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [filters, editing, form.shiftId, toast])

  useEffect(() => { setPage(1) }, [period, category, paymentMethod, shiftId])
  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({
      date: fmtDate(new Date()),
      category: 'other',
      description: '',
      amount: '',
      vendor: '',
      paymentMethod: 'cash',
      recurrence: 'one_time',
      shiftId: activeShift?.id ?? '',
      notes: ''
    })
  }

  const openEdit = (expense: ExpenseRow) => {
    setEditing(expense)
    setForm({
      date: fmtDate(new Date(expense.date)),
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      vendor: expense.vendor ?? '',
      paymentMethod: expense.paymentMethod,
      recurrence: expense.recurrence,
      shiftId: expense.shiftId ?? '',
      notes: expense.notes ?? ''
    })
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        vendor: form.vendor || null,
        notes: form.notes || null,
        shiftId: form.shiftId || null
      }
      if (editing) await window.api.coffee.expenses.update(editing.id, payload)
      else await window.api.coffee.expenses.create(payload)
      toast.success(editing ? 'Expense updated' : 'Expense added')
      setEditing(null)
      setForm({
        date: fmtDate(new Date()),
        category: 'other',
        description: '',
        amount: '',
        vendor: '',
        paymentMethod: 'cash',
        recurrence: 'one_time',
        shiftId: activeShift?.id ?? '',
        notes: ''
      })
      load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save expense')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    try {
      await window.api.coffee.expenses.delete(id)
      toast.success('Expense deleted')
      load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete expense')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['today', 'week', 'month', 'all'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
            {p === 'all' ? 'All Time' : p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <option value="all">All Categories</option>
          {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <option value="all">All Payments</option>
          {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
        </select>
        <select value={shiftId} onChange={e => setShiftId(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <option value="all">All Shifts</option>
          <option value={activeShift?.id ?? ''} disabled={!activeShift?.id}>Active Shift {activeShift?.id ? `(${activeShift.cashier?.fullName ?? activeShift.cashier?.username ?? 'Open'})` : ''}</option>
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description or vendor" className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-56" />
        <button onClick={load} className="ml-auto p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={openCreate} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Expense
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs uppercase tracking-wide"><Receipt className="w-4 h-4 text-rose-500" /> Total</div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-slate-400">{summary.expenseCount} transactions</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs uppercase tracking-wide"><Briefcase className="w-4 h-4 text-amber-500" /> Linked</div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.linkedToShifts.toFixed(2)}</p>
            <p className="text-xs text-slate-400">linked to shifts</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs uppercase tracking-wide"><CalendarDays className="w-4 h-4 text-sky-500" /> Unlinked</div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.unlinkedExpenses.toFixed(2)}</p>
            <p className="text-xs text-slate-400">manual expenses</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs uppercase tracking-wide"><Receipt className="w-4 h-4 text-emerald-500" /> Average</div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.averageExpense.toFixed(2)}</p>
            <p className="text-xs text-slate-400">per transaction</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Expense History</h3>
            <span className="text-sm text-slate-500">{rows.length} items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-left px-4 py-3">Shift</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {rows.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-500">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{expense.description}</div>
                      <div className="text-xs text-slate-400">{expense.vendor || 'No vendor'} · {expense.paymentMethod}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 capitalize">{expense.category}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{expense.shift?.cashier?.fullName || expense.shift?.cashier?.username || 'Unlinked'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{expense.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => openEdit(expense)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600">
                          <PencilLine className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(expense.id)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No expenses found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 h-fit">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Plus className="w-4 h-4" />
            <p className="text-sm font-semibold">{editing ? 'Edit Expense' : 'New Expense'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-slate-500">
              <span>Date</span>
              <input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Amount</span>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </label>
            <label className="space-y-1 text-xs text-slate-500 col-span-2">
              <span>Description</span>
              <input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </label>
            <label className="space-y-1 text-xs text-slate-500 col-span-2">
              <span>Vendor</span>
              <input value={form.vendor} onChange={e => setForm(prev => ({ ...prev, vendor: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Category</span>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Payment</span>
              <select value={form.paymentMethod} onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Recurrence</span>
              <select value={form.recurrence} onChange={e => setForm(prev => ({ ...prev, recurrence: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {RECURRENCES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-500">
              <span>Shift</span>
              <select value={form.shiftId} onChange={e => setForm(prev => ({ ...prev, shiftId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                <option value="">Unlinked</option>
                {activeShift?.id && <option value={activeShift.id}>Active Shift</option>}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-500 col-span-2">
              <span>Notes</span>
              <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={openCreate} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Reset</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium">{editing ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}