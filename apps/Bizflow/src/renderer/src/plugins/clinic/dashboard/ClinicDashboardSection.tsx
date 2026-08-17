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
  Heart, Pill, TrendingUp, TrendingDown, BarChart3, Minus, Clock, Plus,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { TrendsResult, AgeDistResult, DiagnosisFreqResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'
import { AppointmentFormModal } from '../pages/appointments/components/AppointmentFormModal'

interface Props { refreshSignal?: number }

interface ClinicData {
  patientCount: number
  patients: any[]           // for age computation
  todaySessions: any[]
  weekSessions: any[]
  upcomingFollowUps: any[]
  prescriptionsToday: any[]
  recentDiagnoses: string[]  // raw diagnosis strings for freq computation
  todayAppointments: any[]
}

const toArray = <T = any>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data as T[]
  }
  return []
}

const EMPTY: ClinicData = {
  patientCount: 0, patients: [], todaySessions: [], weekSessions: [],
  upcomingFollowUps: [], prescriptionsToday: [], recentDiagnoses: [],
  todayAppointments: [],
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
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => { load() }, [refreshSignal])

  const load = async () => {
    try {
      setLoading(true)
      const api = (globalThis as any).api?.clinic
      if (!api) { setLoading(false); return }

      // All IPC calls in parallel ────────────────────────────────────────────
      const [overviewR, patientsR, todaySessionsR, weekSessionsR, apptsTodayR, followUpApptsR] =
        await Promise.allSettled([
          api.stats?.overview?.(),
          api.patients?.getAll?.({ limit: 200 }),
          api.sessions?.getRecent?.({ filter: 'today' }),
          api.sessions?.getRecent?.({ filter: 'week' }),
          api.appointments?.getToday?.(),
          api.appointments?.getAll?.({ type: 'follow_up' }),
        ])

      const overview          = overviewR.status      === 'fulfilled' ? (overviewR.value ?? {}) : {}
      const patients          = patientsR.status      === 'fulfilled' ? toArray(patientsR.value) : []
      const todaySessions     = todaySessionsR.status === 'fulfilled' ? toArray(todaySessionsR.value) : []
      const weekSessions      = weekSessionsR.status  === 'fulfilled' ? toArray(weekSessionsR.value) : []
      const todayAppointments = apptsTodayR.status    === 'fulfilled' ? toArray(apptsTodayR.value) : []
      const allFollowUpAppts  = followUpApptsR.status === 'fulfilled' ? toArray(followUpApptsR.value) : []

      const patientCount   = (overview as any).totalPatients ?? patients.length
      // Follow-up appointments: scheduled/confirmed, within 30 days past or 30 days ahead
      const now = new Date(); now.setHours(0, 0, 0, 0)
      const past30 = new Date(now); past30.setDate(now.getDate() - 30)
      const ahead30 = new Date(now); ahead30.setDate(now.getDate() + 30)
      const upcomingFU = allFollowUpAppts.filter((a: any) => {
        const d = new Date(a.appointmentDate)
        return ['scheduled', 'confirmed'].includes(a.status) && d >= past30 && d <= ahead30
      }).sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
      const rxToday        = todaySessions.flatMap((s: any) => s.prescriptions ?? [])

      // Collect diagnosis strings from session notes ─────────────────────────
      const diagnoses = weekSessions
        .flatMap((s: any) => typeof s.diagnosis === 'string' ? [s.diagnosis] : (s.diagnoses || []))
        .filter(Boolean)

      const data: ClinicData = {
        patientCount, patients, todaySessions, weekSessions,
        upcomingFollowUps: upcomingFU, prescriptionsToday: rxToday,
        recentDiagnoses: diagnoses, todayAppointments,
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

  // Sort today's appointments by time
  const sortedAppointments = useMemo(() =>
    [...raw.todayAppointments].sort((a, b) => {
      const ta = new Date(a.appointmentDate || 0).getTime()
      const tb = new Date(b.appointmentDate || 0).getTime()
      return ta - tb
    })
  , [raw.todayAppointments])

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
    <>
    <div className="space-y-4">
      {/* Plugin header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <Stethoscope size={20} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t('clinic') || 'Clinic'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('clinicOverview') || "Today's clinical overview"}</p>
          </div>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-teal-500/20"
        >
          <Plus size={15} /> {t('bookAppointment')}
        </button>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users}        label={t('totalPatientsLabel')}   value={raw.patientCount}
          sub={ageDist?.avgAge ? `${t('clinicAvgNote')} ${ageDist.avgAge}y` : ''}
          color="bg-teal-100 dark:bg-teal-900/30 text-teal-600" trend="flat" />
        <StatCard icon={Activity}     label={t('sessionsTodayLabel')}   value={raw.todaySessions.length}
          sub={`${raw.todaySessions.filter((s: any) => s.status === 'completed').length} ${t('clinicDoneNote')}`}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          trend={sessionTrend?.trend ?? 'flat'} />
        <StatCard icon={CalendarClock} label={t('clinicStatFollowUps7d')} value={raw.upcomingFollowUps.length}
          sub={t('clinicUpcomingCount')}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          trend={raw.upcomingFollowUps.length > 5 ? 'up' : 'flat'} />
        <StatCard icon={Pill}          label={t('prescriptionsLabel')}   value={raw.prescriptionsToday.length}
          sub={t('issuedTodayNote')}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600" trend="flat" />
        <StatCard icon={Heart}         label={t('clinicStatAvgAge')} value={ageDist?.avgAge ? `${ageDist.avgAge}y` : '—'}
          sub={ageDist?.dominant ? `${t('clinicMostNote')}: ${ageDist.dominant}` : ''}
          color="bg-rose-100 dark:bg-rose-900/30 text-rose-600" trend="flat" />
      </div>

      {/* ── Row 2: Trend + Today's schedule + Diagnosis frequency ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 7-day session trend */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <BarChart3 size={16} /> {t('clinic7DaySessions')}
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
            <div className="h-[100px] flex items-center justify-center text-xs text-slate-400">{t('clinicNoSessionHistory')}</div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            <div><span className="block font-semibold text-slate-800 dark:text-white">{sessionTrend?.avg.toFixed(1) ?? '—'}</span>{t('clinicAvgPerDay')}</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{sessionTrend?.max ?? '—'}</span>{t('clinicPeak')}</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{raw.weekSessions.length}</span>{t('clinicThisWeek')}</div>
          </div>
        </div>

        {/* Today's Appointments — full-featured panel */}
        <div className="bg-white col-span-2 dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Clock size={16} className="text-teal-500" />
              {t('todaysAppointments')}
              {sortedAppointments.length > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full font-medium">
                  {sortedAppointments.length}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/clinic?tab=appointments')}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
              >
                {t('viewAll')}
              </button>
              <button
                onClick={() => setShowBooking(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm shadow-teal-500/20"
              >
                <Plus size={12} /> {t('book')}
              </button>
            </div>
          </div>

          {/* Stats mini-row */}
          {sortedAppointments.length > 0 && (() => {
            const done      = sortedAppointments.filter((a: any) => a.status === 'completed').length
            const upcoming  = sortedAppointments.filter((a: any) => ['scheduled', 'confirmed'].includes(a.status)).length
            const cancelled = sortedAppointments.filter((a: any) => ['cancelled', 'no_show'].includes(a.status)).length
            return (
              <div className="flex gap-3 mb-3">
                {[
                  { label: t('clinicUpcomingCount'), val: upcoming,  icon: Clock,          cls: 'text-blue-500' },
                  { label: t('clinicDoneCount'),     val: done,       icon: CheckCircle2,   cls: 'text-emerald-500' },
                  { label: t('clinicMissedCount'),   val: cancelled,  icon: XCircle,       cls: 'text-red-400' },
                ].map(({ label, val, icon: Ic, cls }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Ic size={12} className={cls} />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{val}</span> {label}
                  </div>
                ))}
              </div>
            )
          })()}

          {sortedAppointments.length > 0 ? (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {sortedAppointments.map((appt: any, i: number) => {
                const time = new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                const isPast = new Date(appt.appointmentDate) < new Date()
                const statusColor =
                  appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  appt.status === 'confirmed' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                  appt.status === 'cancelled' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  appt.status === 'no_show'   ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                const typeColor =
                  appt.type === 'consultation' ? 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400' :
                  appt.type === 'follow_up'    ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' :
                  appt.type === 'procedure'    ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' :
                  'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                return (
                  <div
                    key={i}
                    onClick={() => navigate('/clinic?tab=appointments')}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors group
                      ${isPast && appt.status === 'scheduled'
                        ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30'
                        : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <div className="flex-shrink-0 text-center w-11 bg-white dark:bg-slate-800 rounded-lg py-1 shadow-sm">
                      <p className="text-xs font-bold text-teal-600 dark:text-teal-400 leading-tight">{time}</p>
                      {appt.duration && <p className="text-[9px] text-slate-400">{appt.duration}m</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-[110px]">
                          {appt.patient?.name || 'Patient'}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColor}`}>
                          {(appt.type || 'consult').replace('_', ' ')}
                        </span>
                        {isPast && appt.status === 'scheduled' && (
                          <AlertCircle size={11} className="text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      {appt.doctorName && (
                        <p className="text-[10px] text-slate-400 truncate">{t('drPrefix')} {appt.doctorName}</p>
                      )}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${statusColor}`}>
                      {(appt.status || 'scheduled').replace('_', ' ')}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <CalendarClock size={24} className="opacity-30" />
              <p>{t('clinicNoApptToday')}</p>
              <button
                onClick={() => setShowBooking(true)}
                className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium hover:underline"
              >
                <Plus size={12} /> {t('bookFirstAppointment')}
              </button>
            </div>
          )}
        </div>

    
      </div>

      {/* ── Row 3: Age distribution + Follow-ups + Quick links ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Age distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <Users size={16} /> {t('patientAgeDistribution')}
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
              <p className="text-xs text-slate-400 mt-1">{t('clinicAvgAgeNote')}: {ageDist.avgAge}y · {ageDist.total} {t('clinicPatientsWithDOB')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs gap-2">
              <Heart size={24} className="opacity-30" />
              {t('clinicNoAgeData')}
            </div>
          )}
        </div>

        {/* Upcoming follow-ups — now sourced from follow_up type appointments */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <CalendarClock size={16} className="text-amber-500" /> {t('clinicUpcomingFollowUps')}
            </h3>
            <button
              onClick={() => navigate('/clinic?tab=appointments')}
              className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline"
            >
              {t('viewAll')}
            </button>
          </div>
          {raw.upcomingFollowUps.length > 0 ? (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {raw.upcomingFollowUps.slice(0, 5).map((appt: any, i: number) => {
                const diff = Math.round((new Date(appt.appointmentDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
                const isOverdue = diff < 0
                const isToday   = diff === 0
                return (
                  <div
                    key={i}
                    onClick={() => navigate(`/clinic/patients/${appt.patientId}`)}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isOverdue ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' : isToday ? 'bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <CalendarClock size={13} className={isOverdue ? 'text-red-500 flex-shrink-0' : isToday ? 'text-amber-500 flex-shrink-0' : 'text-teal-500 flex-shrink-0'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-white truncate">
                        {appt.patient?.name || 'Patient'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(appt.appointmentDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        {isOverdue && <span className="text-red-500 font-medium"> · {Math.abs(diff)}d {t('followUpOverdueCard')}</span>}
                        {isToday   && <span className="text-amber-600 font-medium"> · {t('dueTodayBadge')}</span>}
                        {!isOverdue && !isToday && <span> · {t('inDays')} {diff}d</span>}
                        {appt.doctorName ? ` · ${t('drPrefix')} ${appt.doctorName}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs gap-2">
              <CalendarClock size={24} className="opacity-30" />
              {t('noFollowUpsCategory')}
            </div>
          )}
        </div>
        {/* Diagnosis frequency */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <FileText size={16} /> {t('clinicDiagnosisFrequency')}
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
              <p className="text-xs text-slate-400 mt-2">{diagFreq.unique} {t('uniqueDiagnosesNote')} · {diagFreq.total} {t('totalDiagnosesNote')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <Stethoscope size={24} className="opacity-30" />
              {t('clinicNoDiagnosesWeek')}
            </div>
          )}
        </div>
 

      </div>
    </div>

    {showBooking && (
      <AppointmentFormModal
        existing={null}
        onClose={() => setShowBooking(false)}
        onSaved={() => { setShowBooking(false); load() }}
      />
    )}
    </>
  )
}
