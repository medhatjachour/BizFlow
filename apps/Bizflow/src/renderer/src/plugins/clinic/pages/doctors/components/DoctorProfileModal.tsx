import React from 'react'
import {
  X, Loader2, Stethoscope, Phone, Mail, DollarSign, Users,
  CalendarClock, Activity, TrendingUp, Star, Clock, DoorOpen
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDoctorProfile } from '../hooks/useDoctorProfile'
import { colorForDoctor, displayName, initials, parseWorkingHours, formatMoney } from '../utils'
import { DAY_KEYS, DAY_LABELS } from '../constants'
import type { ProfileTab } from '../types'

interface Props {
  doctorId: string
  onClose: () => void
}

export const DoctorProfileModal: React.FC<Props> = ({ doctorId, onClose }) => {
  const { t } = useLanguage()
  const { loading, data, tab, setTab } = useDoctorProfile(doctorId)

  const doctor = data?.doctor
  const k = data?.kpis
  const wh = parseWorkingHours(doctor?.workingHours)

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString()

  const tabs: Array<[ProfileTab, string]> = [
    ['overview', t('overview') || 'Overview'],
    ['appointments', t('clinicAppointments') || 'Appointments'],
    ['sessions', t('clinicSessions') || 'Sessions'],
    ['availability', t('availability') || 'Availability']
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs overflow-y-auto py-8 px-4 animate-in fade-in-50 duration-150">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : !doctor ? (
          <div className="p-8 text-center text-slate-400">
            <p>{t('doctorNotFound') || 'Doctor profile not found'}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              {t('close') || 'Close'}
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={onClose}
                className="absolute top-4 end-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shadow-sm shrink-0"
                  style={{ backgroundColor: colorForDoctor(doctor) }}
                >
                  {initials(doctor.name)}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{displayName(doctor)}</span>
                    {doctor.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        <Star className="h-3.5 w-3.5 fill-current" /> {t('defaultDoctor') || 'Default'}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <Stethoscope className="h-4 w-4 text-teal-600" />
                    <span>{doctor.specialty || (t('generalPractitioner') || 'General practitioner')}</span>
                    {doctor.roomNumber && (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        • <DoorOpen className="h-3.5 w-3.5" /> Room {doctor.roomNumber}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3.5 mt-2 text-xs text-slate-400 flex-wrap">
                    {doctor.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> <span dir="ltr">{doctor.phone}</span>
                      </span>
                    )}
                    {doctor.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {doctor.email}
                      </span>
                    )}
                    {doctor.licenseNo && <span>License #{doctor.licenseNo}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 8-KPI Summary Grid */}
            {k && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <KpiCard icon={Users} label={t('patientsSeen') || 'Patients seen'} value={k.patientsSeen} />
                <KpiCard icon={Activity} label={t('clinicSessions') || 'Sessions'} value={k.sessions} />
                <KpiCard icon={DollarSign} label={t('revenue') || 'Revenue'} value={formatMoney(k.revenue)} />
                <KpiCard icon={TrendingUp} label={t('commission') || 'Commission'} value={formatMoney(k.commission)} />
                <KpiCard icon={CalendarClock} label={t('clinicAppointments') || 'Appointments'} value={k.appointments} />
                <KpiCard icon={Clock} label={t('avgFee') || 'Avg fee'} value={formatMoney(k.avgFee)} />
                <KpiCard icon={Users} label={t('panelSize') || 'Panel size'} value={k.panelSize} />
                <KpiCard icon={Activity} label={t('noShowRate') || 'No-show rate'} value={`${k.noShowRate}%`} />
              </div>
            )}

            {/* Sub-Tabs Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                    tab === key
                      ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Body Content */}
            <div className="px-6 py-5 max-h-[42vh] overflow-y-auto">
              {tab === 'overview' && (
                <div className="space-y-4">
                  {doctor.bio && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">Biography</h4>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{doctor.bio}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                      {t('upcomingAppointments') || 'Upcoming Appointments'}
                    </h3>
                    {data.upcomingAppts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">{t('noUpcomingAppointments') || 'No upcoming appointments scheduled'}</p>
                    ) : (
                      <ul className="space-y-2">
                        {data.upcomingAppts.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between text-xs py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-100">{a.patient?.name}</span>
                            <span className="text-slate-400 font-medium">{fmtDateTime(a.appointmentDate)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {tab === 'appointments' && (
                <div>
                  {data.upcomingAppts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">{t('noUpcomingAppointments') || 'No upcoming appointments'}</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.upcomingAppts.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between text-xs py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">{a.patient?.name}</div>
                            {a.patient?.phone && <div className="text-[11px] text-slate-400 mt-0.5">{a.patient.phone}</div>}
                          </div>
                          <span className="text-slate-400 font-semibold">{fmtDateTime(a.appointmentDate)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === 'sessions' && (
                <div>
                  {data.recentSessions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">{t('noSessionsYet') || 'No sessions recorded yet'}</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.recentSessions.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between text-xs py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">{s.patient?.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{s.diagnosis || s.chiefComplaint || '—'}</div>
                          </div>
                          <span className="text-slate-400 font-semibold">{fmtDate(s.visitDate)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === 'availability' && (
                <div className="space-y-2">
                  {DAY_KEYS.map((day) => {
                    const d = wh?.[day]
                    const isClosed = !d || d.off

                    return (
                      <div
                        key={day}
                        className="flex items-center justify-between text-xs py-2 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-300">{DAY_LABELS[day]}</span>
                        <span className={`font-semibold ${isClosed ? 'text-slate-400' : 'text-teal-600 dark:text-teal-400'}`}>
                          {isClosed ? (t('closed') || 'Closed / Off') : `${d.start ?? '09:00'} – ${d.end ?? '17:00'}`}
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
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{value}</div>
    </div>
  )
}