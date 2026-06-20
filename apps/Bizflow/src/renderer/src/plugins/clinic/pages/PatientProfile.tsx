import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Loader2, AlertTriangle, Phone, Mail, MapPin,
  Clock, Banknote,
  DollarSign, Pencil, ChevronDown, ChevronUp, Stethoscope, Calendar,
  Activity, TrendingUp, User, FileText, Trash2, Eye, FilePlus, Download, Heart
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import SessionFormModal from './components/SessionFormModal'
import PatientFormModal from './components/PatientFormModal'
import AppointmentFormModal from './components/AppointmentFormModal'
import type { Patient } from './index'
import DentalChart from '../components/DentalChart'
import type { DentalChartData } from '../components/DentalChart'
import type { Session, PatientStats, CheckResult, Appointment } from './patientProfile.types'
import { calcAge, initials, toArray, startOfToday } from './patientProfile.shared'
import {
  visitTypeConfig, defaultDotCls, bloodTypeColors,
  appointmentTypeConfig, appointmentStatusConfig, avatarColors
} from './patientProfile.config'
import QuickPayModal from './components/QuickPayModal'
import UploadCheckResultModal from './components/UploadCheckResultModal'
import PdfViewerModal from './components/PdfViewerModal'
import TimelineSession from './components/TimelineSession'

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PatientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [patient, setPatient] = useState<(Omit<Patient, 'sessions'> & { sessions: Session[] }) | null>(null)
  const [stats, setStats] = useState<PatientStats | null>(null)
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [showNewSession, setShowNewSession] = useState(false)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [showUploadResult, setShowUploadResult] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [viewingResult, setViewingResult] = useState<CheckResult | null>(null)
  const [showResultsPanel, setShowResultsPanel] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [editingRxId, setEditingRxId] = useState<string | null>(null)
  const [savingRxId, setSavingRxId] = useState<string | null>(null)
  const [rxDraft, setRxDraft] = useState({
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    instructions: ''
  })
  const [isDentistMode] = useState(() => localStorage.getItem('clinicDentistMode') === 'true')
  const [showDentalPanel, setShowDentalPanel] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [pat, st, cr, apptRes] = await Promise.all([
        window.api.clinic.patients.getById(id),
        window.api.clinic.stats.patientStats(id),
        window.api.clinic.checkResults.getByPatient(id),
        (window.api.clinic.appointments.getAll as any)({ patientId: id, skip: 0, take: 200 })
      ])
      if (!pat) {
        showToast('error', t('errorLoadingData'))
        navigate('/clinic')
        return
      }
      setPatient(pat)
      setStats(st)
      setCheckResults(cr ?? [])
      setAppointments(toArray<Appointment>(apptRes))
    } catch {
      showToast('error', t('errorLoadingData'))
      navigate('/clinic')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, showToast, t])

  useEffect(() => { load() }, [load])

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Delete this check result? This cannot be undone.')) return
    try {
      await window.api.clinic.checkResults.delete(id)
      setCheckResults((prev) => prev.filter((r) => r.id !== id))
      showToast('success', 'Check result deleted')
    } catch {
      showToast('error', 'Failed to delete check result')
    }
  }

  const handleExportPdf = async () => {
    if (!patient) return
    setExportingPdf(true)
    try {
      const result = await (window.api.clinic as any).patients_exportPdf({
        patient,
        sessions: patient.sessions ?? [],
        stats,
        checkResults,
      })
      if (result?.success) showToast('success', 'Medical record exported')
    } catch {
      showToast('error', 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const startEditPrescription = (rx: any) => {
    if (!(rx.isActive ?? true)) {
      showToast('error', 'Enable prescription before updating')
      return
    }
    setEditingRxId(rx.id)
    setRxDraft({
      medicineName: String(rx.medicineName ?? ''),
      dosage: String(rx.dosage ?? ''),
      frequency: String(rx.frequency ?? ''),
      duration: String(rx.duration ?? ''),
      quantity: rx.quantity == null ? '' : String(rx.quantity),
      instructions: String(rx.instructions ?? '')
    })
  }

  const cancelEditPrescription = () => {
    setEditingRxId(null)
    setRxDraft({ medicineName: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' })
  }

  const updatePrescription = async (rxId: string) => {
    const toNull = (value: string) => {
      const v = value.trim()
      return v ? v : null
    }

    const qtyRaw = rxDraft.quantity.trim()
    const parsedQty = qtyRaw === '' ? null : Number(qtyRaw)
    if (qtyRaw !== '' && (parsedQty === null || !Number.isFinite(parsedQty) || parsedQty < 0)) {
      showToast('error', 'Quantity must be a valid number')
      return
    }

    if (!rxDraft.medicineName.trim()) {
      showToast('error', 'Medicine name is required')
      return
    }

    setSavingRxId(rxId)
    try {
      await window.api.clinic.prescriptions.update(rxId, {
        medicineName: rxDraft.medicineName.trim(),
        dosage: toNull(rxDraft.dosage),
        frequency: toNull(rxDraft.frequency),
        duration: toNull(rxDraft.duration),
        quantity: parsedQty == null ? null : Math.round(parsedQty),
        instructions: toNull(rxDraft.instructions)
      })
      showToast('success', 'Prescription updated')
      cancelEditPrescription()
      await load()
    } catch {
      showToast('error', 'Failed to update prescription')
    } finally {
      setSavingRxId(null)
    }
  }

  const togglePrescriptionActive = async (rx: any) => {
    const next = !(rx.isActive ?? true)
    setSavingRxId(rx.id)
    try {
      await window.api.clinic.prescriptions.setActive(rx.id, next)
      showToast('success', next ? 'Prescription enabled' : 'Prescription disabled')
      if (editingRxId === rx.id) cancelEditPrescription()
      await load()
    } catch {
      showToast('error', 'Failed to update prescription status')
    } finally {
      setSavingRxId(null)
    }
  }

  // Derived colors
  const colorIdx = patient ? patient.name.charCodeAt(0) % avatarColors.length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!patient) return null

  const sessions = patient.sessions ?? []
  const today = startOfToday()
  const upcomingAppointments = appointments
    .filter((appt) => new Date(appt.appointmentDate).getTime() >= today.getTime())
    .filter((appt) => ['scheduled', 'confirmed'].includes(appt.status))
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
  const upcomingFollowUps = sessions
    .filter((session) => !!session.followUpDate)
    .filter((session) => session.status !== 'completed')
    .filter((session) => new Date(session.followUpDate as string).getTime() >= today.getTime())
    .sort((a, b) => new Date(a.followUpDate as string).getTime() - new Date(b.followUpDate as string).getTime())
  const hasFinance = (stats?.totalCharged ?? 0) > 0
  const collectPct = hasFinance ? Math.round(((stats?.totalPaid ?? 0) / (stats?.totalCharged ?? 1)) * 100) : 0

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* ── Gradient Banner ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 px-6 pt-5 pb-6 flex-shrink-0">
        {/* Back button */}
        <button
          onClick={() => navigate('/clinic')}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-5">
            <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white/25`}>
              <span className="text-2xl font-bold text-white">{initials(patient.name)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {patient.dateOfBirth && (
                  <span className="bg-white/20 text-white text-sm px-2.5 py-0.5 rounded-full">
                    {calcAge(patient.dateOfBirth)}
                  </span>
                )}
                {patient.gender && (
                  <span className="bg-white/20 text-white text-sm px-2.5 py-0.5 rounded-full capitalize">
                    {t(patient.gender as any)}
                  </span>
                )}
                {patient.bloodType && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bloodTypeColors[patient.bloodType] ?? 'bg-white/20 text-white'}`}>
                    {patient.bloodType}
                  </span>
                )}
                {patient.nationalId && (
                  <span className="bg-white/15 text-white/80 text-xs px-2 py-0.5 rounded-full">{patient.nationalId}</span>
                )}
                {(patient as any).folderNumber && (
                  <span className="bg-white/20 text-white text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border border-white/30">
                    #{(patient as any).folderNumber}
                  </span>
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

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEditPatient(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors border border-white/20"
            >
              <Pencil className="h-4 w-4" />
              {t('editPatient')}
            </button>
            <button
              onClick={() => setShowUploadResult(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors border border-white/20"
            >
              <FilePlus className="h-4 w-4" />
              Upload Result
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors border border-white/20 disabled:opacity-60"
            >
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export PDF
            </button>
            <button
              onClick={() => setShowNewSession(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t('newSession')}
            </button>
          </div>
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
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 space-y-6">
        {/* ── Stat cards ─── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSessions}</div>
                <div className="text-xs text-slate-400">{t('totalVisits')}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {stats.lastVisit
                    ? new Date(stats.lastVisit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '–'
                  }
                </div>
                <div className="text-xs text-slate-400">{t('lastVisit')}</div>
              </div>
            </div>

            <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
              (stats.outstanding ?? 0) > 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
            }`}>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                (stats.outstanding ?? 0) > 0
                  ? 'bg-red-100 dark:bg-red-900/40'
                  : 'bg-emerald-100 dark:bg-emerald-900/40'
              }`}>
                <DollarSign className={`h-5 w-5 ${(stats.outstanding ?? 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-2xl font-bold ${
                  (stats.outstanding ?? 0) > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {(stats.outstanding ?? 0) > 0 ? stats.outstanding.toFixed(0) : '✓'}
                </div>
                <div className="text-xs text-slate-400">
                  {(stats.outstanding ?? 0) > 0 ? t('outstanding') : t('fullyPaid')}
                </div>
              </div>
              {(stats.outstanding ?? 0) > 0 && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Pay
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalPaid > 0 ? stats.totalPaid.toFixed(2) : '–'}
                </div>
                <div className="text-xs text-slate-400">{t('totalPaid')}</div>
              </div>
            </div>

            {/* Check Results card */}
            <button
              onClick={() => setShowResultsPanel((v) => !v)}
              className={`rounded-2xl p-4 border flex items-center gap-3 text-left transition-all ${
                showResultsPanel
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700/60 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800/50'
              }`}
            >
              <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{checkResults.length}</div>
                <div className="text-xs text-slate-400">Check Results</div>
              </div>
              {checkResults.length > 0 && (
                showResultsPanel
                  ? <ChevronUp className="h-4 w-4 text-red-400 flex-shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
            </button>

            {/* Dental Chart card — only in dentist mode */}
            {isDentistMode && (() => {
              const latestDental = patient.sessions.find(s => s.dentalChart)
              const count = patient.sessions.filter(s => s.dentalChart).length
              return (
                <button
                  onClick={() => setShowDentalPanel((v) => !v)}
                  className={`rounded-2xl p-4 border flex items-center gap-3 text-left transition-all ${
                    showDentalPanel
                      ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700/60 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800/50'
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{count}</div>
                    <div className="text-xs text-slate-400">Dental Charts</div>
                  </div>
                  {latestDental && (
                    showDentalPanel
                      ? <ChevronUp className="h-4 w-4 text-teal-400 flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
              )
            })()}
          </div>
        )}

        {/* ── Expandable check results panel ─── */}
        {showResultsPanel && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-800/30 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-red-50 dark:border-red-800/20 bg-red-50/60 dark:bg-red-900/10">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Check Results</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold">{checkResults.length}</span>
              </div>
              <button
                onClick={() => setShowUploadResult(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
              >
                <FilePlus className="h-3.5 w-3.5" /> Upload PDF
              </button>
            </div>
            {checkResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <FileText className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400">No check results uploaded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {checkResults.map((r) => {
                  const formatSize = (bytes?: number | null) => {
                    if (!bytes) return ''
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
                    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                  }
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(r.resultDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          {r.fileSize ? ` · ${formatSize(r.fileSize)}` : ''}
                        </p>
                        {r.description && <p className="text-xs text-slate-400 truncate">{r.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setViewingResult(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View PDF
                        </button>
                        <button
                          onClick={() => handleDeleteResult(r.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Dental Chart panel (dentist mode only) ─── */}
        {isDentistMode && showDentalPanel && (() => {
          const latestDental = patient.sessions.find(s => s.dentalChart)
          let chartData: DentalChartData = {}
          if (latestDental?.dentalChart) {
            try { chartData = JSON.parse(latestDental.dentalChart) } catch { chartData = {} }
          }
          return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-teal-100 dark:border-teal-800/30 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-teal-50 dark:border-teal-800/20 bg-teal-50/60 dark:bg-teal-900/10">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Dental Chart</span>
                  {latestDental && (
                    <span className="text-xs text-slate-400">
                      — from {new Date(latestDental.visitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              {!latestDental ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Stethoscope className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                  <p className="text-sm text-slate-400">No dental charts recorded yet</p>
                  <p className="text-xs text-slate-400">Add a dental chart when creating or editing a session</p>
                </div>
              ) : (
                <div className="px-5 py-4">
                  <DentalChart value={chartData} readOnly />
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Financial breakdown ─── */}
        {hasFinance && stats && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              {t('financeSummary')}
            </h3>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="text-center">
                <div className="text-xs text-slate-400">{t('totalCharged')}</div>
                <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.totalCharged.toFixed(2)}</div>
              </div>
              <div className="text-2xl text-slate-200 dark:text-slate-600">→</div>
              <div className="text-center">
                <div className="text-xs text-slate-400">{t('totalPaid')}</div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalPaid.toFixed(2)}</div>
              </div>
              {stats.outstanding > 0 && (
                <>
                  <div className="text-2xl text-slate-200 dark:text-slate-600">=</div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400">{t('outstanding')}</div>
                    <div className="text-xl font-bold text-red-500 dark:text-red-400">{stats.outstanding.toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, collectPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-slate-400">
              <span>{collectPct}% {t('collected')}</span>
              {stats.outstanding > 0 && (
                <span className="text-red-500">{stats.outstanding.toFixed(2)} due</span>
              )}
            </div>
          </div>
        )}

        {/* ── Medical notes ─── */}
        {(patient.medicalNotes || stats?.topDiagnosis || stats?.nextFollowUp || (patient as any).folderNumber) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(patient as any).folderNumber && (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4 border border-teal-100 dark:border-teal-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-teal-500" />
                  <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">{t('folderNumber')}</span>
                </div>
                <p className="text-lg font-mono font-bold text-teal-700 dark:text-teal-300">#{(patient as any).folderNumber}</p>
              </div>
            )}
            {stats?.topDiagnosis && (
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 border border-violet-100 dark:border-violet-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-bold text-violet-500 uppercase tracking-wider">{t('commonDiagnosis')}</span>
                </div>
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{stats.topDiagnosis}</p>
              </div>
            )}
            {stats?.nextFollowUp && (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4 border border-teal-100 dark:border-teal-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-teal-500" />
                  <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">{t('nextFollowUp')}</span>
                </div>
                <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                  {new Date(stats.nextFollowUp).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}
            {patient.medicalNotes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">{t('medicalNotes')}</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 line-clamp-3">{patient.medicalNotes}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-teal-50/60 dark:bg-teal-900/10">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Upcoming Appointments</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 font-semibold">{upcomingAppointments.length}</span>
              </div>
              <button
                onClick={() => { setEditAppointment(null); setShowAppointmentForm(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Book
              </button>
            </div>
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 dark:text-slate-500">
                <Calendar className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm">No upcoming appointments</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {upcomingAppointments.slice(0, 6).map((appt) => {
                  const statusCfg = appointmentStatusConfig[appt.status] ?? { label: appt.status, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
                  return (
                    <div key={appt.id} className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {new Date(appt.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                          <span>{appointmentTypeConfig[appt.type] ?? appt.type}</span>
                          {appt.duration ? <span>• {appt.duration} min</span> : null}
                          {appt.doctorName ? <span>• Dr. {appt.doctorName}</span> : null}
                        </div>
                        {appt.notes && (
                          <p className="mt-1 text-xs text-slate-400 truncate">{appt.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { setEditAppointment(appt); setShowAppointmentForm(true) }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-sky-50/60 dark:bg-sky-900/10">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Upcoming Follow-ups</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 font-semibold">{upcomingFollowUps.length}</span>
              </div>
            </div>
            {upcomingFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 dark:text-slate-500">
                <Clock className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm">No upcoming follow-ups</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {upcomingFollowUps.slice(0, 6).map((session) => {
                  const visitCfg = visitTypeConfig[session.visitType] ?? { label: session.visitType, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dotCls: defaultDotCls }
                  return (
                    <div key={session.id} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {new Date(session.followUpDate as string).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${visitCfg.cls}`}>
                          {visitCfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {session.diagnosis || session.chiefComplaint || 'Follow-up reminder'}
                      </div>
                      {session.doctorName && (
                        <div className="mt-1 text-xs text-slate-400">Dr. {session.doctorName}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Prescriptions summary ─── */}
        {(() => {
          const allRx = sessions.flatMap((s) =>
            (s.prescriptions ?? []).map((rx: any) => ({ ...rx, sessionDate: s.visitDate, diagnosis: s.diagnosis }))
          )
          if (allRx.length === 0) return null
          const activeCount = allRx.filter((rx: any) => rx.isActive ?? true).length
          const stoppedCount = allRx.length - activeCount
          return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-pink-50/60 dark:bg-pink-900/10">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Prescriptions</span>
                  {activeCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold">{activeCount} active</span>
                  )}
                  {stoppedCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold">{stoppedCount} stopped</span>
                  )}
                </div>
              </div>
              <div className="px-5 pt-2 text-[11px] text-slate-400">Tip: swipe horizontally to view all columns.</div>
              <div className="relative">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white dark:from-slate-800 to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white dark:from-slate-800 to-transparent z-10" />
                <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
                <table className="w-full min-w-[980px] text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Diagnosis', 'Date / Status', 'Actions'].map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap ${
                            h === 'Medicine'
                              ? 'sticky left-0 z-20 bg-slate-50 dark:bg-slate-700/50'
                              : h === 'Actions'
                                ? 'sticky right-0 z-20 bg-slate-50 dark:bg-slate-700/50'
                                : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {allRx.map((rx: any) => {
                      const isEditing = editingRxId === rx.id
                      const isSaving = savingRxId === rx.id
                      return (
                        <tr key={rx.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${(rx.isActive ?? true) ? '' : 'opacity-60'}`}>
                          <td className="px-3 py-2 sticky left-0 z-10 bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                              {(rx.isActive ?? true)
                                ? <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" title="Active" />
                                : <span className="h-2 w-2 rounded-full bg-slate-400 flex-shrink-0" title={rx.stoppedAt ? `Stopped ${new Date(rx.stoppedAt).toLocaleDateString()}` : 'Discontinued'} />}
                              {isEditing ? (
                                <input
                                  value={rxDraft.medicineName}
                                  onChange={(e) => setRxDraft((d) => ({ ...d, medicineName: e.target.value }))}
                                  className="w-44 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                                />
                              ) : (
                                <span className="font-medium text-slate-800 dark:text-slate-200">{rx.medicineName}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {isEditing ? (
                              <input
                                value={rxDraft.dosage}
                                onChange={(e) => setRxDraft((d) => ({ ...d, dosage: e.target.value }))}
                                className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                              />
                            ) : (rx.dosage ?? '–')}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {isEditing ? (
                              <input
                                value={rxDraft.frequency}
                                onChange={(e) => setRxDraft((d) => ({ ...d, frequency: e.target.value }))}
                                className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                              />
                            ) : (rx.frequency ?? '–')}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {isEditing ? (
                              <input
                                value={rxDraft.duration}
                                onChange={(e) => setRxDraft((d) => ({ ...d, duration: e.target.value }))}
                                className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                              />
                            ) : (rx.duration ?? '–')}
                          </td>
                          <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate">{rx.diagnosis ?? '–'}</td>
                          <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                            {(rx.isActive ?? true)
                              ? new Date(rx.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                              : <span className="text-slate-400">{rx.stoppedAt ? `Stopped ${new Date(rx.stoppedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : new Date(rx.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                          </td>
                          <td className="px-3 py-2 sticky right-0 z-10 bg-white dark:bg-slate-800">
                            <div className="flex items-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <input
                                    value={rxDraft.quantity}
                                    onChange={(e) => setRxDraft((d) => ({ ...d, quantity: e.target.value }))}
                                    placeholder="Qty"
                                    className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                                  />
                                  <input
                                    value={rxDraft.instructions}
                                    onChange={(e) => setRxDraft((d) => ({ ...d, instructions: e.target.value }))}
                                    placeholder="Instructions"
                                    className="w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                                  />
                                  <button
                                    onClick={() => updatePrescription(rx.id)}
                                    disabled={isSaving}
                                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                                  >
                                    {isSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={cancelEditPrescription}
                                    disabled={isSaving}
                                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => togglePrescriptionActive(rx)}
                                    disabled={isSaving || (savingRxId != null && savingRxId !== rx.id)}
                                    className={`px-2 py-1 text-[11px] font-semibold rounded-lg ${
                                      (rx.isActive ?? true)
                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                    } disabled:opacity-60`}
                                  >
                                    {(rx.isActive ?? true) ? 'Disable' : 'Enable'}
                                  </button>
                                  {(rx.isActive ?? true) && (
                                    <button
                                      onClick={() => startEditPrescription(rx)}
                                      disabled={savingRxId != null}
                                      className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50 disabled:opacity-60"
                                    >
                                      Update
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Session Timeline ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('sessionHistory')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                {stats?.firstVisit && (
                  <> · since {new Date(stats.firstVisit).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</>
                )}
              </p>
            </div>
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 flex-wrap">
              {Object.entries(visitTypeConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotCls}`} />
                  <span className="text-xs text-slate-400">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <Stethoscope className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('noSessionsFound')}</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-4">This patient has no sessions yet</p>
              <button
                onClick={() => setShowNewSession(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> {t('newSession')}
              </button>
            </div>
          ) : (
            <div className="relative">
              {sessions.map((s, i) => (
                <TimelineSession
                  key={s.id}
                  session={s}
                  isLast={i === sessions.length - 1}
                  onEdit={(session) => setEditSession(session)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {showEditPatient && (
        <PatientFormModal
          patient={patient as any}
          onClose={() => setShowEditPatient(false)}
          onSaved={() => { setShowEditPatient(false); load() }}
        />
      )}
      {showNewSession && (
        <SessionFormModal
          defaultPatient={patient as any}
          onClose={() => setShowNewSession(false)}
          onSaved={() => { setShowNewSession(false); load() }}
        />
      )}
      {editSession && (
        <SessionFormModal
          existingSession={{ ...editSession, patientId: patient.id, patient: { id: patient.id, name: patient.name } }}
          onClose={() => setEditSession(null)}
          onSaved={() => { setEditSession(null); load() }}
        />
      )}
      {showAppointmentForm && (
        <AppointmentFormModal
          existing={editAppointment}
          defaultPatientId={patient.id}
          defaultPatientName={patient.name}
          defaultDate={editAppointment?.appointmentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
          onClose={() => { setShowAppointmentForm(false); setEditAppointment(null) }}
          onSaved={() => { setShowAppointmentForm(false); setEditAppointment(null); load() }}
        />
      )}
      {showUploadResult && (
        <UploadCheckResultModal
          patientId={patient.id}
          onClose={() => setShowUploadResult(false)}
          onSaved={() => load()}
        />
      )}
      {viewingResult && (
        <PdfViewerModal
          result={viewingResult}
          onClose={() => setViewingResult(null)}
        />
      )}
      {showPayModal && sessions.length > 0 && (
        <QuickPayModal
          sessions={sessions}
          onClose={() => setShowPayModal(false)}
          onPaid={() => { setShowPayModal(false); load() }}
        />
      )}
    </div>
  )
}
