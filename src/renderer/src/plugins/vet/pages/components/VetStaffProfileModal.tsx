import { useState, useEffect, useMemo } from 'react'
import {
  X, Pencil, Phone, Mail, Stethoscope, CalendarClock, ClipboardList,
  Bell, TrendingUp, Loader2, BadgeCheck, DollarSign, Users
} from 'lucide-react'
import type { VetStaff } from './VetStaffFormModal'

const VISIT_TYPE_LABELS: Record<string, string> = {
  wellness_exam: 'Wellness', vaccination: 'Vaccination', surgery: 'Surgery',
  emergency: 'Emergency', follow_up: 'Follow-up', grooming: 'Grooming',
}

const STATUS_COLORS: Record<string, string> = {
  completed:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  active:     'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400',
  cancelled:  'bg-red-100     text-red-700     dark:bg-red-900/30     dark:text-red-400',
  scheduled:  'bg-violet-100  text-violet-700  dark:bg-violet-900/30  dark:text-violet-400',
  confirmed:  'bg-teal-100    text-teal-700    dark:bg-teal-900/30    dark:text-teal-400',
  no_show:    'bg-slate-100   text-slate-500   dark:bg-slate-700      dark:text-slate-400',
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}
function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-1.5 border ${color}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-70" />
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] opacity-60">{sub}</p>}
    </div>
  )
}

interface Props {
  staff:   VetStaff
  onClose: () => void
  onEdit:  () => void
}

export default function VetStaffProfileModal({ staff, onClose, onEdit }: Props) {
  const [sessions,     setSessions]     = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [followUps,    setFollowUps]    = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const now   = new Date()
    const start = new Date(now.getFullYear() - 2, 0, 1).toISOString()

    Promise.allSettled([
      window.api.vet?.sessions.getRecent({ vetName: staff.name, take: 200 }),
      window.api.vet?.appointments.getAll({ vetName: staff.name, take: 200 }),
      window.api.vet?.sessions.getFollowUps({ from: now.toISOString(), take: 50 }),
    ]).then(([sessRes, apptRes, fuRes]) => {
      if (cancelled) return

      if (sessRes.status === 'fulfilled') {
        const raw = sessRes.value
        setSessions(Array.isArray(raw) ? raw : (raw?.data ?? []))
      }
      if (apptRes.status === 'fulfilled') {
        const raw = apptRes.value
        setAppointments(Array.isArray(raw) ? raw : (raw?.data ?? []))
      }
      if (fuRes.status === 'fulfilled') {
        const raw = fuRes.value
        // follow-ups are sessions with followUpDate set – filter by this vet
        const all: any[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setFollowUps(all.filter(s => s.vetName === staff.name))
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [staff.name])

  const stats = useMemo(() => {
    const total       = sessions.length
    const completed   = sessions.filter(s => s.status === 'completed').length
    const totalCharged = sessions.reduce((s, r) => s + (r.amountCharged ?? 0), 0)
    const totalPaid    = sessions.reduce((s, r) => s + (r.amountPaid    ?? 0), 0)
    const upcoming     = appointments.filter(a => {
      const d = new Date(a.appointmentDate)
      return d >= new Date() && ['scheduled', 'confirmed'].includes(a.status)
    }).length
    const uniquePatients = new Set(sessions.map(s => s.patientId)).size
    return { total, completed, totalCharged, totalPaid, outstanding: totalCharged - totalPaid, upcoming, uniquePatients }
  }, [sessions, appointments])

  const initials = staff.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-6 pt-5 pb-14 flex-shrink-0">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white/20 hover:bg-white/35 text-white transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/35 text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white truncate">{staff.name}</h2>
                {staff.status === 'active'
                  ? <span className="flex items-center gap-1 text-[10px] font-semibold bg-white/25 text-white px-2 py-0.5 rounded-full"><BadgeCheck className="h-3 w-3" /> Active</span>
                  : <span className="text-[10px] font-semibold bg-white/15 text-white/70 px-2 py-0.5 rounded-full">Inactive</span>
                }
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-white/20 text-white">
                  <Stethoscope className="h-3 w-3" /> Veterinarian
                </span>
                <span className="text-xs text-violet-100 capitalize">{staff.employmentType.replace('_', '-')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
                <span className="flex items-center gap-1 text-sm text-violet-100">
                  <Phone className="h-3.5 w-3.5" /> {staff.phone}
                </span>
                {staff.email && (
                  <span className="flex items-center gap-1 text-sm text-violet-100 truncate max-w-[200px]">
                    <Mail className="h-3.5 w-3.5" /> {staff.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm text-slate-400">Loading profile…</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* ── Stats ─────────────────────────────────────────────── */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Clinical Activity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard
                    icon={ClipboardList}
                    label="Total Sessions"
                    value={stats.total}
                    sub={`${stats.completed} completed`}
                    color="bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700/50 text-violet-800 dark:text-violet-200"
                  />
                  <StatCard
                    icon={CalendarClock}
                    label="Upcoming Appts"
                    value={stats.upcoming}
                    sub="scheduled / confirmed"
                    color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-800 dark:text-blue-200"
                  />
                  <StatCard
                    icon={Bell}
                    label="Follow-ups Due"
                    value={followUps.length}
                    sub="pending follow-up"
                    color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-200"
                  />
                  <StatCard
                    icon={Users}
                    label="Unique Patients"
                    value={stats.uniquePatients}
                    sub="distinct pets seen"
                    color="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700/50 text-teal-800 dark:text-teal-200"
                  />
                  <StatCard
                    icon={DollarSign}
                    label="Total Charged"
                    value={fmtMoney(stats.totalCharged)}
                    sub="across all sessions"
                    color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-200"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Outstanding"
                    value={fmtMoney(stats.outstanding)}
                    sub={`${fmtMoney(stats.totalPaid)} collected`}
                    color={stats.outstanding > 0
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-200"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300"
                    }
                  />
                </div>
              </div>

              {/* ── Recent Sessions ───────────────────────────────────── */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recent Sessions <span className="font-normal normal-case text-slate-400">({sessions.length})</span>
                </h3>
                {sessions.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No sessions recorded for this vet yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.slice(0, 10).map(s => (
                      <div key={s.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {s.patient?.name ?? '—'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                              {s.status}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
                              {VISIT_TYPE_LABELS[s.visitType] ?? s.visitType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {s.chiefComplaint}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{fmtDate(s.visitDate)}</p>
                          {s.amountCharged != null && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtMoney(s.amountCharged)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {sessions.length > 10 && (
                      <p className="text-xs text-slate-400 text-center pt-1">+ {sessions.length - 10} more sessions</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Upcoming Appointments ─────────────────────────────── */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Appointments <span className="font-normal normal-case text-slate-400">({appointments.length})</span>
                </h3>
                {appointments.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No appointments assigned to this vet yet.</p>
                ) : (
                  <div className="space-y-2">
                    {appointments.slice(0, 10).map(a => (
                      <div key={a.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {a.patient?.name ?? '—'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                              {a.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {a.type?.replace('_', ' ')} · {a.duration ?? 30} min
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{fmtDate(a.appointmentDate)}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(a.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {appointments.length > 10 && (
                      <p className="text-xs text-slate-400 text-center pt-1">+ {appointments.length - 10} more appointments</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Pending Follow-ups ────────────────────────────────── */}
              {followUps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-amber-500" />
                    Pending Follow-ups
                  </h3>
                  <div className="space-y-2">
                    {followUps.map(s => (
                      <div key={s.id}
                        className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.patient?.name ?? '—'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.chiefComplaint}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Due {fmtDate(s.followUpDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
