import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, CalendarClock, BellRing, CheckCircle2, ArrowRight, Clock3, DollarSign } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  refreshSignal?: number
}

interface VetDashboardData {
  todayAppointments: any[]
  todayFollowUps: any[]
  todaySessions: any[]
}

const EMPTY: VetDashboardData = {
  todayAppointments: [],
  todayFollowUps: [],
  todaySessions: []
}

const toArray = <T = any,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data as T[]
  }
  return []
}

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function StatCard({ label, value, sub, icon: Icon, tone }: {
  label: string
  value: number | string
  sub: string
  icon: React.ElementType
  tone: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 min-h-[108px]">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-4">{label}</span>
        <div className={`p-1.5 rounded-lg ${tone}`}><Icon size={15} /></div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-4">{sub}</p>
    </div>
  )
}

export default function VetDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [raw, setRaw] = useState<VetDashboardData>(EMPTY)

  useEffect(() => {
    void load()
  }, [refreshSignal])

  const load = async () => {
    try {
      setLoading(true)
      const api = (globalThis as any).api?.vet
      if (!api) {
        setRaw(EMPTY)
        return
      }

      const now = new Date()
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(now)
      dayEnd.setHours(23, 59, 59, 999)

      const [appointmentsRes, followUpsRes, sessionsRes] = await Promise.allSettled([
        api.appointments?.getAll?.({ date: toYmd(now), take: 100 }),
        api.sessions?.getFollowUps?.({ from: dayStart.toISOString(), to: dayEnd.toISOString(), take: 100 }),
        api.sessions?.getRecent?.({ filter: 'today', take: 100 })
      ])

      const appointments = appointmentsRes.status === 'fulfilled' ? toArray(appointmentsRes.value) : []
      const followUps = followUpsRes.status === 'fulfilled' ? toArray(followUpsRes.value) : []
      const sessions = sessionsRes.status === 'fulfilled' ? toArray(sessionsRes.value) : []

      setRaw({
        todayAppointments: appointments,
        todayFollowUps: followUps,
        todaySessions: sessions
      })
    } finally {
      setLoading(false)
    }
  }

  const scheduledAppointments = useMemo(
    () => raw.todayAppointments.filter((a) => ['scheduled', 'confirmed'].includes(String(a.status ?? '').toLowerCase())),
    [raw.todayAppointments]
  )

  const sessionsDone = useMemo(
    () => raw.todaySessions.filter((s) => String(s.status ?? '').toLowerCase() === 'completed'),
    [raw.todaySessions]
  )

  const followUpsDueToday = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    return raw.todayFollowUps.filter((f) => {
      const d = new Date(f.followUpDate || 0)
      return d >= start && d <= end
    })
  }, [raw.todayFollowUps])

  const sortedAppointments = useMemo(
    () => [...scheduledAppointments].sort((a, b) => new Date(a.appointmentDate || 0).getTime() - new Date(b.appointmentDate || 0).getTime()),
    [scheduledAppointments]
  )

  const sortedFollowUps = useMemo(
    () => [...followUpsDueToday].sort((a, b) => new Date(a.followUpDate || 0).getTime() - new Date(b.followUpDate || 0).getTime()),
    [followUpsDueToday]
  )

  const moneyTotals = useMemo(() => {
    const total = raw.todaySessions.reduce((sum, s) => sum + Number(s.amountCharged ?? 0), 0)
    const paid = raw.todaySessions.reduce((sum, s) => sum + Number(s.amountPaid ?? 0), 0)
    const left = Math.max(total - paid, 0)
    return { total, paid, left }
  }, [raw.todaySessions])

  const fmtMoney = (n: number) => n.toFixed(2)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-lg" />
          <div className="space-y-1">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-24 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <PawPrint size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t('vetClinic') || 'Vet Clinic'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('vetTodayOverview') || "Today's appointments and sessions"}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/vet')}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Open Vet Module <ArrowRight size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Today's Operations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard
            label={t('vetAppointmentsToday') || 'Appointments Scheduled'}
            value={raw.todayAppointments.length}
            sub={`${scheduledAppointments.length} active`}
            icon={CalendarClock}
            tone="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          />
          <StatCard
            label={t('vetFollowUpsToday') || 'Follow-ups Due'}
            value={followUpsDueToday.length}
            sub={`${raw.todayFollowUps.length} with follow-up flag`}
            icon={BellRing}
            tone="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          />
          <StatCard
            label={t('vetSessionsDoneToday') || 'Sessions Completed'}
            value={sessionsDone.length}
            sub={`${raw.todaySessions.length} sessions logged`}
            icon={CheckCircle2}
            tone="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
          />
          <StatCard
            label={t('vetPendingSessions') || 'Sessions Pending'}
            value={Math.max(raw.todaySessions.length - sessionsDone.length, 0)}
            sub="needs completion"
            icon={Clock3}
            tone="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
          />
        </div>

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Today's Finance</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <StatCard
            label={t('vetMoneyTotal') || 'Total Charged'}
            value={fmtMoney(moneyTotals.total)}
            sub="all sessions today"
            icon={DollarSign}
            tone="bg-violet-100 dark:bg-violet-900/30 text-violet-600"
          />
          <StatCard
            label={t('vetMoneyPaid') || 'Total Paid'}
            value={fmtMoney(moneyTotals.paid)}
            sub="collected today"
            icon={DollarSign}
            tone="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
          />
          <StatCard
            label={t('vetMoneyLeft') || 'Balance Left'}
            value={fmtMoney(moneyTotals.left)}
            sub="still outstanding"
            icon={DollarSign}
            tone="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Today's Upcoming Appointments</h3>
          {sortedAppointments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No scheduled appointments for today.</p>
          ) : (
            <div className="space-y-2">
              {sortedAppointments.slice(0, 6).map((appt: any) => (
                <button
                  key={appt.id}
                  onClick={() => navigate('/vet?tab=appointments')}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/60 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{appt.patient?.name || 'Patient'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{(appt.type || 'consultation').replace('_', ' ')}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-3 shrink-0">
                    {new Date(appt.appointmentDate || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Today's Follow-ups</h3>
          {sortedFollowUps.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No follow-ups due today.</p>
          ) : (
            <div className="space-y-2">
              {sortedFollowUps.slice(0, 6).map((fu: any) => (
                <button
                  key={fu.id}
                  onClick={() => navigate('/vet?tab=followups')}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/60 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{fu.patient?.name || 'Patient'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{fu.chiefComplaint || 'Follow-up check'}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-3 shrink-0">
                    {new Date(fu.followUpDate || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
