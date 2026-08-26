import { useState } from 'react'
import {
  X, Pencil, Phone, Mail, Stethoscope, CalendarClock, ClipboardList,
  Bell, TrendingUp, Loader2, BadgeCheck, DollarSign, Users, 
} from 'lucide-react'
import { VetStaff } from '../types'
import { useVetStaffProfile } from '../hooks/useVetStaffProfile'
import { getStaffInitials, formatStaffMoney, formatStaffDate } from '../utils'
import { STATUS_COLORS, SESSION_STATUS_CONFIG, VISIT_TYPE_TRANSLATIONS } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface VetStaffProfileModalProps {
  staff: VetStaff
  onClose: () => void
  onEdit: () => void
}

export function VetStaffProfileModal({ staff, onClose, onEdit }: VetStaffProfileModalProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'appointments' | 'followups'>('overview')

  const { sessions, appointments, followUps, stats, loading } = useVetStaffProfile(staff)
  const initials = getStaffInitials(staff.name)
  const statusCfg = STATUS_COLORS[staff.status] ?? STATUS_COLORS.active

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner */}
        <div className="relative bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-700 px-6 pt-6 pb-6 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-black shadow-xl shrink-0 backdrop-blur-md">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black truncate">{staff.name}</h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">
                    {staff.status === 'active' && <BadgeCheck size={12} />}
                    {isAr ? statusCfg.labelAr : statusCfg.labelEn}
                  </span>
                </div>
                <p className="text-xs text-violet-100 flex items-center gap-1 mt-1">
                  <Stethoscope size={13} /> {isAr ? 'طبيب بيطري سريري' : 'Clinical Veterinarian'}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-2 text-xs text-violet-100/90">
                  <span className="flex items-center gap-1" dir="ltr">
                    <Phone size={12} /> {staff.phone}
                  </span>
                  {staff.email && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]" title={staff.email}>
                      <Mail size={12} /> {staff.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md"
              >
                <Pencil size={13} />
                <span>{isAr ? 'تعديل' : 'Edit'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex gap-1 mt-6 border-b border-white/20 -mb-6 pb-2 text-xs font-bold">
            {[
              { id: 'overview', labelEn: 'Overview & KPIs', labelAr: 'نظرة عامة والمؤشرات' },
              { id: 'sessions', labelEn: `Sessions (${sessions.length})`, labelAr: `الزيارات (${sessions.length})` },
              { id: 'appointments', labelEn: `Appointments (${appointments.length})`, labelAr: `المواعيد (${appointments.length})` },
              { id: 'followups', labelEn: `Follow-ups (${followUps.length})`, labelAr: `المتابعات (${followUps.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-violet-900 shadow-md font-black'
                    : 'text-violet-100 hover:bg-white/10'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isAr ? 'جاري مزامنة السجلات السريرية...' : 'Syncing Doctor History…'}
              </p>
            </div>
          ) : (
            <>
              {/* Tab 1: Overview & KPIs */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                        <ClipboardList size={14} /> {isAr ? 'إجمالي الجلسات' : 'Sessions'}
                      </div>
                      <p className="text-2xl font-black mt-1">{stats.total}</p>
                      <p className="text-[10px] opacity-70 font-semibold">{stats.completed} {isAr ? 'مكتملة' : 'completed'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                        <CalendarClock size={14} /> {isAr ? 'مواعيد قادمة' : 'Upcoming'}
                      </div>
                      <p className="text-2xl font-black mt-1">{stats.upcoming}</p>
                      <p className="text-[10px] opacity-70 font-semibold">{isAr ? 'مجدولة ومؤكدة' : 'scheduled slots'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                        <Bell size={14} /> {isAr ? 'متابعات مستحقة' : 'Follow-ups'}
                      </div>
                      <p className="text-2xl font-black mt-1">{followUps.length}</p>
                      <p className="text-[10px] opacity-70 font-semibold">{isAr ? 'تحت الإجراء' : 'pending check-ins'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                        <Users size={14} /> {isAr ? 'حيوانات تمت معالجتها' : 'Patients Seen'}
                      </div>
                      <p className="text-2xl font-black mt-1">{stats.uniquePatients}</p>
                      <p className="text-[10px] opacity-70 font-semibold">{isAr ? 'حالات فريدة' : 'distinct pets'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                        <DollarSign size={14} /> {isAr ? 'المفوتر' : 'Invoiced'}
                      </div>
                      <p className="text-xl font-black mt-1">{formatStaffMoney(stats.totalCharged)}</p>
                      <p className="text-[10px] opacity-70 font-semibold">{isAr ? 'إجمالي فواتير الجلسات' : 'total session billing'}</p>
                    </div>

                    <div className={`p-4 rounded-2xl border ${stats.outstanding > 0 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
                        <TrendingUp size={14} /> {isAr ? 'المستحق غير المدفوع' : 'Outstanding'}
                      </div>
                      <p className="text-xl font-black mt-1">{formatStaffMoney(stats.outstanding)}</p>
                      <p className="text-[10px] opacity-70 font-semibold">{isAr ? 'مستحق التحصيل' : 'uncollected'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Recent Sessions */}
              {activeTab === 'sessions' && (
                <div className="space-y-2.5">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">
                      {isAr ? 'لا توجد جلسات مسجلة لهذا الطبيب حتى الآن' : 'No recorded clinical sessions yet'}
                    </p>
                  ) : (
                    sessions.map((s) => {
                      const st = SESSION_STATUS_CONFIG[s.status] ?? SESSION_STATUS_CONFIG.completed
                      const vt = VISIT_TYPE_TRANSLATIONS[s.visitType]
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs shadow-sm"
                        >
                          <div className="min-w-0 flex-1 pr-3 rtl:pr-0 rtl:pl-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white truncate text-sm">
                                {s.patient?.name ?? '—'}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${st.badge}`}>
                                {isAr ? st.labelAr : st.labelEn}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold">
                                {isAr ? vt?.ar || s.visitType : vt?.en || s.visitType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                              {s.chiefComplaint || (isAr ? 'لا توجد شكوى مسجلة' : 'No complaint noted')}
                            </p>
                          </div>
                          <div className="text-right rtl:text-left shrink-0">
                            <p className="font-bold text-slate-700 dark:text-slate-300">{formatStaffDate(s.visitDate, language)}</p>
                            <p className="font-black text-emerald-600 dark:text-emerald-400">{formatStaffMoney(s.amountCharged)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Tab 3: Appointments */}
              {activeTab === 'appointments' && (
                <div className="space-y-2.5">
                  {appointments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">
                      {isAr ? 'لا توجد مواعيد مخصصة لهذا الطبيب' : 'No upcoming appointments assigned'}
                    </p>
                  ) : (
                    appointments.map((a) => {
                      const st = SESSION_STATUS_CONFIG[a.status] ?? SESSION_STATUS_CONFIG.scheduled
                      return (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs shadow-sm"
                        >
                          <div className="min-w-0 flex-1 pr-3 rtl:pr-0 rtl:pl-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{a.patient?.name ?? '—'}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.badge}`}>
                                {isAr ? st.labelAr : st.labelEn}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
                              {a.type?.replace('_', ' ')} · {a.duration ?? 30} {isAr ? 'دقيقة' : 'min'}
                            </p>
                          </div>
                          <div className="text-right rtl:text-left shrink-0">
                            <p className="font-bold text-slate-700 dark:text-slate-300">{formatStaffDate(a.appointmentDate, language)}</p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(a.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Tab 4: Follow-ups */}
              {activeTab === 'followups' && (
                <div className="space-y-2.5">
                  {followUps.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">
                      {isAr ? 'لا توجد متابعات مستحقة لهذا الطبيب' : 'No pending follow-ups'}
                    </p>
                  ) : (
                    followUps.map((fu) => (
                      <div
                        key={fu.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800 text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-3 rtl:pr-0 rtl:pl-3">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{fu.patient?.name ?? '—'}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{fu.chiefComplaint}</p>
                        </div>
                        <div className="text-right rtl:text-left shrink-0">
                          <p className="font-bold text-amber-700 dark:text-amber-400">
                            {isAr ? 'الموعد:' : 'Due:'} {formatStaffDate(fu.followUpDate, language)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}