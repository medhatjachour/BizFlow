import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, PieChart, Pie, Cell, Legend, Area
} from 'recharts'
import {
  Users, ClipboardList, UserPlus, Calendar, Activity, Loader2,
  DollarSign, AlertCircle, TrendingUp, TrendingDown, RefreshCw,
  Lightbulb, Target, Minus
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { colorForDoctor, initials, displayName as doctorDisplayName } from '../../doctors/utils'

interface Overview {
  totalPatients: number
  sessionsThisMonth: number
  newPatientsThisMonth: number
  followUpsDue: number
  todaySessions: number
  revenueThisMonth: number
  outstandingThisMonth: number
}

interface DiagnosisEntry {
  diagnosis: string
  count: number
}

interface FullTrendEntry {
  date: string
  sessions: number
  charged: number
  paid: number
}

interface MonthlyEntry {
  month: string
  sessions: number
  revenue: number
}

interface Breakdowns {
  visitTypes: { type: string; count: number }[]
  paymentStatuses: { status: string; count: number }[]
}

const VISIT_TYPE_COLORS: Record<string, string> = {
  first_visit: '#3b82f6',
  follow_up: '#0d9488',
  routine: '#8b5cf6',
  emergency: '#ef4444'
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: '#10b981',
  partial: '#f59e0b',
  unpaid: '#ef4444',
  waived: '#94a3b8'
}

function StatCard({ icon: Icon, label, value, color, sub, trend, trendPct }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  sub?: string
  trend?: 'up' | 'down' | 'flat'
  trendPct?: number
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && trend !== 'flat' && trendPct !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
            trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trendPct)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">{title}</h3>
      {children}
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: 'none', background: '#1e293b', color: '#fff' },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' }
}

const AXIS_TICK = { fontSize: 10, fill: '#94a3b8' }

export default function StatsTab() {
  const { t } = useLanguage()
  const clinicStatsApi = window.api.clinic.stats as any
  const [trendDays, setTrendDays] = useState(30)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([])
  const [fullTrend, setFullTrend] = useState<FullTrendEntry[]>([])
  const [monthly, setMonthly] = useState<MonthlyEntry[]>([])
  const [breakdowns, setBreakdowns] = useState<Breakdowns | null>(null)
  const [byDoctor, setByDoctor] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [ov, dx, ft, mo, bd] = await Promise.all([
        clinicStatsApi.overview(),
        clinicStatsApi.topDiagnoses(8),
        clinicStatsApi.fullTrend(trendDays),
        clinicStatsApi.monthlyTrend(6),
        clinicStatsApi.breakdowns()
      ])
      setOverview(ov)
      setDiagnoses(dx)
      setFullTrend(ft)
      setMonthly(mo)
      setBreakdowns(bd)
      clinicStatsApi.byDoctor().then((rows: any[]) => setByDoctor(rows ?? [])).catch(() => {})
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function go() {
      setLoading(true)
      try {
        const [ov, dx, ft, mo, bd] = await Promise.all([
          clinicStatsApi.overview(),
          clinicStatsApi.topDiagnoses(8),
          clinicStatsApi.fullTrend(trendDays),
          clinicStatsApi.monthlyTrend(6),
          clinicStatsApi.breakdowns()
        ])
        if (!cancelled) { setOverview(ov); setDiagnoses(dx); setFullTrend(ft); setMonthly(mo); setBreakdowns(bd) }
        clinicStatsApi.byDoctor().then((rows: any[]) => { if (!cancelled) setByDoctor(rows ?? []) }).catch(() => {})
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    go()
    return () => { cancelled = true }
  }, [trendDays])

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const collectionRate = overview && overview.revenueThisMonth + overview.outstandingThisMonth > 0
    ? Math.round((overview.revenueThisMonth / (overview.revenueThisMonth + overview.outstandingThisMonth)) * 100)
    : 0

  const avgSessionValue = useMemo(() => {
    if (!overview || overview.sessionsThisMonth === 0) return 0
    return Math.round(overview.revenueThisMonth / overview.sessionsThisMonth)
  }, [overview])

  // Revenue trend from monthly data (last 2 months comparison)
  const revenueTrend = useMemo((): { pct: number; dir: 'up' | 'down' | 'flat' } => {
    if (monthly.length < 2) return { pct: 0, dir: 'flat' }
    const last = monthly[monthly.length - 1]?.revenue ?? 0
    const prev = monthly[monthly.length - 2]?.revenue ?? 0
    if (prev === 0) return { pct: 0, dir: 'flat' }
    const pct = Math.round(((last - prev) / prev) * 100)
    return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
  }, [monthly])

  const sessionsTrend = useMemo((): { pct: number; dir: 'up' | 'down' | 'flat' } => {
    if (monthly.length < 2) return { pct: 0, dir: 'flat' }
    const last = monthly[monthly.length - 1]?.sessions ?? 0
    const prev = monthly[monthly.length - 2]?.sessions ?? 0
    if (prev === 0) return { pct: 0, dir: 'flat' }
    const pct = Math.round(((last - prev) / prev) * 100)
    return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
  }, [monthly])

  // Automated insights
  const insights = useMemo(() => {
    const list: { type: 'good' | 'warn' | 'info'; text: string }[] = []
    if (!overview) return list
    if (collectionRate >= 80) list.push({ type: 'good', text: `Strong collection rate at ${collectionRate}% — excellent payment compliance.` })
    else if (collectionRate < 50) list.push({ type: 'warn', text: `Collection rate is only ${collectionRate}%. ${formatCurrency(overview.outstandingThisMonth)} outstanding — follow up on unpaid sessions.` })
    if (overview.followUpsDue > 0) list.push({ type: 'warn', text: `${overview.followUpsDue} follow-up${overview.followUpsDue > 1 ? 's' : ''} due — check the appointments tab.` })
    if (overview.newPatientsThisMonth > 0) list.push({ type: 'good', text: `${overview.newPatientsThisMonth} new patient${overview.newPatientsThisMonth > 1 ? 's' : ''} registered this month.` })
    if (diagnoses.length > 0) list.push({ type: 'info', text: `Top diagnosis: "${diagnoses[0].diagnosis}" (${diagnoses[0].count} sessions).` })
    if (avgSessionValue > 0) list.push({ type: 'info', text: `Average session value this month: ${formatCurrency(avgSessionValue)}.` })
    if (revenueTrend.dir !== 'flat') list.push({
      type: revenueTrend.dir === 'up' ? 'good' : 'warn',
      text: `Revenue ${revenueTrend.dir === 'up' ? 'up' : 'down'} ${revenueTrend.pct}% vs. last month.`
    })
    return list.slice(0, 4)
  }, [overview, collectionRate, diagnoses, avgSessionValue, revenueTrend])

  const visitTypeLabels: Record<string, string> = {
    first_visit: t('firstVisitType'),
    follow_up: t('followUpVisitType'),
    routine: t('routineVisitType'),
    emergency: t('emergencyVisitType')
  }
  const paymentLabels: Record<string, string> = {
    paid: t('paidPayment'),
    partial: t('partialPayment'),
    unpaid: t('unpaidPayment'),
    waived: t('waivedPayment')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Clinic Analytics</h2>
        <div className="flex items-center gap-2">
          {/* Trend range selector */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  trendDays === d
                    ? 'bg-teal-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-teal-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatCard icon={Users} label={t('totalPatients')} value={overview.totalPatients}
            color="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400" />
          <StatCard icon={Activity} label={t('todaySessions')} value={overview.todaySessions}
            color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" />
          <StatCard icon={ClipboardList} label={t('sessionsThisMonth')} value={overview.sessionsThisMonth}
            color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
            trend={sessionsTrend.dir} trendPct={sessionsTrend.pct} />
          <StatCard icon={UserPlus} label={t('newPatientsMonth')} value={overview.newPatientsThisMonth}
            color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" />
          <StatCard icon={Calendar} label={t('followUpsDue')} value={overview.followUpsDue}
            color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
            trend={overview.followUpsDue > 5 ? 'up' : 'flat'} />
          <StatCard icon={DollarSign} label={t('revenueThisMonth')} value={formatCurrency(overview.revenueThisMonth)}
            color="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
            trend={revenueTrend.dir} trendPct={revenueTrend.pct} />
          <StatCard icon={AlertCircle} label={t('outstandingBalanceCard')} value={formatCurrency(overview.outstandingThisMonth)}
            color="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
            sub={`${t('collectionRate')}: ${collectionRate}%`}
            trend={collectionRate >= 80 ? 'flat' : 'down'} />
        </div>
      )}

      {/* ── KPI Highlight Bar ─────────────────────────────────────────────── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Collection Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-teal-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('collectionRate')}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{collectionRate}%</p>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${collectionRate}%`, background: collectionRate >= 80 ? '#10b981' : collectionRate >= 50 ? '#f59e0b' : '#ef4444' }}
              />
            </div>
          </div>

          {/* Avg Session Value */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Session Value</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(avgSessionValue)}</p>
            <p className="text-xs text-slate-400 mt-1">per session this month</p>
          </div>

          {/* Revenue vs Outstanding */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Revenue vs Outstanding (this month)</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(overview.revenueThisMonth)}</p>
                <p className="text-xs text-slate-400">Collected</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-600" />
              <div>
                <p className="text-lg font-bold text-rose-500 dark:text-rose-400">{formatCurrency(overview.outstandingThisMonth)}</p>
                <p className="text-xs text-slate-400">Outstanding</p>
              </div>
              {revenueTrend.dir !== 'flat' && (
                <>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-600" />
                  <div className={`flex items-center gap-1 text-sm font-semibold ${revenueTrend.dir === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {revenueTrend.dir === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {revenueTrend.pct}% vs last month
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Automated Insights ──────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Key Insights</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
                ins.type === 'good' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' :
                ins.type === 'warn' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' :
                'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
              }`}>
                {ins.type === 'good' ? <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> :
                 ins.type === 'warn' ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> :
                 <Minus className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
                {ins.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sessions & Revenue Trend ─────────────────────────────────────── */}
      <SectionCard title={`${t('revenueTrendTitle')} (${trendDays} days)`}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={fullTrend} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
            <defs>
              <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700" />
            <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={(v) => v.slice(5)} interval={trendDays <= 7 ? 0 : trendDays <= 30 ? 4 : 9} />
            <YAxis yAxisId="left" tick={AXIS_TICK} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={((value: number, name: string) => {
                if (name === 'sessions') return [String(value), t('sessionsLabel')]
                if (name === 'paid') return [formatCurrency(value), t('revenueLabel')]
                if (name === 'charged') return [formatCurrency(value), t('chargedLabel')]
                return [String(value), name]
              }) as any}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
              formatter={(value) => {
                if (value === 'sessions') return t('sessionsLabel')
                if (value === 'paid') return t('revenueLabel')
                if (value === 'charged') return t('chargedLabel')
                return value
              }} />
            <Area yAxisId="left" type="monotone" dataKey="sessions" fill="url(#sessionGrad)"
              stroke="#0d9488" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="paid" stroke="#10b981"
              strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="charged" stroke="#f59e0b"
              strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* ── Monthly Trend + Top Diagnoses ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={t('monthlyTrendTitle')}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700" />
              <XAxis dataKey="month" tick={AXIS_TICK} />
              <YAxis yAxisId="left" tick={AXIS_TICK} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={((value: number, name: string) => {
                  if (name === 'sessions') return [String(value), t('sessionsLabel')]
                  if (name === 'revenue') return [formatCurrency(value), t('revenueLabel')]
                  return [String(value), name]
                }) as any}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                formatter={(value) => value === 'sessions' ? t('sessionsLabel') : t('revenueLabel')} />
              <Bar yAxisId="left" dataKey="sessions" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar yAxisId="right" dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {diagnoses.length > 0 ? (
          <SectionCard title={t('topDiagnoses')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={diagnoses} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false}
                  className="stroke-slate-100 dark:stroke-slate-700" />
                <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
                <YAxis type="category" dataKey="diagnosis" tick={{ fontSize: 9, fill: '#94a3b8' }} width={90} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} maxBarSize={18}
                  label={{ position: 'right', fontSize: 10, fill: '#94a3b8' }} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        ) : (
          <SectionCard title={t('topDiagnoses')}>
            <div className="flex items-center justify-center h-48 text-sm text-slate-400">No diagnosis data yet</div>
          </SectionCard>
        )}
      </div>

      {/* ── Visit Type + Payment Donuts ──────────────────────────────── */}
      {breakdowns && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SectionCard title={t('visitTypeBreakdownTitle')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={breakdowns.visitTypes} dataKey="count" nameKey="type"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {breakdowns.visitTypes.map((entry) => (
                    <Cell key={entry.type} fill={VISIT_TYPE_COLORS[entry.type] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={((value: number, name: string) => [String(value), visitTypeLabels[name] ?? name]) as any} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => visitTypeLabels[value] ?? value} />
              </PieChart>
            </ResponsiveContainer>
            {/* Mini table */}
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
              {breakdowns.visitTypes.map((e) => {
                const total = breakdowns.visitTypes.reduce((s, x) => s + x.count, 0)
                const pct = total ? Math.round((e.count / total) * 100) : 0
                return (
                  <div key={e.type} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: VISIT_TYPE_COLORS[e.type] ?? '#94a3b8' }} />
                      {visitTypeLabels[e.type] ?? e.type}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{e.count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title={t('paymentBreakdownTitle')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={breakdowns.paymentStatuses} dataKey="count" nameKey="status"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {breakdowns.paymentStatuses.map((entry) => (
                    <Cell key={entry.status} fill={PAYMENT_STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={((value: number, name: string) => [String(value), paymentLabels[name] ?? name]) as any} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => paymentLabels[value] ?? value} />
              </PieChart>
            </ResponsiveContainer>
            {/* Mini table */}
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
              {breakdowns.paymentStatuses.map((e) => {
                const total = breakdowns.paymentStatuses.reduce((s, x) => s + x.count, 0)
                const pct = total ? Math.round((e.count / total) * 100) : 0
                return (
                  <div key={e.status} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: PAYMENT_STATUS_COLORS[e.status] ?? '#94a3b8' }} />
                      {paymentLabels[e.status] ?? e.status}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{e.count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── By Doctor ─────────────────────────────────────────── */}
      {byDoctor.length > 0 && (
        <SectionCard title={t('byDoctorTitle') || 'By Doctor (this month)'}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 font-medium">{t('doctorName') || 'Doctor'}</th>
                  <th className="py-2 font-medium text-right">{t('clinicSessions') || 'Sessions'}</th>
                  <th className="py-2 font-medium text-right">{t('patientsSeen') || 'Patients'}</th>
                  <th className="py-2 font-medium text-right">{t('revenue') || 'Revenue'}</th>
                  <th className="py-2 font-medium text-right">{t('commission') || 'Commission'}</th>
                  <th className="py-2 font-medium text-right">{t('noShowRate') || 'No-show'}</th>
                </tr>
              </thead>
              <tbody>
                {byDoctor.map((d: any) => {
                  const maxRev = Math.max(...byDoctor.map((x: any) => x.revenue), 1)
                  return (
                    <tr key={d.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: colorForDoctor(d) }}>{initials(d.name)}</span>
                          <div>
                            <div className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">{doctorDisplayName(d)}{d.isDefault ? ' ★' : ''}</div>
                            {d.specialty && <div className="text-[11px] text-slate-400">{d.specialty}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{d.sessions}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{d.patients}</td>
                      <td className="py-2 text-right">
                        <div className="font-semibold text-slate-800 dark:text-white">{formatCurrency(d.revenue)}</div>
                        <div className="mt-0.5 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-teal-500" style={{ width: `${Math.round((d.revenue / maxRev) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{formatCurrency(d.commission)}</td>
                      <td className="py-2 text-right text-slate-600 dark:text-slate-300">{d.noShowRate}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

    </div>
  )
}
