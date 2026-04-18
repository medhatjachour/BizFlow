import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Loader2, Search, UserCircle, Stethoscope, ChevronDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Patient } from '../index'
import DentalChart, { type DentalChartData } from '../../components/DentalChart'

interface PrescriptionRow {
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: string
  instructions: string
  isActive: boolean
  stoppedAt: string
  stopReason: string
}

interface ExistingSession {
  id: string
  patientId: string
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
  dentalChart?: string | null
  prescriptions: Array<{
    id: string
    medicineName: string
    dosage?: string | null
    frequency?: string | null
    duration?: string | null
    quantity?: number | null
    instructions?: string | null
    isActive?: boolean
    startDate?: string | null
    stoppedAt?: string | null
    stopReason?: string | null
  }>
  patient: { id: string; name: string }
}

interface DefaultAppointment {
  id: string
  appointmentDate: string
  type: string
  doctorName?: string | null
  notes?: string | null
  patient: { id: string; name: string; phone: string }
}

const APPT_TO_VISIT_TYPE: Record<string, string> = {
  consultation: 'first_visit',
  follow_up: 'follow_up',
  procedure: 'routine',
  checkup: 'routine',
}

interface Props {
  existingSession?: ExistingSession | null
  defaultPatient?: Patient | null
  defaultAppointment?: DefaultAppointment | null
  onClose: () => void
  onSaved: () => void
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    // format: YYYY-MM-DDTHH:MM
    return d.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

function emptyRx(): PrescriptionRow {
  return { medicineName: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', isActive: true, stoppedAt: '', stopReason: '' }
}

export default function SessionFormModal({ existingSession, defaultPatient, defaultAppointment, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; role?: string | null }>>([])
  const [doctorSuggestions, setDoctorSuggestions] = useState<string[]>([])
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const doctorRef = useRef<HTMLDivElement>(null)

  // Load staff + employees and merge into one deduplicated list for autocomplete
  useEffect(() => {
    async function loadDoctors() {
      const [clinicStaff, employees] = await Promise.allSettled([
        window.api.clinic.staff.getAll(),
        window.electron.ipcRenderer.invoke('employees:getAll'),
      ])
      const staff: string[] = clinicStaff.status === 'fulfilled'
        ? (clinicStaff.value ?? []).map((s: any) => s.name)
        : []
      const emps: string[] = employees.status === 'fulfilled'
        ? (employees.value ?? []).filter((e: any) => e.status === 'active').map((e: any) => e.name)
        : []
      const merged = Array.from(new Set([...staff, ...emps])).sort()
      setStaffList((clinicStaff.status === 'fulfilled' ? clinicStaff.value : []) ?? [])
      setDoctorSuggestions(merged)
    }
    loadDoctors().catch(() => {})
  }, [])

  // Close doctor dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (doctorRef.current && !doctorRef.current.contains(e.target as Node)) {
        setShowDoctorDropdown(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Determine initial patient (from existing session, defaultPatient, or defaultAppointment)
  const initialPatientId = existingSession?.patientId ?? defaultPatient?.id ?? defaultAppointment?.patient?.id ?? ''
  const initialPatientName = existingSession?.patient?.name ?? defaultPatient?.name ?? defaultAppointment?.patient?.name ?? ''

  // Form state
  const [patientId, setPatientId] = useState(initialPatientId)
  const [patientName, setPatientName] = useState(initialPatientName)

  // Patient search state
  const [searchQuery, setSearchQuery] = useState(initialPatientName)
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; phone: string; dateOfBirth?: string | null }>>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  // Debounced patient search (skip on initial mount to avoid searching pre-filled value)
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await window.api.clinic.patients.searchLite(searchQuery)
        setSearchResults(results ?? [])
        setShowDropdown((results ?? []).length > 0)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const parseVitals = (raw?: string | null) => {
    if (!raw) return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' }
    try { return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '', ...JSON.parse(raw) } }
    catch { return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' } }
  }

  const [visitDate, setVisitDate] = useState(
    toDatetimeLocal(existingSession?.visitDate)
    || (defaultAppointment ? toDatetimeLocal(defaultAppointment.appointmentDate) : '')
    || toDatetimeLocal(new Date().toISOString())
  )
  const [visitType, setVisitType] = useState(
    existingSession?.visitType
    ?? (defaultAppointment ? (APPT_TO_VISIT_TYPE[defaultAppointment.type] ?? 'routine') : 'routine')
  )
  const [doctorName, setDoctorName] = useState(existingSession?.doctorName ?? defaultAppointment?.doctorName ?? '')
  const [chiefComplaint, setChiefComplaint] = useState(existingSession?.chiefComplaint ?? '')
  const [vitals, setVitals] = useState(parseVitals(existingSession?.vitals))
  const [diagnosis, setDiagnosis] = useState(existingSession?.diagnosis ?? '')
  const [notes, setNotes] = useState(existingSession?.notes ?? '')
  const [followUpDate, setFollowUpDate] = useState(toDatetimeLocal(existingSession?.followUpDate))
  const [status, setStatus] = useState(existingSession?.status ?? 'completed')
  const [amountCharged, setAmountCharged] = useState(existingSession?.amountCharged?.toString() ?? '')
  const [amountPaid, setAmountPaid] = useState(existingSession?.amountPaid?.toString() ?? '')
  const [paymentMethod, setPaymentMethod] = useState(existingSession?.paymentMethod ?? 'cash')

  // Dentist mode + dental chart state
  const isDentistMode = localStorage.getItem('clinicDentistMode') === 'true'
  const [showDentalChart, setShowDentalChart] = useState(true)
  const [dentalChart, setDentalChart] = useState<DentalChartData>(() => {
    const raw = existingSession?.dentalChart
    if (!raw) return {}
    try { return JSON.parse(raw) } catch { return {} }
  })

  // Auto-compute payment status
  function computePaymentStatus(charged: string, paid: string): string {
    const c = parseFloat(charged) || 0
    const p = parseFloat(paid) || 0
    if (c === 0) return 'unpaid'
    if (p >= c) return 'paid'
    if (p > 0) return 'partial'
    return 'unpaid'
  }
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>(
    existingSession?.prescriptions?.map((rx) => ({
      medicineName: rx.medicineName,
      dosage: rx.dosage ?? '',
      frequency: rx.frequency ?? '',
      duration: rx.duration ?? '',
      quantity: rx.quantity?.toString() ?? '',
      instructions: rx.instructions ?? '',
      isActive: rx.isActive ?? true,
      stoppedAt: rx.stoppedAt ? new Date(rx.stoppedAt).toISOString().slice(0, 10) : '',
      stopReason: rx.stopReason ?? ''
    })) ?? []
  )

  function updateVital(key: string, value: string) {
    setVitals((prev) => ({ ...prev, [key]: value }))
  }

  function addRx() {
    setPrescriptions((prev) => [...prev, emptyRx()])
  }

  function updateRx(idx: number, field: keyof PrescriptionRow, value: string) {
    setPrescriptions((prev) => prev.map((rx, i) => {
      if (i !== idx) return rx
      if (field === 'isActive') return { ...rx, isActive: value === 'true' }
      return { ...rx, [field]: value }
    }))
  }

  function removeRx(idx: number) {
    setPrescriptions((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId) { showToast('error', t('patientRequired')); return }
    if (!chiefComplaint.trim()) { showToast('error', t('chiefComplaintRequired')); return }

    setSaving(true)
    try {
      const vitalsJson = JSON.stringify(
        Object.fromEntries(Object.entries(vitals).filter(([, v]) => v !== ''))
      )
      const payload = {
        patientId,
        visitDate: visitDate ? new Date(visitDate).toISOString() : new Date().toISOString(),
        visitType,
        doctorName: doctorName || null,
        chiefComplaint,
        vitals: vitalsJson === '{}' ? null : vitalsJson,
        diagnosis: diagnosis || null,
        notes: notes || null,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
        status: followUpDate ? 'active' : (existingSession ? status : 'completed'),
        amountCharged: amountCharged ? parseFloat(amountCharged) : null,
        amountPaid: amountPaid ? parseFloat(amountPaid) : null,
        paymentStatus: computePaymentStatus(amountCharged, amountPaid),
        paymentMethod: paymentMethod || null,
        dentalChart: Object.keys(dentalChart).length > 0 ? JSON.stringify(dentalChart) : null,
        prescriptions: prescriptions
          .filter((rx) => rx.medicineName.trim())
          .map((rx) => ({
            medicineName: rx.medicineName,
            dosage: rx.dosage || null,
            frequency: rx.frequency || null,
            duration: rx.duration || null,
            quantity: rx.quantity ? parseInt(rx.quantity) : null,
            instructions: rx.instructions || null,
            isActive: rx.isActive,
            stoppedAt: !rx.isActive && rx.stoppedAt ? new Date(rx.stoppedAt).toISOString() : null,
            stopReason: !rx.isActive && rx.stopReason ? rx.stopReason : null
          }))
      }

      if (existingSession) {
        await window.api.clinic.sessions.update(existingSession.id, payload)
        showToast('success', t('savedSuccessfully'))
      } else {
        await window.api.clinic.sessions.create(payload)
        // Auto-mark the source appointment as completed when starting from one
        if (defaultAppointment) {
          try {
            await window.api.clinic.appointments.update(defaultAppointment.id, { status: 'completed' })
          } catch { /* non-critical */ }
        }
        // NOTE: follow-up reminders are surfaced automatically in the Follow-ups tab
        // via the session's followUpDate field. No separate appointment is created here —
        // staff can formally schedule one from the Follow-ups tab using "Book Appt".
        showToast('success', defaultAppointment ? t('sessionStartedFromAppt') : t('createdSuccessfully'))
      }
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {existingSession ? t('editSession') : t('newSession')}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Patient – search autocomplete for new sessions, locked when editing */}
          <div className="relative" ref={searchRef}>
            <label className={labelCls}>{t('patient')} *</label>
            {existingSession ? (
              <input
                className={`${inputCls} bg-slate-50 dark:bg-slate-800 cursor-not-allowed`}
                value={patientName}
                readOnly
              />
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className={`${inputCls} pl-9 pr-9`}
                  value={searchQuery}
                  onChange={(e) => {
                    const v = e.target.value
                    setSearchQuery(v)
                    if (!v) { setPatientId(''); setPatientName('') }
                  }}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                  placeholder={t('searchPatient') ?? 'Search by name or phone…'}
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-teal-500" />
                )}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                        onClick={() => {
                          setPatientId(p.id)
                          setPatientName(p.name)
                          setSearchQuery(p.name)
                          setShowDropdown(false)
                        }}
                      >
                        <UserCircle className="h-5 w-5 text-teal-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</div>
                          <div className="text-xs text-slate-400">
                            {p.phone}{p.dateOfBirth ? ` · ${String(p.dateOfBirth).slice(0, 10)}` : ''}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && !isSearching && searchResults.length === 0 && searchQuery.trim() && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl px-4 py-3 text-sm text-slate-400 text-center">
                    {t('noPatientsFound') ?? 'No patients found'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visit date + Visit Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('visitDate')}</label>
              <input type="datetime-local" className={inputCls} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('visitType')} *</label>
              <select className={inputCls} value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                <option value="first_visit">🔵 {t('first_visit') ?? 'First Visit'}</option>
                <option value="follow_up">🔄 {t('follow_up') ?? 'Follow-up'}</option>
                <option value="routine">🩺 {t('routine') ?? 'Routine'}</option>
                <option value="emergency">🚨 {t('emergency') ?? 'Emergency'}</option>
              </select>
            </div>
          </div>

          {/* Doctor — type-ahead autocomplete from clinic staff + employees */}
          <div>
            <label className={labelCls}>{t('doctorName')}</label>
            <div className="relative" ref={doctorRef}>
              <input
                className={inputCls}
                value={doctorName}
                onChange={(e) => { setDoctorName(e.target.value); setShowDoctorDropdown(true) }}
                onFocus={() => setShowDoctorDropdown(true)}
                placeholder={t('optional')}
                autoComplete="off"
              />
              {showDoctorDropdown && (() => {
                const q = doctorName.trim().toLowerCase()
                const filtered = q
                  ? doctorSuggestions.filter(n => n.toLowerCase().includes(q))
                  : doctorSuggestions
                return filtered.length > 0 ? (
                  <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filtered.map(name => (
                      <li
                        key={name}
                        onMouseDown={(e) => { e.preventDefault(); setDoctorName(name); setShowDoctorDropdown(false) }}
                        className="px-3 py-2 text-sm text-slate-900 dark:text-white hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : null
              })()}
            </div>
          </div>

          {/* Chief complaint */}
          <div>
            <label className={labelCls}>{t('chiefComplaint')} *</label>
            <textarea className={inputCls} rows={2} value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} required />
          </div>

          {/* Vitals grid */}
          <div>
            <p className={labelCls}>{t('vitals')}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'bp', label: 'BP (mmHg)', placeholder: '120/80' },
                { key: 'temp', label: 'Temp (°C)', placeholder: '37.0' },
                { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
                { key: 'height', label: 'Height (cm)', placeholder: '170' },
                { key: 'pulse', label: 'Pulse (bpm)', placeholder: '72' },
                { key: 'o2sat', label: 'O₂ Sat (%)', placeholder: '98' }
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input
                    className={inputCls}
                    placeholder={placeholder}
                    value={(vitals as any)[key]}
                    onChange={(e) => updateVital(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis + Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('diagnosis')}</label>
              <textarea className={inputCls} rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('notes')}</label>
              <textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {/* ── Dental Chart (dentist mode, or session already has chart data) ─ */}
          {(isDentistMode || (existingSession?.dentalChart && existingSession.dentalChart !== '{}')) && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDentalChart(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                    Dental Chart (Odontogram)
                  </p>
                  {Object.keys(dentalChart).length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-200 dark:bg-teal-800 text-teal-800 dark:text-teal-200 font-bold">
                      {Object.keys(dentalChart).length} noted
                    </span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-teal-500 transition-transform ${showDentalChart ? 'rotate-180' : ''}`} />
              </button>
              {showDentalChart && (
                <div className="px-4 py-4">
                  <DentalChart value={dentalChart} onChange={setDentalChart} />
                </div>
              )}
            </div>
          )}

          {/* Follow-up + Status */}
          <div className={`grid gap-4 ${existingSession ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className={labelCls}>{t('followUpDate')}</label>
              <input type="date" className={inputCls} value={followUpDate.slice(0, 10)} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            {existingSession && (
              <div>
                <label className={labelCls}>{t('status')}</label>
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="completed">{t('completed')}</option>
                  <option value="active">{t('active')}</option>
                  <option value="cancelled">{t('cancelled')}</option>
                </select>
              </div>
            )}
          </div>

          {/* ── Payment ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2.5 border-b border-slate-200 dark:border-slate-600">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">💳 {t('payment')}</p>
            </div>
            {/* Debt summary banner – shown when editing a session with an outstanding balance */}
            {existingSession && (() => {
              const charged = existingSession.amountCharged ?? 0
              const paid = existingSession.amountPaid ?? 0
              const balance = charged - paid
              if (charged <= 0) return null
              return (
                <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-600 ${
                  balance > 0
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-emerald-50 dark:bg-emerald-900/20'
                }`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                    balance > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {balance > 0 ? '⚠ Outstanding Debt' : '✓ Fully Paid'}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">{t('amountCharged')}</div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{charged.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">{t('amountPaid')}</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{paid.toFixed(2)}</div>
                    </div>
                    {balance > 0 && (
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">{t('balance') ?? 'Balance'}</div>
                        <div className="text-sm font-bold text-red-500 dark:text-red-400">{balance.toFixed(2)}</div>
                      </div>
                    )}
                    {existingSession.paymentMethod && (
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">{t('method') ?? 'Method'}</div>
                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 capitalize">{existingSession.paymentMethod}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">{t('paymentStatus')}</div>
                      <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
                        existingSession.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : existingSession.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {existingSession.paymentStatus}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
            <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>{t('amountCharged')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  placeholder="0.00"
                  value={amountCharged}
                  onChange={(e) => setAmountCharged(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>{t('amountPaid')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>{t('paymentMethod')}</label>
                <select className={inputCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">{t('cash') ?? 'Cash'}</option>
                  <option value="card">{t('card') ?? 'Card'}</option>
                  <option value="insurance">{t('insurance') ?? 'Insurance'}</option>
                  <option value="other">{t('other') ?? 'Other'}</option>
                </select>
              </div>
            </div>
            {/* Auto-computed status badge */}
            {(amountCharged || amountPaid) && (
              <div className="px-4 pb-3 flex items-center gap-2">
                <span className="text-xs text-slate-400">{t('paymentStatus')}:</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  computePaymentStatus(amountCharged, amountPaid) === 'paid'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : computePaymentStatus(amountCharged, amountPaid) === 'partial'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {computePaymentStatus(amountCharged, amountPaid)}
                </span>
                {amountCharged && amountPaid && parseFloat(amountCharged) > 0 && (
                  <span className="text-xs text-slate-400 ml-auto">
                    Balance: {(parseFloat(amountCharged) - parseFloat(amountPaid || '0')).toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Prescriptions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('prescriptions')}</p>
              <button type="button" onClick={addRx} className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline">
                <Plus className="h-3.5 w-3.5" /> {t('addMedicine')}
              </button>
            </div>
            {prescriptions.length > 0 && (
              <div className="space-y-3">
                {prescriptions.map((rx, idx) => (
                  <div key={idx} className={`rounded-xl border p-3 space-y-2 transition-colors ${rx.isActive ? 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/30 opacity-75'}`}>
                    {/* Row 1: medicine + dosage + frequency + duration + qty + delete */}
                    <div className="grid grid-cols-6 gap-2 items-end">
                      <div className="col-span-2">
                        {idx === 0 && <label className={labelCls}>{t('medicine')}</label>}
                        <input className={inputCls} placeholder={t('medicineName')} value={rx.medicineName} onChange={(e) => updateRx(idx, 'medicineName', e.target.value)} />
                      </div>
                      <div>
                        {idx === 0 && <label className={labelCls}>{t('dosage')}</label>}
                        <input className={inputCls} placeholder="500mg" value={rx.dosage} onChange={(e) => updateRx(idx, 'dosage', e.target.value)} />
                      </div>
                      <div>
                        {idx === 0 && <label className={labelCls}>{t('frequency')}</label>}
                        <input className={inputCls} placeholder="3x/day" value={rx.frequency} onChange={(e) => updateRx(idx, 'frequency', e.target.value)} />
                      </div>
                      <div>
                        {idx === 0 && <label className={labelCls}>{t('duration')}</label>}
                        <input className={inputCls} placeholder="7 days" value={rx.duration} onChange={(e) => updateRx(idx, 'duration', e.target.value)} />
                      </div>
                      <div className="flex items-end gap-1">
                        <div className="flex-1">
                          {idx === 0 && <label className={labelCls}>{t('qty')}</label>}
                          <input className={inputCls} type="number" min="0" placeholder="–" value={rx.quantity} onChange={(e) => updateRx(idx, 'quantity', e.target.value)} />
                        </div>
                        <button type="button" onClick={() => removeRx(idx)} className="mb-px p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {/* Row 2: active toggle + stopped date + reason */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => updateRx(idx, 'isActive', rx.isActive ? 'false' : 'true')}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${rx.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${rx.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {rx.isActive ? 'Active' : 'Discontinued'}
                      </button>
                      {!rx.isActive && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] text-slate-400 whitespace-nowrap">Stopped on</label>
                            <input
                              type="date"
                              value={rx.stoppedAt}
                              onChange={(e) => updateRx(idx, 'stoppedAt', e.target.value)}
                              className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                          <select
                            value={rx.stopReason}
                            onChange={(e) => updateRx(idx, 'stopReason', e.target.value)}
                            className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          >
                            <option value="">Reason…</option>
                            <option value="completed">Course completed</option>
                            <option value="side_effects">Side effects</option>
                            <option value="not_effective">Not effective</option>
                            <option value="other">Other</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('saveSession')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
