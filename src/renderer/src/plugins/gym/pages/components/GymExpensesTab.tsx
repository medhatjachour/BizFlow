import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, DollarSign, TrendingDown } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

type Period = 'today' | 'week' | 'month' | 'year'

const GYM_EXPENSE_CATEGORIES = [
  'rent', 'equipment', 'salaries', 'utilities', 'marketing', 'maintenance', 'supplies', 'other'
]

interface ExpenseForm { date: string; category: string; description: string; amount: string; vendor: string; paymentMethod: string; notes: string }
const defaultForm = (): ExpenseForm => ({ date: new Date().toISOString().slice(0,10), category: 'other', description: '', amount: '', vendor: '', paymentMethod: 'cash', notes: '' })

export default function GymExpensesTab() {
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('month')
  const [expenses, setExpenses] = useState<any[]>([])
  const [summary, setSummary] = useState<any | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [form, setForm] = useState<ExpenseForm>(defaultForm())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (reset = false, explicitPage?: number) => {
    setLoading(true)
    try {
      const currentPage = reset ? 0 : (explicitPage ?? page)
      if (reset) setPage(0)
      const [res, sm] = await Promise.all([
        (window.api as any).gym?.expenses?.getAll({ period, skip: currentPage * PAGE_SIZE, take: PAGE_SIZE }),
        (window.api as any).gym?.expenses?.summary(period)
      ])
      setExpenses(Array.isArray(res) ? res : res?.data ?? [])
      setTotal(res?.total ?? 0)
      setSummary(sm)
    } catch (err: any) { toast.error(err.message ?? 'Failed to load') }
    finally { setLoading(false) }
  }, [period, page])

  useEffect(() => { load(true) }, [period])

  function openAdd() { setEditTarget(null); setForm(defaultForm()); setShowForm(true) }
  function openEdit(e: any) {
    setEditTarget(e)
    setForm({ date: new Date(e.date).toISOString().slice(0,10), category: e.category, description: e.description, amount: String(e.amount), vendor: e.vendor ?? '', paymentMethod: e.paymentMethod ?? 'cash', notes: e.notes ?? '' })
    setShowForm(true)
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    try {
      const payload = { date: form.date, category: form.category, description: form.description.trim(), amount: parseFloat(form.amount), vendor: form.vendor.trim() || null, paymentMethod: form.paymentMethod, notes: form.notes.trim() || null }
      if (editTarget) {
        await (window.api as any).gym?.expenses?.update(editTarget.id, payload)
        toast.success('Expense updated')
      } else {
        await (window.api as any).gym?.expenses?.create(payload)
        toast.success('Expense added')
      }
      setShowForm(false)
      load(true)
    } catch (err: any) { toast.error(err.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await (window.api as any).gym?.expenses?.delete(deleteTarget.id)
      toast.success('Deleted')
      load(true)
    } catch (err: any) { toast.error(err.message ?? 'Delete failed') }
    finally { setDeleteTarget(null) }
  }

  const hasMore = expenses.length + page * PAGE_SIZE < total
  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Expenses</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 gap-0.5">
            {(['today','week','month','year'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/40 p-3 text-center">
            <p className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1"><TrendingDown size={11} /> Total Expenses</p>
            <p className="text-lg font-bold text-red-600 tabular-nums">{summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Records</p>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{total}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/40 p-3 text-center">
            <p className="text-xs text-slate-500 mb-1 flex items-center justify-center gap-1"><DollarSign size={11} /> Avg / Record</p>
            <p className="text-lg font-bold text-orange-600 tabular-nums">{total > 0 ? (summary.totalExpenses / total).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</p>
          </div>
        </div>
      )}

      {loading && expenses.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Receipt size={36} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">No expenses this {period}</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/60">
                <tr>
                  {['Date','Category','Description','Vendor','Amount','Method',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <span className="capitalize text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{e.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{e.description}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{e.vendor ?? '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-red-600 dark:text-red-400 tabular-nums">{e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{e.paymentMethod}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(e)} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"><Pencil size={12} /></button>
                        <button onClick={() => setDeleteTarget(e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <button onClick={() => { const next = page + 1; setPage(next); load(false, next) }} disabled={loading}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{editTarget ? 'Edit Expense' : 'Add Expense'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {GYM_EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description *</label>
                <input className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this expense for?" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Amount *</label>
                  <input type="number" min="0" step="0.01" className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select className={inputCls} value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {['cash','card','transfer','other'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Vendor</label>
                <input className={inputCls} value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Vendor / supplier name" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium">
                  {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : editTarget ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Delete this expense?</h3>
            <p className="text-xs text-slate-500 mb-4">"{deleteTarget.description}" — {deleteTarget.amount.toLocaleString()}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Receipt(props: any) { return <TrendingDown {...props} /> }
