import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, TrendingUp, Users, Activity, DollarSign, AlertCircle, PawPrint, Info, Pill, ShoppingBag, PackageX, AlertTriangle, TrendingDown } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

function StatsHelp() {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.top, right: window.innerWidth - r.right }) } }}
      onMouseLeave={() => setPos(null)}>
      <Info size={14} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos && createPortal(
        <div style={{ position:'fixed', top: pos.top, right: pos.right, transform:'translateY(-100%) translateY(-8px)', zIndex:9999 }}
          className="w-64 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl">
          <span className="block font-semibold text-violet-400 mb-1.5">Statistics</span>
          <span className="block mb-0.5"><span className="text-violet-300">Total Patients</span> — all pets ever registered in the system.</span>
          <span className="block mb-0.5"><span className="text-blue-300">New Patients</span> — first-time registrations in the selected period.</span>
          <span className="block mb-0.5"><span className="text-teal-300">Sessions</span> — completed vet visits in the period.</span>
          <span className="block mb-0.5"><span className="text-emerald-300">Revenue</span> — amount charged across all sessions.</span>
          <span className="block mb-0.5"><span className="text-amber-300">Outstanding</span> — unpaid balances from patients.</span>
          <span className="block"><span className="text-sky-300">Upcoming Appts</span> — scheduled appointments in the future.</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>,
        document.body
      )}
    </span>
  )
}

type Period = 'today' | 'week' | 'month' | 'year'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇',
  guinea_pig: '🐹', reptile: '🦎', fish: '🐠', other: '🐾'
}

export default function VetStatsTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const [period, setPeriod] = useState<Period>('month')
  const [overview, setOverview] = useState<any | null>(null)
  const [diagnoses, setDiagnoses] = useState<any[]>([])
  const [species, setSpecies] = useState<any[]>([])
  const [visitTypes, setVisitTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [medSummary, setMedSummary] = useState<any | null>(null)
  const [allMedicines, setAllMedicines] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [period])

  const load = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const to  = now.toISOString()
      let from: string
      if      (period === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); from = d.toISOString() }
      else if (period === 'week')  { from = new Date(now.getTime() - 7   * 86400000).toISOString() }
      else if (period === 'year')  { from = new Date(now.getTime() - 365 * 86400000).toISOString() }
      else                         { from = new Date(now.getTime() - 30  * 86400000).toISOString() }

      const [ov, dx, sp, vt, ms, meds] = await Promise.all([
        window.api.vet?.stats.overview(period),
        window.api.vet?.stats.topDiagnoses({ limit: 8 }),
        window.api.vet?.stats.speciesBreakdown(),
        window.api.vet?.stats.visitTrend(),
        window.api.vet?.medicines.getSummary({ from, to }),
        window.api.vet?.medicines.getAll({ take: 200 })
      ])
      setOverview(ov)
      setDiagnoses(dx ?? [])
      setSpecies(sp ?? [])
      setVisitTypes(vt ?? [])
      setMedSummary(ms ?? null)
      setAllMedicines(meds?.data ?? [])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  // ── Expiry computations (derived from allMedicines) ────────────────────────
  const nowMs = Date.now()
  const allBatches = allMedicines.flatMap((m: any) =>
    (m.batches ?? []).map((b: any) => ({ ...b, medicineName: m.name, unit: m.unit }))
  )
  const expiredBatches   = allBatches.filter((b: any) => new Date(b.expiryDate).getTime() < nowMs && b.quantity > 0)
  const expiring7Batches = allBatches.filter((b: any) => {
    const diff = (new Date(b.expiryDate).getTime() - nowMs) / 86400000
    return diff >= 0 && diff <= 7 && b.quantity > 0
  })
  const expiring30Batches = allBatches.filter((b: any) => {
    const diff = (new Date(b.expiryDate).getTime() - nowMs) / 86400000
    return diff > 7 && diff <= 30 && b.quantity > 0
  })
  const expiredValue    = expiredBatches.reduce((s: number, b: any) => s + b.quantity * (b.costPerUnit ?? 0), 0)
  const expiring7Value  = expiring7Batches.reduce((s: number, b: any) => s + b.quantity * (b.costPerUnit ?? 0), 0)
  const expiring30Value = expiring30Batches.reduce((s: number, b: any) => s + b.quantity * (b.costPerUnit ?? 0), 0)
  const totalExpiryValue = expiredValue + expiring7Value + expiring30Value
  const topExpired     = [...expiredBatches]
    .sort((a: any, b: any) => (b.quantity * b.costPerUnit) - (a.quantity * a.costPerUnit))
    .slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(['today', 'week', 'month', 'year'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${period === p ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {p === 'today' ? (t('vetFilterToday')||'Today') : p === 'week' ? (t('vetFilterWeek')||'Week') : p === 'month' ? (t('vetFilterMonth')||'Month') : (t('vetFilterYear')||'Year')}
            </button>
          ))}
        </div>
        <StatsHelp />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : !overview ? null : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
                          { label: t('vetTotalPatients')||'Total Patients',  value: overview.totalPatients,  icon: PawPrint,    color: 'text-violet-600 dark:text-violet-400' },
              { label: t('vetNewPatients')||'New Patients',    value: overview.newPatients,    icon: Users,       color: 'text-blue-600 dark:text-blue-400' },
              { label: t('vetTotalSessions')||'Sessions',      value: overview.sessionCount,   icon: Activity,    color: 'text-teal-600 dark:text-teal-400' },
              { label: t('vetRevenue')||'Revenue',             value: `${(overview.revenue ?? 0).toFixed(2)}`,   icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: t('vetOutstanding')||'Outstanding',     value: `${(overview.outstanding ?? 0).toFixed(2)}`, icon: AlertCircle, color: overview.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400' },
              { label: t('vetUpcomingAppts')||'Upcoming Appts',value: overview.upcomingAppts,  icon: DollarSign,  color: 'text-slate-600 dark:text-slate-300' }
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                <Icon className={`h-5 w-5 mx-auto mb-1.5 ${color}`} />
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Species breakdown */}
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('vetSpeciesMix')||'Species Breakdown'}</h3>
              <div className="space-y-2">
                {species.map((s: any) => {
                  const total = species.reduce((sum: number, x: any) => sum + x.count, 0)
                  const pct   = total > 0 ? Math.round((s.count / total) * 100) : 0
                  return (
                    <div key={s.species}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          {SPECIES_EMOJI[s.species] ?? '🐾'} <span className="capitalize">{s.species.replace('_', ' ')}</span>
                        </span>
                        <span className="text-xs text-slate-400">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {species.length === 0 && <p className="text-xs text-slate-400 text-center py-4">{t('vetNoDataYet')||'No data yet'}</p>}
              </div>
            </div>

            {/* Visit type breakdown */}
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('visitTypes')||'Visit Types'}</h3>
              <div className="space-y-2">
                {visitTypes.map((v: any) => {
                  const totalVt = visitTypes.reduce((sum: number, x: any) => sum + x.count, 0)
                  const pct = totalVt > 0 ? Math.round((v.count / totalVt) * 100) : 0
                  return (
                    <div key={v.visitType}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{v.visitType.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400">{v.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {visitTypes.length === 0 && <p className="text-xs text-slate-400 text-center py-4">{t('vetNoDataYet')||'No data yet'}</p>}
              </div>
            </div>

            {/* Top diagnoses */}
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('topDiagnoses')||'Top Diagnoses'}</h3>
              <div className="space-y-2">
                {diagnoses.map((d: any, i: number) => (
                  <div key={d.diagnosis} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{d.diagnosis}</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">{d.count}</span>
                  </div>
                ))}
                {diagnoses.length === 0 && <p className="text-xs text-slate-400 text-center py-4">{t('vetNoDataYet')||'No data yet'}</p>}
              </div>
            </div>
          </div>

          {/* ─── Medicine Sales KPIs ─────────────────────────────────────── */}
          {medSummary && (
            <>
              <div>
                <h2 className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  <Pill size={13} /> Medicine Sales
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Med Sales',    value: String(medSummary.saleCount),             icon: ShoppingBag,  color: 'text-violet-600 dark:text-violet-400' },
                    { label: 'Med Revenue',  value: `$${medSummary.revenue.toFixed(2)}`,      icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'COGS',         value: `$${medSummary.costOfGoods.toFixed(2)}`,  icon: TrendingDown, color: 'text-orange-500 dark:text-orange-400' },
                    { label: 'Gross Profit', value: `$${medSummary.grossProfit.toFixed(2)}`,  icon: DollarSign,   color: medSummary.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400' },
                    { label: 'Margin',       value: `${medSummary.margin.toFixed(1)}%`,       icon: Activity,     color: medSummary.margin >= 40 ? 'text-emerald-600 dark:text-emerald-400' : medSummary.margin >= 20 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                      <Icon className={`h-5 w-5 mx-auto mb-1.5 ${color}`} />
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Expiry Alerts + Top Medicines ─────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expiry Alerts */}
                <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <PackageX size={15} className="text-red-500" /> Batch Expiry Alerts
                    </h3>
                    {totalExpiryValue > 0 && (
                      <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                        ${totalExpiryValue.toFixed(2)} total at risk
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded-lg p-3 text-center ${expiredBatches.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700'}`}>
                      <p className={`text-2xl font-bold ${expiredBatches.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>{expiredBatches.length}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Expired batches</p>
                      {expiredBatches.length > 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">${expiredValue.toFixed(2)} at risk</p>}
                    </div>
                    <div className={`rounded-lg p-3 text-center ${expiring7Batches.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700'}`}>
                      <p className={`text-2xl font-bold ${expiring7Batches.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{expiring7Batches.length}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Expire in 7d</p>
                      {expiring7Batches.length > 0 && <p className="text-[10px] text-amber-500 font-medium mt-0.5">${expiring7Value.toFixed(2)}</p>}
                    </div>
                    <div className={`rounded-lg p-3 text-center ${expiring30Batches.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700'}`}>
                      <p className={`text-2xl font-bold ${expiring30Batches.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-400'}`}>{expiring30Batches.length}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Expire in 30d</p>
                      {expiring30Batches.length > 0 && <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium mt-0.5">${expiring30Value.toFixed(2)}</p>}
                    </div>
                  </div>
                  {topExpired.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <AlertTriangle size={11} className="text-red-500" /> Top expired by value
                      </p>
                      <div className="space-y-1.5">
                        {topExpired.map((b: any, i: number) => (
                          <div key={b.id} className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 w-4 shrink-0">{i + 1}</span>
                            <span className="flex-1 text-slate-700 dark:text-slate-300 truncate font-medium">{b.medicineName}</span>
                            <span className="text-slate-400 shrink-0">{b.quantity} {b.unit}</span>
                            <span className="text-red-500 font-semibold shrink-0">${(b.quantity * (b.costPerUnit ?? 0)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {expiredBatches.length === 0 && expiring7Batches.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No expiry issues — all good!</p>
                  )}
                </div>

                {/* Top Medicines by Revenue */}
                <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Pill size={15} className="text-violet-500" /> Top Medicines by Revenue
                  </h3>
                  <div className="space-y-2.5">
                    {medSummary.topMedicines.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No sales in this period</p>}
                    {medSummary.topMedicines.map((m: any, i: number) => {
                      const maxRev = medSummary.topMedicines[0]?.revenue ?? 1
                      const pct    = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0
                      return (
                        <div key={m.id}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400 w-4 shrink-0">{i + 1}</span>
                              <span className="truncate max-w-[140px]">{m.name}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{m.saleCount}×</span>
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">${m.revenue.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
