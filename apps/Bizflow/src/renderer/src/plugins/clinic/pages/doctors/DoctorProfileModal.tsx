import { useState, useEffect, useCallback } from 'react'
import {
  X, Loader2, Stethoscope, Phone, Mail, DollarSign, Users, CalendarClock,
  Activity, TrendingUp, Star, Clock, DoorOpen
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import {
  colorForDoctor, displayName, initials, parseWorkingHours, DAY_KEYS, DAY_LABELS
} from './doctors.shared'

interface Props {
  doctorId: string
  onClose: () => void
}

type ProfileTab = 'overview' | 'appointments' | 'sessions' | 'availability'

export default function DoctorProfileModal({ doctorId, onClose }: Props) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState<ProfileTab>('overview')

  const load = useCallback(() => {
    setLoading(true)
    window.api.clinic.doctors.getProfile({ id: doctorId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [doctorId])

  useEffect(() => { load() }, [load])

  const money = (n: number) => `$${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString()
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

  const doctor = data?.doctor
  const k = data?.kpis
  const wh = parseWorkingHours(doctor?.workingHours)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : !doctor ? (
          <div className="p-8 text-center text-slate-400">
            {t('doctorNotFound') || 'Doctor not found'}
            <div className="mt-4"><button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">{t('close') || 'Close'}</button></div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
                  style={{ backgroundColor: colorForDoctor(doctor) }}
                >
                  {initials(doctor.name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {displayName(doctor)}
                    {doctor.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                        <Star className="h-3 w-3 fill-current" /> {t('defaultDoctor') || 'Default'}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5" /> {doctor.specialty || (t('generalPractitioner') || 'General practitioner')}
                    {doctor.roomNumber && <span className="inline-flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" /> {doctor.roomNumber}</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {doctor.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {doctor.phone}</span>}
                    {doctor.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {doctor.email}</span>}
                    {doctor.licenseNo && <span>#{doctor.licenseNo}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4">
              <KpiCard icon={Users}        label={t('patientsSeen') || 'Patients seen'} value={k.patientsSeen} />
              <KpiCard icon={Activity}     label={t('clinicSessions') || 'Sessions'}     value={k.sessions} />
              <KpiCard icon={DollarSign}   label={t('revenue') || 'Revenue'}             value={money(k.revenue)} />
              <KpiCard icon={TrendingUp}   label={t('commission') || 'Commission'}       value={money(k.commission)} />
              <KpiCard icon={CalendarClock} label={t('clinicAppointments') || 'Appointments'} value={k.appointments} />
              <KpiCard icon={Clock}        label={t('avgFee') || 'Avg fee'}               value={money(k.avgFee)} />
              <KpiCard icon={Users}        label={t('panelSize') || 'Panel'}              value={k.panelSize} />
              <KpiCard icon={Activity}     label={t('noShowRate') || 'No-show rate'}      value={`${k.noShowRate}%`} />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 gap-1">
              {([
                ['overview', t('overview') || 'Overview'],
                ['appointments', t('clinicAppointments') || 'Appointments'],
                ['sessions', t('clinicSessions') || 'Sessions'],
                ['availability', t('availability') || 'Availability'],
              ] as [ProfileTab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                    tab === key
                      ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >{label}</button>
              ))}
            </div>

            <div className="px-6 py-4 max-h-[40vh] overflow-y-auto">
              {tab === 'overview' && (
                <div className="space-y-4">
                  {doctor.bio && <p className="text-sm text-slate-600 dark:text-slate-300">{doctor.bio}</p>}
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">{t('upcomingAppointments') || 'Upcoming appointments'}</h3>
                    {data.upcomingAppts.length === 0 ? (
                      <p className="text-sm text-slate-400">{t('noUpcomingAppointments') || 'No upcoming appointments'}</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {data.upcomingAppts.map((a: any) => (
                          <li key={a.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{a.patient?.name}</span>
                            <span className="text-slate-400 text-xs">{fmtDateTime(a.appointmentDate)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {tab === 'appointments' && (
                data.upcomingAppts.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">{t('noUpcomingAppointments') || 'No upcoming appointments'}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.upcomingAppts.map((a: any) => (
                      <li key={a.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200">{a.patient?.name}</div>
                          <div className="text-xs text-slate-400">{a.patient?.phone}</div>
                        </div>
                        <span className="text-slate-400 text-xs">{fmtDateTime(a.appointmentDate)}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === 'sessions' && (
                data.recentSessions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">{t('noSessionsYet') || 'No sessions yet'}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {data.recentSessions.map((s: any) => (
                      <li key={s.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200">{s.patient?.name}</div>
                          <div className="text-xs text-slate-400">{s.diagnosis || s.chiefComplaint || '—'}</div>
                        </div>
                        <span className="text-slate-400 text-xs">{fmtDate(s.visitDate)}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === 'availability' && (
                <div className="space-y-1.5">
                  {DAY_KEYS.map(day => {
                    const d = wh?.[day]
                    return (
                      <div key={day} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{DAY_LABELS[day]}</span>
                        <span className="text-slate-400">
                          {!d || d.off ? (t('closed') || 'Closed') : `${d.start ?? '—'} – ${d.end ?? '—'}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}
