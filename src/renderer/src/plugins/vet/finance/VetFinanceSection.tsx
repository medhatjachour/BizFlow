/**
 * VetFinanceSection
 * Finance tab for the Vet Clinic plugin — shown at /finance → Vet
 */
import { useState, useEffect, useCallback } from 'react'
import {
  PawPrint, TrendingUp, TrendingDown, AlertCircle, Receipt,
  Loader2, RefreshCcw, Banknote, BarChart3, Users, Activity
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

type Period = 'today' | 'week' | 'month' | 'year'

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const EXPENSE_CATEGORIES = [
  { value: 'rent',             label: 'Rent' },
  { value: 'utilities',        label: 'Utilities' },
  { value: 'medical_supplies', label: 'Medical Supplies' },
  { value: 'medications',      label: 'Medications' },
  { value: 'equipment',        label: 'Equipment' },
  { value: 'maintenance',      label: 'Maintenance' },
  { value: 'lab_fees',         label: 'Lab Fees' },
  { value: 'insurance',        label: 'Insurance' },
  { value: 'marketing',        label: 'Marketing' },
  { value: 'cleaning',         label: 'Cleaning' },
  { value: 'salaries',         label: 'Salaries' },
  { value: 'other',            label: 'Other' },
]

function getCatLabel(val: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === val)?.label ?? val.replace(/_/g,' ')
}

interface FinanceSummary {
  revenue: number
  totalExpenses: number
  netIncome: number
  outstanding: number
  byCategory: Array<{ category: string; total: number }>
}

interface Debtor { id: string; name: string; species: string; outstanding: number }

export default function VetFinanceSection() {
  const toast = useToast()
  const [period,    setPeriod]    = useState<Period>('month')
  const [summary,   setSummary]   = useState<FinanceSummary | null>(null)
  const [debtors,   setDebtors]   = useState<Debtor[]>([])
  const [expenses,  setExpenses]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState<'overview' | 'debtors' | 'expenses'>('overview')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sm, expSummary, dx, ex] = await Promise.all([
        window.api.vet?.stats.overview(period).catch(() => null),
        window.api.vet?.expenses?.summary(period).catch(() => null),
        window.api.vet?.patients?.getAll({ skip: 0, take: 200 }).catch(() => ({ data: [] })),
        window.api.vet?.expenses?.getAll({ period }).catch(() => []),
      ])

      // Build summary from stats overview + expenses summary
      setSummary({
        revenue:       sm?.revenue               ?? 0,
        totalExpenses: expSummary?.totalExpenses ?? 0,
        netIncome:     (sm?.revenue ?? 0) - (expSummary?.totalExpenses ?? 0),
        outstanding:   sm?.outstanding           ?? 0,
        byCategory:    expSummary?.byCategory    ?? [],
      })

      // Debtors — patients with outstanding balance
      const patients = Array.isArray(dx) ? dx : (dx as any)?.data ?? []
      setDebtors(
        patients
          .filter((p: any) => (p.finance?.outstanding ?? 0) > 0)
          .map((p: any) => ({ id: p.id, name: p.name, species: p.species, outstanding: p.finance?.outstanding ?? 0 }))
          .sort((a: Debtor, b: Debtor) => b.outstanding - a.outstanding)
      )

      setExpenses(Array.isArray(ex) ? ex : (ex as any)?.data ?? [])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [period])

  const TABS = [
    { key: 'overview' as const, label: 'Overview',  icon: BarChart3 },
    { key: 'debtors'  as const, label: 'Debtors',   icon: Users },
    { key: 'expenses' as const, label: 'Expenses',  icon: Receipt },
  ]

  const kpiCards = summary ? [
    { label: 'Revenue',       value: fmt(summary.revenue),       icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40' },
    { label: 'Expenses',      value: fmt(summary.totalExpenses), icon: TrendingDown, color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',          border: 'border-red-200 dark:border-red-800/40' },
    { label: 'Net Income',    value: fmt(summary.netIncome),     icon: Banknote,     color: summary.netIncome >= 0 ? 'text-teal-600' : 'text-red-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800/40' },
    { label: 'Outstanding',   value: fmt(summary.outstanding),   icon: AlertCircle,  color: summary.outstanding > 0 ? 'text-amber-600' : 'text-slate-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/40' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800/40">
            <PawPrint size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vet Clinic — Finance</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Revenue, outstanding balances and expenses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 gap-0.5">
            {(['today','week','month','year'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={color} />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Inner tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === key ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === 'overview' && summary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Receipt size={14} className="text-red-500" /> Expense Breakdown
                </h3>
                {summary.byCategory.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No expenses this period</p>
                ) : (
                  <div className="space-y-3">
                    {summary.byCategory.map(({ category: cat, total }) => {
                      const max = Math.max(...summary.byCategory.map(x => x.total))
                      const pct = max > 0 ? (total / max) * 100 : 0
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{getCatLabel(cat)}</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">{fmt(total)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-violet-500" /> Profit Summary
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Gross Revenue',     value: summary.revenue,       color: 'text-emerald-600' },
                    { label: 'Total Expenses',    value: -summary.totalExpenses, color: 'text-red-500' },
                    { label: 'Net Income',        value: summary.netIncome,      color: summary.netIncome >= 0 ? 'text-teal-600' : 'text-red-600', bold: true },
                    { label: 'Unpaid / Outstanding', value: summary.outstanding, color: summary.outstanding > 0 ? 'text-amber-600' : 'text-slate-400' },
                  ].map(({ label, value, color, bold }) => (
                    <div key={label} className={`flex justify-between items-center py-2 ${bold ? 'border-t border-slate-200 dark:border-slate-700 font-semibold' : ''}`}>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                      <span className={`text-sm font-semibold ${color} tabular-nums`}>
                        {value < 0 ? `-${fmt(-value)}` : fmt(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Debtors tab */}
          {tab === 'debtors' && (
            debtors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <AlertCircle size={36} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">No outstanding balances</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{debtors.length} patient(s) with outstanding balance</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    Total: {fmt(debtors.reduce((s, d) => s + d.outstanding, 0))}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {debtors.map(d => (
                    <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                      <PawPrint size={14} className="text-violet-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{d.species}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmt(d.outstanding)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Expenses tab */}
          {tab === 'expenses' && (
            expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Receipt size={36} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">No expenses this period</p>
                <p className="text-xs mt-1">Record expenses in the Vet → Expenses tab</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {expenses.slice(0, 100).map((exp: any) => (
                    <div key={exp.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                        <p className="text-xs text-slate-400">{getCatLabel(exp.category)} · {new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">{fmt(exp.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-xs text-slate-400">{expenses.length} records</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    Total: {fmt(expenses.reduce((s: number, e: any) => s + Number(e.amount), 0))}
                  </span>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}