/**
 * ClinicFinanceSection
 *
 * Full clinic financial management shown at /finance → Clinic.
 * Tabs: Overview · Revenue
 *
 * Expenses and Payroll have been moved to the kernel pages:
 *   - Clinic Staff  → /employees  (managed as regular employees with clinic roles)
 *   - Clinic Expenses       → /expenses   (Clinic Expenses section)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, AlertCircle, Receipt, Users,
  Loader2, RefreshCcw, Stethoscope, BarChart3,
  CheckCircle2, Banknote, ArrowUpRight, Search, X,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ComposedChart,
} from 'recharts'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'

// ─── Constants ────────────────────────────────────────────────────────────────

type Period  = 'today' | 'week' | 'month' | 'year'
type MainTab = 'overview' | 'revenue'

const EXPENSE_CATEGORIES = [
  { value: 'rent',             label: 'Rent / Lease',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'utilities',        label: 'Utilities',        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'medical_supplies', label: 'Medical Supplies', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'medications',      label: 'Medications',      badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  { value: 'equipment',        label: 'Equipment',        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { value: 'maintenance',      label: 'Maintenance',      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'lab_fees',         label: 'Lab Fees',         badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  { value: 'insurance',        label: 'Insurance',        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'marketing',        label: 'Marketing',        badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  { value: 'cleaning',         label: 'Cleaning',         badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'salaries',         label: 'Salaries',         badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'other',            label: 'Other',            badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
]

const DEBT_PAGE_SIZE = 80

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function getCat(val: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === val) ?? { label: val, badge: 'bg-slate-100 text-slate-600' }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientWithFinance {
  id: string
  name: string
  phone: string
  finance?: { totalCharged: number; totalPaid: number; outstanding: number }
}
interface DebtorsResponse {
  data: PatientWithFinance[]
  total: number
  totalOutstanding: number
  hasMore: boolean
}
interface FinanceSummary {
  revenue: number; totalExpenses: number; totalSalaries: number
  netIncome: number; outstanding: number
  byCategory: Array<{ category: string; total: number }>
}

function toArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data as T[]
  }
  return []
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, colorClass, bgClass, sub }: {
  label: string; value: string; icon: any; colorClass: string; bgClass: string; sub?: string
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 ${colorClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={`text-2xl font-black tabular-nums ${colorClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
const ClinicFinanceSection: React.FC = () => {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<MainTab>('overview')
  const [period, setPeriod]       = useState<Period>('month')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── expenses state ────────────────────────────────────────────────────────
  const [summary,     setSummary]     = useState<FinanceSummary | null>(null)
  const [breakdown,   setBreakdown]   = useState<Array<{ label: string; total: number }>>([])
  const [loadingExp,  setLoadingExp]  = useState(true)


  // ── revenue state ─────────────────────────────────────────────────────────
  const [debtPatients,   setDebtPatients]   = useState<PatientWithFinance[]>([])
  const [debtMeta, setDebtMeta] = useState({ total: 0, totalOutstanding: 0, hasMore: false })
  const [debtSearchInput, setDebtSearchInput] = useState('')
  const [debtSearch, setDebtSearch] = useState('')
  const [revBreakdown,   setRevBreakdown]   = useState<Array<{ label: string; revenue: number; expenses: number }>>([])
  const [loadingRevenue, setLoadingRevenue] = useState(false)
  const [loadingMoreDebt, setLoadingMoreDebt] = useState(false)

  // ── loaders ───────────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setLoadingExp(true)
    try {
      const api = window.api.clinic
      const [sum, brk] = await Promise.all([
        api.expenses.summary(period),
        api.expenses.breakdown({ period }),
      ])
      setSummary(sum as FinanceSummary)
      setBreakdown(brk)
    } catch (e) {
      logger.error('ClinicFinance: loadExpenses failed', e)
      showToast('error', 'Failed to load financial data')
    } finally {
      setLoadingExp(false)
    }
  }, [period, showToast])


  const loadRevenue = useCallback(async (opts?: { append?: boolean; skip?: number }) => {
    const append = Boolean(opts?.append)
    const skip = opts?.skip ?? 0

    if (append) setLoadingMoreDebt(true)
    else setLoadingRevenue(true)

    try {
      const [debtorsRes, brk] = await Promise.all([
        (window.api.clinic.patients.getDebtors as any)({
          search: debtSearch.trim() || undefined,
          skip,
          take: DEBT_PAGE_SIZE
        }) as Promise<DebtorsResponse>,
        window.api.clinic.expenses.breakdown({ period }),
      ])

      const debtors = toArray<PatientWithFinance>(debtorsRes)
      if (append) {
        setDebtPatients((prev) => [...prev, ...debtors])
      } else {
        setDebtPatients(debtors)
      }
      setDebtMeta({
        total: Number(debtorsRes?.total ?? debtors.length),
        totalOutstanding: Number(debtorsRes?.totalOutstanding ?? 0),
        hasMore: Boolean(debtorsRes?.hasMore)
      })

      // Build revenue vs expenses per bucket using the same breakdown labels
      // Revenue breakdown requires a separate call — reuse summary revenue / buckets count for now
      setRevBreakdown(brk.map((b: { label: string; total: number }) => ({ label: b.label, revenue: 0, expenses: b.total })))
    } catch (e) {
      logger.error('ClinicFinance: loadRevenue failed', e)
      if (!append) {
        showToast('error', 'Failed to load outstanding balances')
        setDebtPatients([])
        setDebtMeta({ total: 0, totalOutstanding: 0, hasMore: false })
      } else {
        showToast('error', 'Failed to load more debtors')
      }
    }
    finally {
      if (append) setLoadingMoreDebt(false)
      else setLoadingRevenue(false)
    }
  }, [period, showToast, debtSearch])

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setDebtSearch(debtSearchInput.trim()), 280)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [debtSearchInput])

  useEffect(() => { loadExpenses() }, [loadExpenses])
  useEffect(() => {
    if (activeTab !== 'revenue') return
    loadRevenue({ append: false, skip: 0 })
  }, [activeTab, period, debtSearch, loadRevenue])


  const TAB_DEFS: { key: MainTab; icon: any; label: string }[] = [
    { key: 'overview', icon: BarChart3, label: 'Overview' },
    { key: 'revenue',  icon: Banknote,  label: 'Revenue'  },
  ]

  const PERIOD_DEFS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'Week'  },
    { key: 'month', label: 'Month' },
    { key: 'year',  label: 'Year'  },
  ]


  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* ─── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-sm shadow-teal-500/30">
            <Stethoscope size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clinic Finance</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Track expenses, payroll, and revenue in one place</p>
          </div>
        </div>

        {/* Period selector + refresh – shared by all tabs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
            {PERIOD_DEFS.map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === key
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}>{label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { loadExpenses(); if (activeTab === 'revenue') loadRevenue() }}
            className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCcw size={14} className={loadingExp ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Tab Navigation ──────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700 mb-6">
        {TAB_DEFS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
              activeTab === key
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════ OVERVIEW ═══════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Net Income hero card */}
          {loadingExp ? (
            <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
          ) : summary ? (
            <div className={`rounded-2xl p-6 ${summary.netIncome >= 0 ? 'bg-gradient-to-r from-teal-500 to-cyan-600' : 'bg-gradient-to-r from-red-500 to-rose-600'} shadow-lg shadow-teal-500/20 text-white`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold opacity-80 mb-1">Net Income · {PERIOD_DEFS.find(p => p.key === period)?.label}</p>
                  <p className="text-4xl font-black tabular-nums tracking-tight">{summary.netIncome < 0 ? '−' : '+'}{fmt(Math.abs(summary.netIncome))}</p>
                  <p className="text-sm opacity-70 mt-1.5">
                    {summary.netIncome >= 0 ? 'Profitable period' : 'Expenses exceed revenue'} · {fmt(summary.revenue)} collected
                  </p>
                </div>
                <div className={`p-3 rounded-2xl ${summary.netIncome >= 0 ? 'bg-white/20' : 'bg-white/20'}`}>
                  {summary.netIncome >= 0
                    ? <TrendingUp size={28} className="opacity-90" />
                    : <TrendingDown size={28} className="opacity-90" />
                  }
                </div>
              </div>
              {/* mini glanceable stats */}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20">
                <div>
                  <p className="text-[11px] opacity-60 uppercase tracking-wide mb-0.5">Revenue</p>
                  <p className="text-base font-black tabular-nums">{fmt(summary.revenue)}</p>
                </div>
                <div>
                  <p className="text-[11px] opacity-60 uppercase tracking-wide mb-0.5">Expenses</p>
                  <p className="text-base font-black tabular-nums">{fmt(summary.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-[11px] opacity-60 uppercase tracking-wide mb-0.5">Outstanding</p>
                  <p className="text-base font-black tabular-nums">{fmt(summary.outstanding)}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Secondary KPI row */}
          {!loadingExp && summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Payroll Cost"   value={fmt(summary.totalSalaries ?? 0)} icon={Users}       colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-50 dark:bg-violet-900/10"    sub="staff salaries" />
              <KpiCard label="Total Expenses" value={fmt(summary.totalExpenses)}      icon={TrendingDown} colorClass="text-red-500 dark:text-red-400"         bgClass="bg-red-50 dark:bg-red-900/10"          sub="incl. payroll" />
              <KpiCard label="Collection Rate"
                value={summary.revenue + summary.outstanding > 0 ? `${Math.round((summary.revenue / (summary.revenue + summary.outstanding)) * 100)}%` : '–'}
                icon={TrendingUp}
                colorClass={(summary.revenue / Math.max(1, summary.revenue + summary.outstanding)) >= 0.8 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}
                bgClass={(summary.revenue / Math.max(1, summary.revenue + summary.outstanding)) >= 0.8 ? 'bg-teal-50 dark:bg-teal-900/10' : 'bg-amber-50 dark:bg-amber-900/10'}
                sub="billed vs collected"
              />
              <KpiCard label="Uncollected"    value={fmt(summary.outstanding)}        icon={AlertCircle}  colorClass="text-amber-600 dark:text-amber-400"     bgClass="bg-amber-50 dark:bg-amber-900/10"      sub="pending payment" />
            </div>
          )}

          {/* Spend over time */}
          {breakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Spend Over Time</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={breakdown} margin={{ top: 0, right: 8, left: -8, bottom: 0 }} barSize={period === 'year' ? 30 : 18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} formatter={(v: any) => [fmt(v), 'Expenses']} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Expenses by category */}
          {summary && summary.byCategory.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Expenses by Category</p>
              <div className="space-y-2.5">
                {summary.byCategory.slice(0, 7).map(({ category, total }) => {
                  const cfg = category === 'salaries_payroll'
                    ? { label: 'Payroll', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' }
                    : getCat(category)
                  const pct = Math.max(4, (total / summary.totalExpenses) * 100)
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 w-28 text-center truncate ${cfg.badge}`}>{cfg.label}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-20 text-right tabular-nums">{fmt(total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}



      {/* ═══════════════════════════════ REVENUE ════════════════════════════ */}
      {activeTab === 'revenue' && (
        <div className="space-y-5">

          {/* Collection health KPIs */}
          {summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Total Billed"
                value={fmt(summary.revenue + summary.outstanding)}
                icon={Receipt}
                colorClass="text-slate-700 dark:text-slate-200"
                bgClass="bg-slate-50 dark:bg-slate-700/40"
                sub={PERIOD_DEFS.find(p => p.key === period)?.label}
              />
              <KpiCard
                label="Collected"
                value={fmt(summary.revenue)}
                icon={CheckCircle2}
                colorClass="text-emerald-600 dark:text-emerald-400"
                bgClass="bg-emerald-50 dark:bg-emerald-900/10"
                sub="cash in hand"
              />
              <KpiCard
                label="Outstanding"
                value={fmt(summary.outstanding)}
                icon={AlertCircle}
                colorClass="text-red-500 dark:text-red-400"
                bgClass="bg-red-50 dark:bg-red-900/10"
                sub="awaiting payment"
              />
              <KpiCard
                label="Collection Rate"
                value={summary.revenue + summary.outstanding > 0
                  ? `${Math.round((summary.revenue / (summary.revenue + summary.outstanding)) * 100)}%`
                  : '–'}
                icon={TrendingUp}
                colorClass={(summary.revenue / Math.max(1, summary.revenue + summary.outstanding)) >= 0.8
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-amber-600 dark:text-amber-400'}
                bgClass={(summary.revenue / Math.max(1, summary.revenue + summary.outstanding)) >= 0.8
                  ? 'bg-teal-50 dark:bg-teal-900/10'
                  : 'bg-amber-50 dark:bg-amber-900/10'}
                sub="billed vs collected"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}
            </div>
          )}

          {/* Expenses chart */}
          {revBreakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Expense Spending Over Period</p>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={revBreakdown} margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} formatter={(v: any) => [fmt(v), 'Expenses']} />
                  <Bar dataKey="expenses" fill="#f87171" opacity={0.8} radius={[5, 5, 0, 0]} barSize={18} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Patient debt ledger */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Outstanding Balances</span>
                {debtMeta.total > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold">{debtMeta.total}</span>
                )}
              </div>
              <button onClick={() => loadRevenue()} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-600 transition-colors font-medium">
                <RefreshCcw size={12} className={loadingRevenue ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="relative max-w-md">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={debtSearchInput}
                  onChange={(e) => setDebtSearchInput(e.target.value)}
                  placeholder="Search debtor by name, phone, national ID, folder #"
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 pl-8 pr-8 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {debtSearchInput && (
                  <button
                    onClick={() => setDebtSearchInput('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {loadingRevenue ? (
              <div className="space-y-px">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700/30 animate-pulse" />)}
              </div>
            ) : debtMeta.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400 dark:text-slate-500">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 opacity-70" />
                </div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">All patients are fully paid</p>
                <p className="text-xs text-slate-400 mt-0.5">No outstanding balances</p>
              </div>
            ) : (
              <>
                {/* Totals banner */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-red-50/70 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {debtMeta.total} patient{debtMeta.total !== 1 ? 's' : ''} owe a total of
                  </span>
                  <span className="text-sm font-black text-red-600 dark:text-red-400 tabular-nums">
                    {fmt(debtMeta.totalOutstanding)}
                  </span>
                </div>
                {debtSearch && (
                  <div className="px-5 py-2 text-[11px] text-slate-500 border-b border-slate-100 dark:border-slate-700/40">
                    Search results for <span className="font-semibold">"{debtSearch}"</span>
                  </div>
                )}
                {debtMeta.hasMore && !debtSearch && (
                  <div className="px-5 py-2 text-[11px] text-slate-400 border-b border-slate-100 dark:border-slate-700/40">
                    Showing top {debtPatients.length} debtors by outstanding amount.
                  </div>
                )}
                <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {debtPatients.map((p) => {
                    const fin = p.finance!
                    const rate = fin.totalCharged > 0 ? Math.round((fin.totalPaid / fin.totalCharged) * 100) : 0
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-[10px] font-bold text-white">
                            {p.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                            {p.phone && <span className="text-xs text-slate-400 flex-shrink-0">{p.phone}</span>}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 max-w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-400 flex-shrink-0">{rate}%</span>
                            <span className="text-[11px] text-slate-400 hidden sm:block">
                              Billed <strong className="text-slate-600 dark:text-slate-300">{fmt(fin.totalCharged)}</strong>
                              {' · '}Paid <strong className="text-emerald-600 dark:text-emerald-400">{fmt(fin.totalPaid)}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-base font-black text-red-500 dark:text-red-400 tabular-nums">{fmt(fin.outstanding)}</span>
                          <a
                            href={`#/clinic/patients/${p.id}`}
                            onClick={(e) => { e.preventDefault(); window.location.hash = `/clinic/patients/${p.id}` }}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline transition-opacity flex-shrink-0"
                          >
                            View <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {debtMeta.hasMore && (
                  <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-800/20">
                    <button
                      onClick={() => loadRevenue({ append: true, skip: debtPatients.length })}
                      disabled={loadingMoreDebt}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-60"
                    >
                      {loadingMoreDebt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {loadingMoreDebt ? 'Loading more...' : `Load more (${debtMeta.total - debtPatients.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default ClinicFinanceSection
