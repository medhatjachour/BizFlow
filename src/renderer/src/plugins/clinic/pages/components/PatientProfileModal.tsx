import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Loader2, ChevronDown, ChevronUp, AlertTriangle, Phone, Mail, MapPin, CreditCard, CheckCircle2, Clock, XCircle, MinusCircle, Banknote, DollarSign, Pencil } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Patient } from '../index'
import SessionFormModal from './SessionFormModal'

interface Prescription {
  id: string
  medicineName: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
  quantity?: number | null
  instructions?: string | null
}

interface Session {
  id: string
  visitDate: string
  visitType: string
  doctorName?: string | null
  chiefComplaint: string
  vitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: string
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: string
  paymentMethod?: string | null
  prescriptions: Prescription[]
}

interface PatientStats {
  totalSessions: number
  firstVisit: string | null
  lastVisit: string | null
  topDiagnosis: string | null
  nextFollowUp: string | null
  totalCharged: number
  totalPaid: number
  outstanding: number
}

function parseVitals(raw?: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

const vitalLabels: Record<string, string> = {
  bp: 'BP', temp: 'Temp', weight: 'Weight', height: 'Height', pulse: 'Pulse', o2sat: 'O₂ Sat'
}

const visitTypeConfig: Record<string, { label: string; cls: string }> = {
  first_visit: { label: 'First Visit',  cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  follow_up:   { label: 'Follow-up',    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  routine:     { label: 'Routine',      cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  emergency:   { label: 'Emergency',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
}

const paymentStatusConfig: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         icon: Clock },
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 icon: XCircle },
  waived:  { label: 'Waived',  cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',            icon: MinusCircle }
}

const paymentMethodIcons: Record<string, React.ElementType> = {
  cash: Banknote, card: CreditCard, insurance: DollarSign, other: DollarSign
}

const statusColors: Record<string, string> = {
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  active:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function calcAge(dob?: string | null): string {
  if (!dob) return '–'
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))} yrs`
}

const bloodTypeColors: Record<string, string> = {
  'A+': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'A-': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'B+': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'B-': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'O+': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'O-': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'AB+': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'AB-': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
}

// ─── Session Row (timeline) ───────────────────────────────────────────────────
function SessionRow({ session, onEdit }: { session: Session; onEdit: (s: Session) => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const vitals = parseVitals(session.vitals)
  const vitalList = Object.entries(vitals).filter(([, v]) => v)
  const visitTypeCfg = visitTypeConfig[session.visitType] ?? { label: session.visitType, cls: 'bg-slate-100 text-slate-600' }
  const paymentCfg = paymentStatusConfig[session.paymentStatus] ?? paymentStatusConfig.unpaid
  const PayIcon = paymentCfg.icon
  const balance = (session.amountCharged ?? 0) - (session.amountPaid ?? 0)
  const MethodIcon = session.paymentMethod ? (paymentMethodIcons[session.paymentMethod] ?? DollarSign) : null

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/80 hover:border-teal-200 dark:hover:border-teal-700/60 transition-colors">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left cursor-pointer"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
      >
        {/* Date circle */}
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-xs font-bold text-teal-600 dark:text-teal-400">
            {new Date(session.visitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-[10px] text-slate-400">
            {new Date(session.visitDate).getFullYear()}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visitTypeCfg.cls}`}>
              {t(session.visitType as any) ?? visitTypeCfg.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status] ?? ''}`}>
              {t(session.status as any)}
            </span>
            {session.doctorName && (
              <span className="text-xs text-slate-400">Dr. {session.doctorName}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.chiefComplaint}</p>
        </div>

        {/* Payment badge */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${paymentCfg.cls}`}>
            <PayIcon className="h-3 w-3" />
            {t(session.paymentStatus as any) ?? paymentCfg.label}
          </div>
          {session.amountCharged != null && session.amountCharged > 0 && (
            <div className="text-xs text-slate-400 flex items-center gap-1">
              {MethodIcon && <MethodIcon className="h-3 w-3" />}
              <span>{(session.amountPaid ?? 0).toFixed(0)}/{session.amountCharged.toFixed(0)}</span>
              {balance > 0 && <span className="text-red-500 font-medium">-{balance.toFixed(0)}</span>}
            </div>
          )}
        </div>

        {/* Edit + expand */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(session) }}
            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4 space-y-3 bg-slate-50/60 dark:bg-slate-800/40">
          {/* Vitals */}
          {vitalList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vitalList.map(([k, v]) => (
                <div key={k} className="flex flex-col items-center bg-white dark:bg-slate-700 rounded-lg px-3 py-1.5 border border-slate-100 dark:border-slate-600 min-w-[60px]">
                  <span className="text-[10px] text-slate-400 uppercase">{vitalLabels[k] ?? k}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{v as string}</span>
                </div>
              ))}
            </div>
          )}

          {session.diagnosis && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('diagnosis')}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{session.diagnosis}</p>
            </div>
          )}

          {session.notes && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('notes')}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{session.notes}</p>
            </div>
          )}

          {session.prescriptions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('prescriptions')}</p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700">
                    <tr>
                      {[t('medicine'), t('dosage'), t('frequency'), t('duration'), t('qty')].map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                    {session.prescriptions.map((rx) => (
                      <tr key={rx.id} className="bg-white dark:bg-slate-800">
                        <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{rx.medicineName}</td>
                        <td className="px-3 py-1.5 text-slate-500">{rx.dosage ?? '–'}</td>
                        <td className="px-3 py-1.5 text-slate-500">{rx.frequency ?? '–'}</td>
                        <td className="px-3 py-1.5 text-slate-500">{rx.duration ?? '–'}</td>
                        <td className="px-3 py-1.5 text-slate-500">{rx.quantity ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {session.followUpDate && (
            <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
              {t('followUpDate')}: {new Date(session.followUpDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  patient: Patient
  onClose: () => void
  onNewSession: (patient: Patient) => void
  onRefresh: () => void
}

export default function PatientProfileModal({ patient, onClose, onNewSession, onRefresh: _onRefresh }: Props) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [fullPatient, setFullPatient] = useState<(Omit<Patient, 'sessions'> & { sessions: Session[] }) | null>(null)
  const [stats, setStats] = useState<PatientStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSession, setEditSession] = useState<Session | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fp, st] = await Promise.all([
        window.api.clinic.patients.getById(patient.id),
        window.api.clinic.stats.patientStats(patient.id)
      ])
      setFullPatient(fp)
      setStats(st)
    } catch {
      showToast('error', t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [patient.id, showToast, t])

  useEffect(() => { load() }, [load])

  const avatarColors = [
    'from-teal-500 to-teal-600', 'from-violet-500 to-violet-600',
    'from-sky-500 to-sky-600', 'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600', 'from-indigo-500 to-indigo-600',
  ]
  const colorIdx = patient.name.charCodeAt(0) % avatarColors.length

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* ── Banner ─────────────────────────────────────────────────── */}
          <div className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-5">
                <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white/20`}>
                  <span className="text-2xl font-bold text-white">{initials(patient.name)}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{patient.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {patient.dateOfBirth && (
                      <span className="bg-white/15 text-white text-sm px-2.5 py-0.5 rounded-full">{calcAge(patient.dateOfBirth)}</span>
                    )}
                    {patient.gender && (
                      <span className="bg-white/15 text-white text-sm px-2.5 py-0.5 rounded-full capitalize">{t(patient.gender as any)}</span>
                    )}
                    {patient.bloodType && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bloodTypeColors[patient.bloodType] ?? 'bg-white/20 text-white'}`}>
                        {patient.bloodType}
                      </span>
                    )}
                    {patient.nationalId && (
                      <span className="bg-white/15 text-white/80 text-xs px-2 py-0.5 rounded-full">{patient.nationalId}</span>
                    )}
                  </div>
                  {patient.allergies && (
                    <div className="flex items-center gap-1.5 mt-2 bg-amber-400/20 rounded-lg px-2.5 py-1 w-fit">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-200" />
                      <span className="text-xs text-amber-100 font-medium">{patient.allergies}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap gap-4 mt-4">
              {patient.phone && (
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Phone className="h-3.5 w-3.5" /> {patient.phone}
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Mail className="h-3.5 w-3.5" /> {patient.email}
                </div>
              )}
              {patient.address && (
                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                  <MapPin className="h-3.5 w-3.5" /> {patient.address}
                </div>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={() => onNewSession(patient)}
              className="absolute bottom-4 right-6 flex items-center gap-2 px-4 py-2 bg-white text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t('newSession')}
            </button>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-56">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* ── Stats row ─── */}
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Visit stats */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stats.totalSessions}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t('totalVisits')}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '–'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{t('lastVisit')}</div>
                    </div>

                    {/* Financial stats */}
                    <div className={`rounded-2xl p-4 text-center ${stats.outstanding > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                      <div className={`text-2xl font-bold ${stats.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {stats.outstanding > 0 ? stats.outstanding.toFixed(0) : '✓'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {stats.outstanding > 0 ? t('outstanding') : t('fullyPaid')}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.totalPaid > 0 ? stats.totalPaid.toFixed(0) : '–'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{t('totalPaid')}</div>
                    </div>
                  </div>
                )}

                {/* ── Financial breakdown ─── */}
                {stats && stats.totalCharged > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('financeSummary')}</h4>
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-xs text-slate-400">{t('totalCharged')}</div>
                        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{stats.totalCharged.toFixed(2)}</div>
                      </div>
                      <div className="text-slate-300 dark:text-slate-600 text-lg">→</div>
                      <div>
                        <div className="text-xs text-slate-400">{t('totalPaid')}</div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.totalPaid.toFixed(2)}</div>
                      </div>
                      {stats.outstanding > 0 && (
                        <>
                          <div className="text-slate-300 dark:text-slate-600 text-lg">=</div>
                          <div>
                            <div className="text-xs text-slate-400">{t('outstanding')}</div>
                            <div className="text-lg font-bold text-red-500 dark:text-red-400">{stats.outstanding.toFixed(2)}</div>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, stats.totalCharged > 0 ? (stats.totalPaid / stats.totalCharged) * 100 : 0)}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-1 text-right">
                        {stats.totalCharged > 0 ? Math.round((stats.totalPaid / stats.totalCharged) * 100) : 0}% collected
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Medical notes ─── */}
                {(patient.medicalNotes || stats?.topDiagnosis || stats?.nextFollowUp) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {stats?.topDiagnosis && (
                      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-3 border border-violet-100 dark:border-violet-800/40">
                        <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">{t('commonDiagnosis')}</div>
                        <div className="text-sm font-semibold text-violet-700 dark:text-violet-300">{stats.topDiagnosis}</div>
                      </div>
                    )}
                    {stats?.nextFollowUp && (
                      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-3 border border-teal-100 dark:border-teal-800/40">
                        <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1">{t('nextFollowUp')}</div>
                        <div className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                          {new Date(stats.nextFollowUp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    )}
                    {patient.medicalNotes && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 border border-amber-100 dark:border-amber-800/40">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">{t('medicalNotes')}</div>
                        <div className="text-sm text-amber-700 dark:text-amber-300 line-clamp-2">{patient.medicalNotes}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Session history ─── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {t('sessionHistory')}
                      <span className="ml-2 text-xs font-normal text-slate-400">({fullPatient?.sessions.length ?? 0})</span>
                    </h3>
                  </div>
                  {fullPatient?.sessions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">📋</span>
                      </div>
                      <p className="text-sm text-slate-400">{t('noSessionsFound')}</p>
                      <button
                        onClick={() => onNewSession(patient)}
                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors mx-auto"
                      >
                        <Plus className="h-4 w-4" /> {t('newSession')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fullPatient?.sessions.map((s) => (
                        <SessionRow key={s.id} session={s} onEdit={(s) => setEditSession(s)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit session modal */}
      {editSession && (
        <SessionFormModal
          existingSession={{ ...editSession, patientId: patient.id, patient: { id: patient.id, name: patient.name } }}
          onClose={() => setEditSession(null)}
          onSaved={() => { setEditSession(null); load() }}
        />
      )}
    </>
  )
}
