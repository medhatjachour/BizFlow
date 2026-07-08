import { useMemo } from 'react'
import {
  Users, Activity, Star, DollarSign, CalendarClock, Building2,
  Briefcase, AlertTriangle, Award, TrendingDown,
} from 'lucide-react'
import type { Employee, EmployeeStats } from '../types'
import { expiryState, daysUntil } from '../expiry'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useAuth } from '../../../contexts/AuthContext'

interface Props {
  employees: Employee[]
  stats: EmployeeStats | null
}

const money = (n: number) => `$${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

function Bars({ rows, max, empty }: { rows: [string, number][]; max: number; empty: string }) {
  if (rows.length === 0) return <p className="text-xs text-slate-400">{empty}</p>
  return (
    <div className="space-y-2">
      {rows.map(([label, count]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-slate-600 dark:text-slate-300 truncate">{label}</span>
            <span className="text-slate-400 tabular-nums">{count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Segmented({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} className={s.color} style={{ width: `${(s.value / (total || 1)) * 100}%` }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
            <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
            <span className="text-slate-400 tabular-nums font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Card({ children, title, icon }: { children: React.ReactNode; title: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

export default function EmployeeAnalytics({ employees, stats }: Props) {
  const { t } = useLanguage()
  const { can } = useAuth()
  const canFinance = can('view_finance')

  const d = useMemo(() => {
    const active = employees.filter(e => e.status !== 'terminated')
    const now = Date.now()
    const year = new Date().getFullYear()

    // Status
    const statusCounts = {
      active: employees.filter(e => e.status === 'active').length,
      onLeave: employees.filter(e => e.status === 'on-leave').length,
      terminated: employees.filter(e => e.status === 'terminated').length,
    }
    // Employment type (active)
    const typeCounts = {
      full: active.filter(e => e.employmentType === 'full-time').length,
      part: active.filter(e => e.employmentType === 'part-time').length,
      contract: active.filter(e => e.employmentType === 'contract').length,
    }
    // Performance buckets (active, rated = score > 0)
    const rated = active.filter(e => (e.performanceScore ?? 0) > 0)
    const perf = {
      high: rated.filter(e => (e.performanceScore ?? 0) >= 80).length,
      good: rated.filter(e => (e.performanceScore ?? 0) >= 60 && (e.performanceScore ?? 0) < 80).length,
      low: rated.filter(e => (e.performanceScore ?? 0) < 60).length,
      unrated: active.length - rated.length,
    }
    const avgPerf = rated.length ? Math.round(rated.reduce((s, e) => s + (e.performanceScore ?? 0), 0) / rated.length) : 0
    const topPerformers = [...rated].sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0)).slice(0, 5)

    // Department & role bars
    const tally = (key: (e: Employee) => string) => {
      const m: Record<string, number> = {}
      for (const e of active) { const k = key(e) || '—'; m[k] = (m[k] ?? 0) + 1 }
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6)
    }
    const depts = tally(e => e.department || 'Unassigned')
    const roles = tally(e => e.role)

    // Tenure / turnover / hires
    const tenures = active.map(e => (now - new Date(e.hireDate).getTime()) / (365.25 * 86400000)).filter(n => !isNaN(n))
    const avgTenure = tenures.length ? tenures.reduce((s, n) => s + n, 0) / tenures.length : 0
    const terminatedThisYear = employees.filter(e => e.status === 'terminated' && e.terminationDate && new Date(e.terminationDate).getFullYear() === year).length
    const turnover = employees.length ? Math.round((terminatedThisYear / employees.length) * 100) : 0
    const newHires = active.filter(e => new Date(e.hireDate).getFullYear() === year).length
    const monthlyBase = active.reduce((s, e) => s + (e.salaryType === 'monthly' ? (e.salary ?? 0) : 0), 0)

    // Expiries
    const expiries: { name: string; kind: string; date: string; state: string; days: number }[] = []
    for (const e of active) {
      for (const [kind, date] of [['Contract', e.contractEndDate], ['ID / visa', e.idExpiryDate]] as const) {
        const st = expiryState(date)
        if (st === 'soon' || st === 'expired') expiries.push({ name: e.name, kind, date: date as string, state: st, days: daysUntil(date) ?? 0 })
      }
    }
    expiries.sort((a, b) => a.days - b.days)

    return { statusCounts, typeCounts, perf, avgPerf, topPerformers, depts, roles, avgTenure, turnover, newHires, monthlyBase, expiries, activeCount: active.length, maxDept: depts[0]?.[1] ?? 1, maxRole: roles[0]?.[1] ?? 1, maxPerf: Math.max(perf.high, perf.good, perf.low, perf.unrated, 1) }
  }, [employees])

  const kpis = [
    { label: t('empHeadcount') ?? 'Headcount', value: `${d.activeCount}`, sub: `${employees.length} ${t('empTotal') ?? 'total'}`, icon: <Users size={16} />, tone: 'text-primary' },
    { label: t('empPresentToday') ?? 'Present today', value: `${stats?.presentToday ?? 0}`, sub: `${stats?.attendanceRate ?? 0}% ${t('empRate') ?? 'rate'}`, icon: <Activity size={16} />, tone: 'text-green-600' },
    { label: t('empAvgPerformance') ?? 'Avg performance', value: d.avgPerf ? `${d.avgPerf}%` : '—', sub: `${d.topPerformers.length} ${t('empRated') ?? 'rated'}`, icon: <Star size={16} />, tone: 'text-amber-500' },
    ...(canFinance ? [{ label: t('empPaidThisMonth') ?? 'Paid this month', value: money(stats?.payrollThisMonth ?? 0), sub: `${money(d.monthlyBase)} ${t('empMonthlyBaseShort') ?? 'base'}`, icon: <DollarSign size={16} />, tone: 'text-violet-500' }] : []),
    { label: t('empAvgTenure') ?? 'Avg tenure', value: `${d.avgTenure.toFixed(1)}`, sub: `${d.newHires} ${t('empNewHiresYear') ?? 'new this yr'}`, icon: <CalendarClock size={16} />, tone: 'text-blue-500' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className={`flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2 ${k.tone}`}>{k.icon}<span className="text-slate-400">{k.label}</span></div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{k.value}</div>
            <div className="text-xs text-slate-400 mt-1.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title={t('empStatusBreakdown') ?? 'Status'} icon={<Users size={13} />}>
          <Segmented total={employees.length} segments={[
            { label: t('empStatusActive'), value: d.statusCounts.active, color: 'bg-green-500' },
            { label: t('empStatusOnLeave'), value: d.statusCounts.onLeave, color: 'bg-amber-500' },
            { label: t('empStatusTerminated'), value: d.statusCounts.terminated, color: 'bg-red-500' },
          ]} />
        </Card>
        <Card title={t('empEmploymentType') ?? 'Employment type'} icon={<Briefcase size={13} />}>
          <Segmented total={d.activeCount} segments={[
            { label: t('empFullTime'), value: d.typeCounts.full, color: 'bg-blue-500' },
            { label: t('empPartTime'), value: d.typeCounts.part, color: 'bg-violet-500' },
            { label: t('empContract'), value: d.typeCounts.contract, color: 'bg-teal-500' },
          ]} />
        </Card>
        <Card title={t('empPerformanceDist') ?? 'Performance'} icon={<Star size={13} />}>
          <Bars max={d.maxPerf} empty={t('empNoData') ?? 'No data'} rows={[
            [`${t('empHighPerformers') ?? 'High'} (80+)`, d.perf.high],
            [`${t('empGood') ?? 'Good'} (60–79)`, d.perf.good],
            [`${t('empNeedsAttention') ?? 'Needs attention'} (<60)`, d.perf.low],
            [t('empUnrated') ?? 'Unrated', d.perf.unrated],
          ]} />
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title={t('empByDepartment') ?? 'By department'} icon={<Building2 size={13} />}>
          <Bars rows={d.depts} max={d.maxDept} empty="—" />
        </Card>
        <Card title={t('empByRole') ?? 'By role'} icon={<Briefcase size={13} />}>
          <Bars rows={d.roles} max={d.maxRole} empty="—" />
        </Card>
        <Card title={t('empTopPerformers') ?? 'Top performers'} icon={<Award size={13} />}>
          {d.topPerformers.length === 0 ? (
            <p className="text-xs text-slate-400">{t('empNoData') ?? 'No data'}</p>
          ) : (
            <div className="space-y-2">
              {d.topPerformers.map(e => {
                const score = e.performanceScore ?? 0
                const color = score >= 80 ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                  : score >= 60 ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                return (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{e.name}</div>
                      <div className="text-xs text-slate-400 truncate">{e.role}</div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${color}`}>
                      <Star size={10} className="fill-current" /> {score}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Expiries + turnover */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card title={t('empUpcomingExpiries') ?? 'Upcoming expiries'} icon={<AlertTriangle size={13} />}>
            {d.expiries.length === 0 ? (
              <p className="text-xs text-slate-400">{t('empNoUpcomingExpiries') ?? 'Nothing expiring soon'}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {d.expiries.slice(0, 10).map((x, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs py-1">
                    <span className="truncate text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-800 dark:text-slate-200">{x.name}</span> · {x.kind}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-full font-medium ${x.state === 'expired' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {x.state === 'expired' ? (t('empExpired') ?? 'Expired') : `${x.days}${t('empDaysLeftSuffix') ?? 'd'}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <Card title={t('empTurnover') ?? 'Turnover'} icon={<TrendingDown size={13} />}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{d.turnover}%</span>
            <span className="text-xs text-slate-400">{t('empThisYear') ?? 'this year'}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {d.newHires} {t('empNewHiresYear') ?? 'new hires this year'}
          </div>
        </Card>
      </div>
    </div>
  )
}
