/**
 * ClinicExpensesPanel
 *
 * Self-contained panel for managing clinic-specific operating expenses
 * (medical supplies, lab fees, rent, utilities, etc.).
 *
 * Rendered as a section inside the kernel Expenses page so clinic costs are
 * visible alongside general business expenses — but clearly labeled as
 * clinic-exclusive data stored in the clinic plugin schema.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Loader2, X, Receipt, CheckCircle2, Pencil, Trash2,
  Stethoscope, RefreshCcw,
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'

// ─── Constants ────────────────────────────────────────────────────────────────

type TFn = (key: string) => string

function getExpenseCategories(t: TFn) {
  return [
    { value: 'rent',             label: t('catRent'),            badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    { value: 'utilities',        label: t('catUtilities'),       badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    { value: 'medical_supplies', label: t('catMedicalSupplies'), badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'medications',      label: t('catMedications'),     badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
    { value: 'equipment',        label: t('catEquipment'),       badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { value: 'maintenance',      label: t('catMaintenance'),     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'lab_fees',         label: t('catLabFees'),         badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    { value: 'insurance',        label: t('catInsurance'),       badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'marketing',        label: t('catMarketing'),       badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
    { value: 'cleaning',         label: t('catCleaning'),        badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
    { value: 'salaries',         label: t('catSalaries'),        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    { value: 'material_loss',    label: t('catMaterialLoss'),    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    { value: 'material_expiry',  label: t('catMaterialExpiry'),  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'other',            label: t('catOther'),           badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
  ]
}

const INP = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function getCat(val: string, t: TFn) {
  return getExpenseCategories(t).find(c => c.value === val) ?? { label: val, badge: 'bg-slate-100 text-slate-600' }
}

function getPaymentLabel(method: string, t: TFn): string {
  const map: Record<string, string> = {
    cash: t('paymentCash'), card: t('paymentCard'),
    transfer: t('paymentTransfer'), cheque: t('paymentCheque'),
  }
  return map[method] ?? method
}

function getRecurrenceLabel(rec: string, t: TFn): string {
  const map: Record<string, string> = {
    one_time: t('recurrenceOneTime'), weekly: t('recurrenceWeekly'),
    monthly: t('recurrenceMonthly'), yearly: t('recurrenceYearly'),
  }
  return map[rec] ?? rec
}

const MATERIAL_CATS = new Set(['material_loss', 'material_expiry'])

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string; date: string; category: string; description: string
  amount: number; vendor?: string | null; paymentMethod: string
  recurrence: string; notes?: string | null
}

// ─── ExpenseFormModal ─────────────────────────────────────────────────────────

function ExpenseFormModal({ expense, prefill, onClose, onSaved }: {
  expense?: Expense | null
  prefill?: { category?: string; description?: string; amount?: string }
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    date:          expense ? new Date(expense.date).toISOString().slice(0, 10) : today,
    category:      expense?.category      ?? prefill?.category ?? 'medical_supplies',
    description:   expense?.description   ?? prefill?.description ?? '',
    amount:        expense?.amount?.toString() ?? prefill?.amount ?? '',
    vendor:        expense?.vendor         ?? '',
    paymentMethod: expense?.paymentMethod  ?? 'cash',
    recurrence:    expense?.recurrence     ?? 'one_time',
    notes:         expense?.notes          ?? '',
  })
  const up = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  const categories = getExpenseCategories(t)

  async function save() {
    if (!f.description.trim() || !f.amount) return showToast('error', t('descAmountRequired'))
    const amount = parseFloat(f.amount)
    if (isNaN(amount) || amount <= 0) return showToast('error', t('amountMustBePositive'))
    setSaving(true)
    try {
      const payload = {
        date: new Date(f.date).toISOString(), category: f.category,
        description: f.description.trim(), amount,
        vendor: f.vendor.trim() || null, paymentMethod: f.paymentMethod,
        recurrence: f.recurrence, notes: f.notes.trim() || null,
      }
      if (expense) {
        await window.api.clinic.expenses.update(expense.id, payload)
        showToast('success', t('expenseUpdated'))
      } else {
        await window.api.clinic.expenses.create(payload)
        showToast('success', t('expenseAdded'))
      }
      onSaved()
    } catch { showToast('error', t('failedSaveExpense')) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {expense ? t('editExpense') : t('newClinicExpenseTitle')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('clinicOperatingCost')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expenseDate')}</label>
              <input type="date" value={f.date} onChange={e => up('date', e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expenseCategory')}</label>
              <select value={f.category} onChange={e => up('category', e.target.value)} className={INP}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expenseDesc')} *</label>
            <input type="text" value={f.description} onChange={e => up('description', e.target.value)} placeholder={t('expenseDescPlaceholder')} className={INP} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expenseAmount')} *</label>
              <input type="number" min="0" step="0.01" value={f.amount} onChange={e => up('amount', e.target.value)} placeholder="0.00" className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expensePayment')}</label>
              <select value={f.paymentMethod} onChange={e => up('paymentMethod', e.target.value)} className={INP}>
                <option value="cash">{t('paymentCash')}</option>
                <option value="card">{t('paymentCard')}</option>
                <option value="transfer">{t('paymentTransfer')}</option>
                <option value="cheque">{t('paymentCheque')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expenseVendorSupplier')}</label>
              <input type="text" value={f.vendor} onChange={e => up('vendor', e.target.value)} placeholder={t('optional')} className={INP} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expenseRecurrence')}</label>
              <select value={f.recurrence} onChange={e => up('recurrence', e.target.value)} className={INP}>
                <option value="one_time">{t('recurrenceOneTime')}</option>
                <option value="weekly">{t('recurrenceWeekly')}</option>
                <option value="monthly">{t('recurrenceMonthly')}</option>
                <option value="yearly">{t('recurrenceYearly')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('expenseNotes')}</label>
            <textarea value={f.notes} onChange={e => up('notes', e.target.value)} rows={2} placeholder={t('optional')} className={INP + ' resize-none'} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">{t('cancel')}</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-teal-500/20">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {expense ? t('saveChanges') : t('addExpense')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ClinicExpensesPanel ──────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'year'

export default function ClinicExpensesPanel() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const PERIOD_LABELS: Record<Period, string> = {
    today: t('periodToday'), week: t('periodWeek'), month: t('periodMonth'), year: t('periodYear'),
  }

  const [expenses,    setExpenses]    = useState<Expense[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editExpense, setEditExpense] = useState<Expense | null | undefined>(undefined)
  const [prefillData, setPrefillData] = useState<{ category?: string; description?: string; amount?: string } | undefined>(undefined)
  const [period,      setPeriod]      = useState<Period>('month')
  const [catFilter,   setCatFilter]   = useState<string>('all')

  const categories = getExpenseCategories(t)

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.clinic.expenses.getAll({ period, category: catFilter === 'all' ? undefined : catFilter })
      setExpenses(data)
    } catch (e) {
      logger.error('ClinicExpensesPanel: loadExpenses failed', e)
      showToast('error', t('failedLoadExpenses'))
    } finally { setLoading(false) }
  }, [period, catFilter, showToast, t])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  async function deleteExpense(id: string) {
    if (!confirm(t('confirmDeleteExpense'))) return
    try { await window.api.clinic.expenses.delete(id); showToast('success', t('expenseDeleted')); loadExpenses() }
    catch { showToast('error', t('failedDeleteClinicExpense')) }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-4">

      {/* ── Section header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/40">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex-shrink-0">
          <Stethoscope size={18} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('clinicExpensesTitle')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('clinicExpensesDesc')}</p>
        </div>
        <span className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-teal-600 text-white font-bold shadow-sm">
          {t('clinicExclusive')}
        </span>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* period selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 gap-0.5">
          {(['today','week','month','year'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >{PERIOD_LABELS[p]}</button>
          ))}
        </div>

        {/* category filter */}
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        >
          <option value="all">{t('allCategories')}</option>
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <div className="flex-1" />

        <button
          onClick={loadExpenses}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title={t('followUpRefreshBtn')}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => { setPrefillData(undefined); setEditExpense(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-teal-500/25"
        >
          <Plus className="h-4 w-4" />{t('newExpense')}
        </button>
      </div>

      {/* ── Total badge ──────────────────────────────────────────────── */}
      {!loading && expenses.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl w-fit">
          <Receipt className="h-4 w-4 text-red-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{expenses.length} ·</span>
          <span className="text-sm font-black text-red-600 dark:text-red-400 tabular-nums">{fmt(total)}</span>
          <span className="text-xs text-slate-400">{PERIOD_LABELS[period].toLowerCase()}</span>
        </div>
      )}

      {/* ── Expense list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mb-3">
            <Receipt className="h-5 w-5 opacity-40" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('noClinicExpenses')}</p>
          <button onClick={() => { setPrefillData(undefined); setEditExpense(null) }} className="mt-2 text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold">
            {t('recordFirstExpense')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-700/60">
          {expenses.map(exp => {
            const cat = getCat(exp.category, t)
            return (
              <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{exp.description}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${cat.badge}`}>{cat.label}</span>
                    {exp.recurrence !== 'one_time' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 font-semibold flex-shrink-0">
                        {getRecurrenceLabel(exp.recurrence, t)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    <span>{new Date(exp.date).toLocaleDateString()}</span>
                    {exp.vendor && <><span>·</span><span className="truncate">{exp.vendor}</span></>}
                    <span>·</span>
                    <span>{getPaymentLabel(exp.paymentMethod, t)}</span>
                    {exp.recurrence !== 'one_time' && (
                      <><span>·</span><span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold">{getRecurrenceLabel(exp.recurrence, t)}</span></>
                    )}
                    {MATERIAL_CATS.has(exp.category) && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-semibold">
                        {t('expenseSourceMaterial')}
                      </span>
                    )}
                  </div>
                  {exp.notes && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{exp.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-base font-black text-red-600 dark:text-red-400 tabular-nums">{fmt(exp.amount)}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setPrefillData(undefined); setEditExpense(exp) }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors" title={t('edit')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors" title={t('delete')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {editExpense !== undefined && (
        <ExpenseFormModal
          expense={editExpense}
          prefill={prefillData}
          onClose={() => { setEditExpense(undefined); setPrefillData(undefined) }}
          onSaved={() => { setEditExpense(undefined); setPrefillData(undefined); loadExpenses() }}
        />
      )}
    </div>
  )
}
