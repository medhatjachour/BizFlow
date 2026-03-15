/**
 * ClinicDashboardSection — comprehensive clinical operations analytics.
 *
 * Concurrent IPC (Promise.allSettled) + Web Worker for:
 *   COMPUTE_AGE_DISTRIBUTION  → patient age buckets + average age
 *   COMPUTE_TRENDS            → 7-day session volume sparkline
 *   COMPUTE_DIAGNOSIS_FREQ    → top diagnoses frequency ranking
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stethoscope, Users, CalendarClock, FileText, Activity,
  Heart, Pill, TrendingUp, TrendingDown, BarChart3, Minus, Clock,
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { TrendsResult, AgeDistResult, DiagnosisFreqResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }

interface ClinicData {
  patientCount: number
  patients: any[]           // for age computation
  todaySessions: any[]
  weekSessions: any[]
  upcomingFollowUps: any[]
  prescriptionsToday: any[]
  recentDiagnoses: string[]  // raw diagnosis strings for freq computation
}

const EMPTY: ClinicData = {
  patientCount: 0, patients: [], todaySessions: [], weekSessions: [],
  upcomingFollowUps: [], prescriptionsToday: [], recentDiagnoses: [],
}

// Age-bucket colours
const AGE_BUCKET_COLORS: Record<string, string> = {
  '0–17':  'bg-sky-500',
  '18–35': 'bg-emerald-500',
  '36–50': 'bg-amber-500',
  '51–65': 'bg-orange-500',
  '65+':   'bg-red-500',
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; color: string; trend?: 'up' | 'down' | 'flat'
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-1.5 rounded-lg ${color}`}><Icon size={15} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    <div className="flex items-center gap-1 mt-1">
      {trend === 'up'   && <TrendingUp   size={12} className="text-emerald-500" />}
      {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
      {trend === 'flat' && <Minus        size={12} className="text-slate-400" />}
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

export default function ClinicDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { compute } = useDashboardWorker()

  const [loading, setLoading]         = useState(true)
  const [raw, setRaw]                 = useState<ClinicData>(EMPTY)
  const [ageDist, setAgeDist]         = useState<AgeDistResult | null>(null)
  const [sessionTrend, setSessionTrend] = useState<TrendsResult | null>(null)
  const [diagFreq, setDiagFreq]       = useState<DiagnosisFreqResult | null>(null)

  useEffect(() => { load() }, [refreshSignal])

  const load = async () => {
    try {
      setLoading(true)
      const api = (globalThis as any).api?.clinic
      if (!api) { setLoading(false); return }

      const today    = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 7)

      // All IPC calls in parallel ────────────────────────────────────────────
      const [countR, patientsR, todaySessionsR, weekSessionsR, followUpsR, rxR] =
        await Promise.allSettled([
          api.getPatientCount?.(),
          api.getPatients?.({ limit: 200 }),
          api.getSessions?.({ startDate: today.toISOString(),   endDate: tomorrow.toISOString() }),
          api.getSessions?.({ startDate: weekAgo.toISOString(), endDate: tomorrow.toISOString() }),
          api.getUpcomingFollowUps?.(7),
          api.getPrescriptions?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        ])

      const patientCount   = countR.status         === 'fulfilled' ? (countR.value?.count ?? countR.value ?? 0) : 0
      const patients       = patientsR.status      === 'fulfilled' ? (patientsR.value     || []) : []
      const todaySessions  = todaySessionsR.status === 'fulfilled' ? (todaySessionsR.value || []) : []
      const weekSessions   = weekSessionsR.status  === 'fulfilled' ? (weekSessionsR.value  || []) : []
      const upcomingFU     = followUpsR.status     === 'fulfilled' ? (followUpsR.value     || []) : []
      const rxToday        = rxR.status            === 'fulfilled' ? (rxR.value            || []) : []

      // Collect diagnosis strings from session notes ─────────────────────────
      const diagnoses = weekSessions
        .flatMap((s: any) => typeof s.diagnosis === 'string' ? [s.diagnosis] : (s.diagnoses || []))
        .filter(Boolean)

      const data: ClinicData = {
        patientCount, patients, todaySessions, weekSessions,
        upcomingFollowUps: upcomingFU, prescriptionsToday: rxToday,
        recentDiagnoses: diagnoses,
      }
      setRaw(data)

      // Build 7-day daily bucket ────────────────────────────────────────────
      const dailySessions = buildDailyBuckets(weekSessions, 7)

      // Worker computations in parallel ────────────────────────────────────
      const birthDates = patients
        .map((p: any) => p.dateOfBirth || p.birthDate || p.dob)
        .filter(Boolean)

      const [trendResult, ageResult, diagResult] = await Promise.all([
        compute<TrendsResult>('COMPUTE_TRENDS', {
          values: dailySessions.map(d => d.count),
          labels: dailySessions.map(d => d.label),
        }),
        birthDates.length
          ? compute<AgeDistResult>('COMPUTE_AGE_DISTRIBUTION', { birthDates })
          : Promise.resolve(null),
        diagnoses.length
          ? compute<DiagnosisFreqResult>('COMPUTE_DIAGNOSIS_FREQ', { diagnoses })
          : Promise.resolve(null),
      ])

      setSessionTrend(trendResult)
      setAgeDist(ageResult)
      setDiagFreq(diagResult)
    } catch (err) {
      logger.error('ClinicDashboardSection load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const buildDailyBuckets = (sessions: any[], days: number) => {
    const result: { label: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d    = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const count = sessions.filter((s: any) => {
        const sd = new Date(s.createdAt || s.sessionDate || s.date || 0)
        return sd >= d && sd < next
      }).length
      result.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), count })
    }
    return result
  }

  const trendData = useMemo(() =>
    sessionTrend ? sessionTrend.movingAvg.map((v, i) => ({ v: +v.toFixed(1), label: sessionTrend.labels[i] || `D${i+1}` })) : []
  , [sessionTrend])

  // Sort today's sessions by time
  const sortedSessions = useMemo(() =>
    [...raw.todaySessions].sort((a, b) => {
      const ta = new Date(a.scheduledTime || a.startTime || 0).getTime()
      const tb = new Date(b.scheduledTime || b.startTime || 0).getTime()
      return ta - tb
    })
  , [raw.todaySessions])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/30 rounded-lg" />
          <div className="space-y-1">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-24 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-48 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Plugin header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
          <Stethoscope size={20} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('clinic') || 'Clinic'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('clinicOverview') || "Today's clinical overview"}</p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users}        label="Total Patients"   value={raw.patientCount}
          sub={`${ageDist?.avgAge ? `avg ${ageDist.avgAge}y` : ''}`}
          color="bg-teal-100 dark:bg-teal-900/30 text-teal-600" trend="flat" />
        <StatCard icon={Activity}     label="Sessions Today"   value={raw.todaySessions.length}
          sub={`${raw.todaySessions.filter((s: any) => s.status === 'completed').length} done`}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          trend={sessionTrend?.trend ?? 'flat'} />
        <StatCard icon={CalendarClock} label="Follow-ups (7d)" value={raw.upcomingFollowUps.length}
          sub="upcoming"
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          trend={raw.upcomingFollowUps.length > 5 ? 'up' : 'flat'} />
        <StatCard icon={Pill}          label="Prescriptions"   value={raw.prescriptionsToday.length}
          sub="issued today"
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600" trend="flat" />
        <StatCard icon={Heart}         label="Avg Patient Age" value={ageDist?.avgAge ? `${ageDist.avgAge}y` : '—'}
          sub={ageDist?.dominant ? `most: ${ageDist.dominant}` : ''}
          color="bg-rose-100 dark:bg-rose-900/30 text-rose-600" trend="flat" />
      </div>

      {/* ── Row 2: Trend + Today's schedule + Diagnosis frequency ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 7-day session trend */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <BarChart3 size={16} /> 7-Day Sessions
            </h3>
            {sessionTrend && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                sessionTrend.trend === 'up'   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                sessionTrend.trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {sessionTrend.change >= 0 ? '+' : ''}{sessionTrend.change.toFixed(0)}%
              </span>
            )}
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={trendData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v} sessions`, '']} contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="v" stroke="#14b8a6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-xs text-slate-400">No session history</div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            <div><span className="block font-semibold text-slate-800 dark:text-white">{sessionTrend?.avg.toFixed(1) ?? '—'}</span>Avg/day</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{sessionTrend?.max ?? '—'}</span>Peak</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{raw.weekSessions.length}</span>This week</div>
          </div>
        </div>

        {/* Today's session schedule */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <Clock size={16} /> Today's Schedule
          </h3>
          {sortedSessions.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {sortedSessions.map((session: any, i: number) => {
                const time = session.scheduledTime || session.startTime
                  ? new Date(session.scheduledTime || session.startTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
                  : null
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex-shrink-0 text-center w-10">
                      <p className="text-xs font-bold text-teal-600">{time || '?'}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-white truncate">
                        {session.patientName || session.patient?.name || 'Patient'}
                      </p>
                      <p className="text-xs text-slate-500">{session.type || session.sessionType || 'Visit'}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      session.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      session.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>{session.status || 'scheduled'}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <CalendarClock size={24} className="opacity-30" />
              No sessions today
            </div>
          )}
        </div>

        {/* Diagnosis frequency */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <FileText size={16} /> Top Diagnoses (7d)
          </h3>
          {diagFreq && diagFreq.ranked.length > 0 ? (
            <div className="space-y-2">
              {diagFreq.ranked.slice(0, 6).map((diag, i) => {
                const pct = Math.round((diag.count / diagFreq.total) * 100)
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{diag.name}</span>
                      <span className="text-slate-500">{diag.count}×</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className="h-1.5 rounded-full bg-teal-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-slate-400 mt-2">{diagFreq.unique} unique diagnoses · {diagFreq.total} total</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <Stethoscope size={24} className="opacity-30" />
              No diagnoses recorded
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Age distribution + Follow-ups + Quick links ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Age distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <Users size={16} /> Patient Age Distribution
          </h3>
          {ageDist && ageDist.total > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(ageDist.buckets).map(([bucket, count]) => {
                const pct = Math.round((count / ageDist.total) * 100)
                return (
                  <div key={bucket}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{bucket}</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-2 rounded-full ${AGE_BUCKET_COLORS[bucket] || 'bg-teal-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-slate-400 mt-1">Avg age: {ageDist.avgAge}y · {ageDist.total} patients with DOB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs gap-2">
              <Heart size={24} className="opacity-30" />
              No age data available
            </div>
          )}
        </div>

        {/* Upcoming follow-ups */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <CalendarClock size={16} /> Upcoming Follow-ups
          </h3>
          {raw.upcomingFollowUps.length > 0 ? (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {raw.upcomingFollowUps.slice(0, 6).map((fu: any, i: number) => {
                const date = fu.followUpDate || fu.scheduledDate || fu.date
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex-shrink-0">
                      <CalendarClock size={14} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-white truncate">
                        {fu.patientName || fu.patient?.name || 'Patient'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {date ? new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}
                        {fu.reason ? ` · ${fu.reason}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs gap-2">
              <CalendarClock size={24} className="opacity-30" />
              No follow-ups in next 7 days
            </div>
          )}
        </div>

        {/* Quick nav links */}
        <div className="space-y-2">
          {[
            { tab: 'patients',      icon: Users,         label: 'Patients',       sub: 'View patient records' },
            { tab: 'sessions',      icon: Activity,      label: 'Sessions',       sub: 'Session notes & vitals' },
            { tab: 'prescriptions', icon: Pill,          label: 'Prescriptions',  sub: 'Prescription history' },
            { tab: 'follow-ups',    icon: CalendarClock, label: 'Follow-ups',     sub: 'Schedule follow-up visits' },
          ].map(({ tab, icon: Icon, label, sub }) => (
            <button
              key={tab}
              onClick={() => navigate(`/clinic?tab=${tab}`)}
              className="w-full bg-white dark:bg-slate-800 rounded-lg px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-left hover:border-teal-400 transition-colors group flex items-center gap-3"
            >
              <Icon size={15} className="text-teal-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-xs">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
