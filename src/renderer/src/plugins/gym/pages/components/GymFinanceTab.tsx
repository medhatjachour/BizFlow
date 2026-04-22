import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCcw } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

type Period = 'today' | 'week' | 'month' | 'year'

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#f97316', equipment: '#3b82f6', salaries: '#8b5cf6',
  utilities: '#f59e0b', marketing: '#ec4899', maintenance: '#14b8a6',
  supplies: '#84cc16', other: '#64748b'
}

export default function GymFinanceTab() {
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('month')
  const [stats, setStats] = useState<any | null>(null)
  const [summary, setSummary] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [st, sm] = await Promise.all([
        (window.api as any).gym?.stats?.overview(period),
        (window.api as any).gym?.expenses?.summary(period)
      ])
      setStats(st)
      setSummary(sm)
    } catch (err: any) { toast.error(err.message ?? 'Failed to load') }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const netColor = stats && stats.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'
  const netBg   = stats && stats.netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'

  const revenueData = stats ? [
    { name: 'Subscriptions', amount: stats.subRevenue },
    { name: 'Walk-ins', amount: stats.walkRevenue }
  ] : []

  const expenseData = summary?.byCategory?.map((c: any) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    amount: c._sum.amount,
    color: CATEGORY_COLORS[c.category] ?? '#64748b'
  })) ?? []

  return (
    <div className="space-y-5">
      {/* Period + refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Financial Overview</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 gap-0.5">
            {(['today','week','month','year'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      ) : stats ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Subscription Revenue', value: fmt(stats.subRevenue), color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/40' },
              { label: 'Walk-in Revenue',       value: fmt(stats.walkRevenue), color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800/40' },
              { label: 'Total Expenses',        value: fmt(stats.totalExpenses), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/40' },
              { label: 'Net Income',            value: `${stats.netIncome >= 0 ? '' : '-'}${fmt(Math.abs(stats.netIncome))}`, color: netColor, bg: netBg.split(' ')[0], border: netBg.split(' ').slice(1).join(' ') },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Revenue Breakdown</h3>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={revenueData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [fmt(v as number), 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="amount" radius={[6,6,0,0]}>
                      <Cell fill="#f97316" />
                      <Cell fill="#14b8a6" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No revenue data</div>
              )}
            </div>

            {/* Expense by category */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Expenses by Category</h3>
              {expenseData.length > 0 ? (
                <div className="space-y-2">
                  {expenseData.map((c: any) => {
                    const pct = summary.totalExpenses > 0 ? (c.amount / summary.totalExpenses) * 100 : 0
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-600 dark:text-slate-300 capitalize">{c.name}</span>
                          <span className="text-slate-500 tabular-nums">{fmt(c.amount)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No expenses</div>
              )}
            </div>
          </div>

          {/* Summary row */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Revenue vs. Expenses</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500"><span>Revenue</span><span className="font-semibold text-orange-600 tabular-nums">{fmt(stats.revenue)}</span></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: stats.revenue > 0 ? `${Math.min(100, (stats.revenue / Math.max(stats.revenue, stats.totalExpenses)) * 100)}%` : '0%' }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500"><span>Expenses</span><span className="font-semibold text-red-600 tabular-nums">{fmt(stats.totalExpenses)}</span></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: stats.revenue > 0 ? `${Math.min(100, (stats.totalExpenses / Math.max(stats.revenue, stats.totalExpenses)) * 100)}%` : '0%' }} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Net Income</p>
                <p className={`text-2xl font-bold tabular-nums ${netColor}`}>{stats.netIncome >= 0 ? '' : '-'}{fmt(Math.abs(stats.netIncome))}</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
