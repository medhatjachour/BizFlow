/**
 * VetReportSection
 * Report section for Vet Clinic — shown at /reports
 * Supports Monthly overview and Daily report with CSV export
 */
import { useState, useEffect } from 'react'
import {
  PawPrint, Users, ClipboardList, CalendarClock,
  BarChart3, Activity, TrendingUp, AlertCircle, Loader2,
  Download, Calendar, Sun
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props { refreshSignal?: number }

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇',
  reptile: '🦎', fish: '🐠', other: '🐾'
}

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const StatCard = ({
  icon: Icon, label, value, color
}: { icon: any; label: string; value: string | number; color: string }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-1.5 rounded-lg ${color}`}><Icon size={14} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
)

type Mode = 'monthly' | 'daily'

const VetReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const toast = useToast()
  const { t } = useLanguage()
  const [mode, setMode] = useState<Mode>('monthly')
  const [loading, setLoading] = useState(true)

  // Monthly
  const [overview,  setOverview]  = useState<any>(null)
  const [species,   setSpecies]   = useState<any[]>([])
  const [upcoming,  setUpcoming]  = useState<any[]>([])
  const [followups, setFollowups] = useState<any[]>([])

  // Daily
  const [daySessions,  setDaySessions]  = useState<any[]>([])
  const [dayAppts,     setDayAppts]     = useState<any[]>([])
  const [dayExpenses,  setDayExpenses]  = useState<any[]>([])
  const [dayRevenue,   setDayRevenue]   = useState(0)
  const [dayCollected, setDayCollected] = useState(0)
  const [dayExpTotal,  setDayExpTotal]  = useState(0)

  const loadMonthly = async () => {
    const now = new Date()
    const from = now.toISOString()
    const to = new Date(now.getTime() + 7 * 86_400_000).toISOString()
    const fuFrom = new Date(now.getTime() - 30 * 86_400_000).toISOString()
    const [ov, sp, appts, fus] = await Promise.all([
      window.api.vet?.stats.overview('month').catch(() => null),
      window.api.vet?.stats.speciesBreakdown().catch(() => []),
      window.api.vet?.appointments.getAll({ from, to, skip: 0, take: 10 }).catch(() => ({ data: [] })),
      window.api.vet?.sessions.getFollowUps({ from: fuFrom, to, skip: 0, take: 10 }).catch(() => ({ data: [] })),
    ])
    setOverview(ov)
    setSpecies(Array.isArray(sp) ? sp : [])
    setUpcoming((appts as any)?.data ?? [])
    setFollowups((fus as any)?.data ?? [])
  }

  const loadDaily = async () => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const from = todayStart.toISOString()
    const to = todayEnd.toISOString()
    const [sessRes, apptsRes, expRes] = await Promise.all([
      window.api.vet?.sessions.getRecent({ filter: 'today', skip: 0, take: 500 }).catch(() => ({ data: [] })),
      window.api.vet?.appointments.getAll({ from, to, skip: 0, take: 500 }).catch(() => ({ data: [] })),
      window.api.vet?.expenses.getAll({ period: 'today', skip: 0, take: 500 }).catch(() => ({ data: [] })),
    ])
    const sessions = (sessRes as any)?.data ?? []
    const appts = (apptsRes as any)?.data ?? []
    const exps = (expRes as any)?.data ?? []
    setDaySessions(sessions)
    setDayAppts(appts)
    setDayExpenses(exps)
    const rev = sessions.reduce((s: number, x: any) => s + (Number(x.amountCharged) || 0), 0)
    const col = sessions.reduce((s: number, x: any) => s + (Number(x.amountPaid) || 0), 0)
    const exp = exps.reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0)
    setDayRevenue(rev); setDayCollected(col); setDayExpTotal(exp)
  }

  const load = async () => {
    setLoading(true)
    try {
      if (mode === 'monthly') await loadMonthly()
      else await loadDaily()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load vet report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refreshSignal, mode])

  function handleExportCSV() {
    const today = new Date().toISOString().slice(0, 10)
    if (mode === 'daily') {
      const rows: (string | number)[][] = [
        ['Patient', 'Species', 'Visit Type', 'Vet', 'Chief Complaint', 'Diagnosis', 'Charged', 'Paid', 'Payment Status', 'Time'],
        ...daySessions.map((s: any) => [
          s.patient?.name ?? '', s.patient?.species ?? '',
          s.visitType ?? '', s.vetName ?? '',
          s.chiefComplaint ?? '', s.diagnosis ?? '',
          s.amountCharged ?? 0, s.amountPaid ?? 0,
          s.paymentStatus ?? '', new Date(s.visitDate).toLocaleTimeString()
        ]),
        [], ['--- Appointments ---'],
        ['Time', 'Patient', 'Type', 'Status', 'Vet'],
        ...dayAppts.map((a: any) => [
          new Date(a.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
          a.patient?.name ?? '', a.type ?? '', a.status ?? '', a.vetName ?? ''
        ]),
        [], ['--- Expenses ---'],
        ['Description', 'Category', 'Amount', 'Vendor', 'Payment Method'],
        ...dayExpenses.map((e: any) => [
          e.description ?? '', e.category ?? '', e.amount ?? 0, e.vendor ?? '', e.paymentMethod ?? ''
        ]),
        [], ['--- Summary ---'],
        ['Revenue', dayRevenue.toFixed(2)],
        ['Collected', dayCollected.toFixed(2)],
        ['Outstanding', (dayRevenue - dayCollected).toFixed(2)],
        ['Expenses', dayExpTotal.toFixed(2)],
        ['Net Income', (dayCollected - dayExpTotal).toFixed(2)],
      ]
      downloadCSV(rows, `vet-daily-report-${today}.csv`)
    } else {
      const rows: (string | number)[][] = [
        ['Metric', 'Value'],
        ['Total Patients', overview?.totalPatients ?? 0],
        ['New Patients', overview?.newPatients ?? 0],
        ['Sessions', overview?.sessionCount ?? 0],
        ['Revenue', overview?.revenue ?? 0],
        ['Outstanding', overview?.outstanding ?? 0],
        ['Upcoming Appointments', overview?.upcomingAppts ?? 0],
        [], ['--- Species Breakdown ---'],
        ['Species', 'Count'],
        ...species.map((s: any) => [s.species, s.count]),
      ]
      downloadCSV(rows, `vet-monthly-report-${today}.csv`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800/40">
            <PawPrint size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('vetClinic') || 'Vet Clinic'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'monthly'
                ? (t('monthlyOverview') || 'Monthly overview')
                : (t('dailyReport') || 'Daily report')}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
            <button
              onClick={() => setMode('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === 'monthly'
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <Calendar size={13} /> {t('monthlyOverview') || 'Monthly'}
            </button>
            <button
              onClick={() => setMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode === 'daily'
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <Sun size={13} /> {t('dailyReport') || 'Daily'}
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Download size={14} /> {t('exportCSV') || 'Export CSV'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : mode === 'monthly' ? (
        <>
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={PawPrint}      label={t('vetTotalPatients') || 'Total Patients'}  value={overview.totalPatients ?? 0}                    color="bg-violet-100 dark:bg-violet-900/40 text-violet-600" />
              <StatCard icon={Users}         label={t('vetNewPatients')   || 'New Patients'}     value={overview.newPatients ?? 0}                      color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
              <StatCard icon={ClipboardList} label={t('vetSessions')      || 'Sessions'}         value={overview.sessionCount ?? 0}                     color="bg-teal-100 dark:bg-teal-900/40 text-teal-600" />
              <StatCard icon={TrendingUp}    label={t('vetRevenue')       || 'Revenue'}          value={(overview.revenue ?? 0).toFixed(2)}             color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
              <StatCard icon={AlertCircle}   label={t('vetOutstanding')   || 'Outstanding'}      value={(overview.outstanding ?? 0).toFixed(2)}         color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
              <StatCard icon={CalendarClock} label={t('vetUpcomingAppts') || 'Upcoming Appts'}   value={overview.upcomingAppts ?? 0}                    color="bg-sky-100 dark:bg-sky-900/40 text-sky-600" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Species breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Activity size={14} className="text-violet-500" /> {t('vetSpeciesMix') || 'Species Mix'}
              </h3>
              {species.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{t('vetNoDataYet') || 'No data'}</p>
              ) : (
                <div className="space-y-2">
                  {species.map((s: any) => {
                    const total = species.reduce((sum: number, x: any) => sum + x.count, 0)
                    const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                    return (
                      <div key={s.species}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            {SPECIES_EMOJI[s.species] ?? '🐾'}
                            <span className="capitalize">{s.species.replace('_', ' ')}</span>
                          </span>
                          <span className="text-slate-400">{s.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Upcoming (7 days) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <CalendarClock size={14} className="text-sky-500" /> {t('vetUpcoming7Days') || 'Upcoming (7 days)'}
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{t('noAppointments') || 'No upcoming appointments'}</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 py-1.5">
                      <div className="flex-shrink-0 text-center bg-sky-50 dark:bg-sky-900/20 rounded-lg px-2 py-1.5 min-w-[44px]">
                        <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          {new Date(a.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {new Date(a.appointmentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{a.patient?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-400 capitalize truncate">{a.type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Follow-ups due */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 size={14} className="text-amber-500" /> {t('vetFollowUpsDue') || 'Follow-ups Due'}
              </h3>
              {followups.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{t('noFollowUps') || 'No pending follow-ups'}</p>
              ) : (
                <div className="space-y-2">
                  {followups.map((f: any) => {
                    const diff = Math.round((new Date(f.followUpDate).getTime() - Date.now()) / 86_400_000)
                    return (
                      <div key={f.id} className="flex items-center gap-3 py-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${diff < 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : diff === 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'}`}>
                          {diff < 0
                            ? `${Math.abs(diff)}d ${t('overdue') || 'overdue'}`
                            : diff === 0 ? (t('dueToday') || 'today')
                            : `in ${diff}d`}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{f.patient?.name ?? '—'}</p>
                          {f.chiefComplaint && <p className="text-[10px] text-slate-400 truncate">{f.chiefComplaint}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ── Daily Report ─────────────────────────────────────────────── */
        <>
          {/* Daily KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={ClipboardList} label={t('vetTotalSessions')  || 'Sessions'}      value={daySessions.length}                        color="bg-teal-100 dark:bg-teal-900/40 text-teal-600" />
            <StatCard icon={TrendingUp}    label={t('vetRevenue')        || 'Revenue'}        value={dayRevenue.toFixed(2)}                     color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
            <StatCard icon={AlertCircle}   label={t('vetOutstanding')    || 'Outstanding'}    value={(dayRevenue - dayCollected).toFixed(2)}    color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" />
            <StatCard icon={CalendarClock} label={t('vetAppointments')   || 'Appointments'}   value={dayAppts.length}                           color="bg-sky-100 dark:bg-sky-900/40 text-sky-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Today Sessions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <ClipboardList size={14} className="text-teal-500" />
                {t('todaySessions') || "Today's Sessions"}
                <span className="ml-auto text-xs font-normal text-slate-400">{daySessions.length}</span>
              </h3>
              {daySessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{t('noSessions') || 'No sessions today'}</p>
              ) : (
                <div className="space-y-0 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {daySessions.map((s: any) => (
                    <div key={s.id} className="flex items-start gap-2 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{s.patient?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{s.visitType?.replace('_', ' ')}{s.vetName ? ` · Dr. ${s.vetName}` : ''}</p>
                      </div>
                      {s.amountCharged != null && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {Number(s.amountCharged).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today Appointments */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <CalendarClock size={14} className="text-sky-500" />
                {t('todayAppointments') || "Today's Appointments"}
                <span className="ml-auto text-xs font-normal text-slate-400">{dayAppts.length}</span>
              </h3>
              {dayAppts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{t('noAppointments') || 'No appointments today'}</p>
              ) : (
                <div className="space-y-0 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {dayAppts.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 py-2">
                      <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400 shrink-0 w-10">
                        {new Date(a.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{a.patient?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-400 capitalize truncate">{a.type?.replace('_', ' ')}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        a.status === 'confirmed'  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                        a.status === 'completed'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        a.status === 'cancelled'  ? 'bg-slate-100 text-slate-500' :
                        a.status === 'no_show'    ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{a.status?.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today Expenses */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 size={14} className="text-red-500" />
                {t('todayExpenses') || "Today's Expenses"}
                <span className="ml-auto text-xs font-normal text-red-500">{dayExpTotal.toFixed(2)}</span>
              </h3>
              {dayExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{t('vetNoDataYet') || 'No expenses today'}</p>
              ) : (
                <div className="space-y-0 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {dayExpenses.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{e.description}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{e.category?.replace('_', ' ')}</p>
                      </div>
                      <span className="text-xs font-semibold text-red-500 shrink-0">{Number(e.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily totals summary bar */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              {t('dailySummary') || 'Daily Summary'} — {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{t('vetRevenue') || 'Revenue'}</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{dayRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{t('amountPaid') || 'Collected'}</p>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{dayCollected.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{t('vetOutstanding') || 'Outstanding'}</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{(dayRevenue - dayCollected).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{t('vetExpenses') || 'Expenses'}</p>
                <p className="text-lg font-bold text-red-500 dark:text-red-400">{dayExpTotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{t('vetNetIncome') || 'Net Income'}</p>
                <p className={`text-lg font-bold ${dayCollected - dayExpTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {(dayCollected - dayExpTotal).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default VetReportSection
