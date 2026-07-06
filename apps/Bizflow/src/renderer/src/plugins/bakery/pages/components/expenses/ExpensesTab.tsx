import { useState, useEffect, useCallback } from 'react'
import {
  Receipt, Plus, Pencil, Trash2, Loader2, TrendingDown,
  DollarSign, X, ChevronDown
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BakeryExpense {
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

// ─── Static metadata ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'ingredients',  label: 'Ingredients',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',     bar: '#f59e0b' },
  { value: 'equipment',    label: 'Equipment',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         bar: '#3b82f6' },
  { value: 'packaging',    label: 'Packaging',        color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', bar: '#8b5cf6' },
  { value: 'rent',         label: 'Rent',             color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',         bar: '#f43f5e' },
  { value: 'utilities',    label: 'Utilities',        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', bar: '#eab308' },
  { value: 'marketing',    label: 'Marketing',        color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',         bar: '#ec4899' },
  { value: 'maintenance',  label: 'Maintenance',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', bar: '#f97316' },
  { value: 'salaries',     label: 'Salaries',         color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     bar: '#22c55e' },
  { value: 'other',        label: 'Other',            color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',        bar: '#94a3b8' },
]

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'cheque']
const RECURRENCES     = ['one_time', 'weekly', 'monthly', 'yearly']

function catMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1]
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Expense Form Modal ───────────────────────────────────────────────────────
function ExpenseFormModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: BakeryExpense | null
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    date:          existing ? new Date(existing.date).toISOString().slice(0, 10) : today,
    category:      existing?.category      ?? 'ingredients',
    description:   existing?.description   ?? '',
    amount:        existing?.amount?.toString() ?? '',
    vendor:        existing?.vendor        ?? '',
    paymentMethod: existing?.paymentMethod ?? 'cash',
    recurrence:    existing?.recurrence    ?? 'one_time',
    notes:         existing?.notes         ?? '',
  })

  const patch = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.description.trim()) { showToast('error', 'Description is required'); return }
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { showToast('error', 'Enter a valid amount'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: amt,
        date:   new Date(form.date).toISOString(),
        vendor: form.vendor.trim() || null,
        notes:  form.notes.trim()  || null,
      }
      if (existing?.id) {
        await window.api.bakery.expenses.update(existing.id, payload)
        showToast('success', 'Expense updated')
      } else {
        await window.api.bakery.expenses.create(payload)
        showToast('success', 'Expense added')
      }
      onSaved()
    } catch {
      showToast('error', 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-shadow'

  const field = (label: string, child: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {child}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                {existing ? 'Edit Expense' : 'New Expense'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Bakery operating cost</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            {field('Date',
              <input type="date" value={form.date} onChange={patch('date')} className={input} />
            )}
            {field('Category',
              <div className="relative">
                <select value={form.category} onChange={patch('category')} className={input + ' appearance-none pr-8'}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {field('Description *',
            <input value={form.description} onChange={patch('description')} placeholder="e.g. Flour purchase" className={input} />
          )}

          <div className="grid grid-cols-2 gap-4">
            {field('Amount *',
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={patch('amount')} placeholder="0.00" className={input} />
            )}
            {field('Vendor',
              <input value={form.vendor} onChange={patch('vendor')} placeholder="Supplier name" className={input} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Payment Method',
              <div className="relative">
                <select value={form.paymentMethod} onChange={patch('paymentMethod')} className={input + ' appearance-none pr-8 capitalize'}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace('_', ' ')}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            )}
            {field('Recurrence',
              <div className="relative">
                <select value={form.recurrence} onChange={patch('recurrence')} className={input + ' appearance-none pr-8'}>
                  {RECURRENCES.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {field('Notes',
            <textarea rows={2} value={form.notes} onChange={patch('notes')} placeholder="Optional notes…" className={input + ' resize-none'} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] rounded-xl transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {existing ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Date range helper ────────────────────────────────────────────────────────
type Range = '7days' | '30days' | '90days' | 'all'

function buildBounds(range: Range) {
  const end = new Date(); end.setHours(23, 59, 59, 999)
  const start = new Date()
  if (range === '7days')  start.setDate(start.getDate() - 7)
  else if (range === '30days') start.setDate(start.getDate() - 30)
  else if (range === '90days') start.setDate(start.getDate() - 90)
  else start.setFullYear(2000, 0, 1)
  start.setHours(0, 0, 0, 0)
  return { start: start.toISOString(), end: end.toISOString() }
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function BakeryExpensesTab() {
  const { showToast } = useToast()
  useLanguage()

  const [expenses, setExpenses]   = useState<BakeryExpense[]>([])
  const [summary, setSummary]     = useState<{ totalAmount: number; byCategory: any[] } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [range, setRange]         = useState<Range>('30days')
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch]       = useState('')
  const [editing, setEditing]     = useState<BakeryExpense | null | undefined>(undefined)
  // undefined = modal closed, null = new, BakeryExpense = edit

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = buildBounds(range)
      const opts = { startDate: start, endDate: end, ...(catFilter ? { category: catFilter } : {}), pageSize: 200 }
      const [res, sum] = await Promise.all([
        window.api.bakery.expenses.getAll(opts),
        window.api.bakery.expenses.getSummary({ startDate: start, endDate: end }),
      ])
      setExpenses(res.data)
      setSummary(sum)
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [range, catFilter, showToast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    try {
      await window.api.bakery.expenses.delete(id)
      showToast('success', 'Expense deleted')
      load()
    } catch {
      showToast('error', 'Failed to delete expense')
    }
  }

  const visible = expenses.filter(e =>
    !search || e.description.toLowerCase().includes(search.toLowerCase()) ||
    (e.vendor ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalVisible = visible.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total ({range.replace('days', 'd')})</p>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">${fmt(summary?.totalAmount ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Entries</p>
            <Receipt className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{expenses.length}</p>
        </div>
        {(summary?.byCategory ?? []).slice(0, 2).map((c: any) => (
          <div key={c.category} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{catMeta(c.category).label}</p>
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">${fmt(c._sum?.amount ?? 0)}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown bar */}
      {summary && summary.totalAmount > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Breakdown by category</p>
          <div className="space-y-2">
            {(summary.byCategory ?? []).map((c: any) => {
              const pct = summary.totalAmount > 0 ? (c._sum.amount / summary.totalAmount) * 100 : 0
              const meta = catMeta(c.category)
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${meta.color} min-w-[80px]`}>{meta.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.bar }} />
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 shrink-0 w-20 text-right">${fmt(c._sum.amount)}</span>
                  <span className="text-xs text-slate-400 shrink-0 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search description or vendor…"
          className="flex-1 min-w-48 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={range}
          onChange={e => setRange(e.target.value as Range)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-2 px-4 py-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Expense Records</h3>
          <span className="text-xs text-slate-500">{visible.length} entries · ${fmt(totalVisible)}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Receipt className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No expenses found</p>
            <p className="text-xs mt-1">Add your first bakery expense above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {visible.map(exp => {
                  const meta = catMeta(exp.category)
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(exp.date)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-800 dark:text-white font-medium max-w-48 truncate">{exp.description}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{exp.vendor ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 capitalize">{exp.paymentMethod.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        −${fmt(exp.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setEditing(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      {editing !== undefined && (
        <ExpenseFormModal
          existing={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); load() }}
        />
      )}
    </div>
  )
}
