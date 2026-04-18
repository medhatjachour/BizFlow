import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, TrendingUp, Users, Activity, DollarSign, AlertCircle, PawPrint, Info } from 'lucide-react'
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

  useEffect(() => {
    load()
  }, [period])

  const load = async () => {
    setLoading(true)
    try {
      const [ov, dx, sp, vt] = await Promise.all([
        window.api.vet?.stats.overview(period),
        window.api.vet?.stats.topDiagnoses({ limit: 8 }),
        window.api.vet?.stats.speciesBreakdown(),
        window.api.vet?.stats.visitTrend()
      ])
      setOverview(ov)
      setDiagnoses(dx ?? [])
      setSpecies(sp ?? [])
      setVisitTypes(vt ?? [])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

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
        </>
      )}
    </div>
  )
}
