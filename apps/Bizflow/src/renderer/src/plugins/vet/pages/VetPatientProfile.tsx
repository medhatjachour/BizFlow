import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Loader2, AlertTriangle, Phone, Mail, MapPin,
  CreditCard, CheckCircle2, Clock, XCircle, MinusCircle, Banknote,
  DollarSign, Pencil, ChevronDown, ChevronUp, PawPrint, Calendar,
  Activity, User, FileText, Trash2, Upload, Eye
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import VetSessionFormModal from './components/VetSessionFormModal'
import VetPatientFormModal from './components/VetPatientFormModal'
import VetAppointmentFormModal from './components/VetAppointmentFormModal'
import { VISIT_TYPE_COLORS, visitTypeLabel } from './components/visitTypes'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VetPrescription {
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
}

interface VetSession {
  id: string
  visitDate: string
  visitType: string
  vetName?: string | null
  chiefComplaint: string
  vetVitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: string
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: string
  paymentMethod?: string | null
  prescriptions: VetPrescription[]
}

interface VetCheckResult {
  id: string
  title: string
  description?: string | null
  fileName: string
  fileSize?: number | null
  resultDate: string
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    paid:    { icon: CheckCircle2, label: 'Paid',     cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    partial: { icon: MinusCircle,  label: 'Partial',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    unpaid:  { icon: XCircle,      label: 'Unpaid',   cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
    waived:  { icon: Clock,        label: 'Waived',   cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
  }
  const { icon: Icon, label, cls } = map[status] ?? map.unpaid
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

export default function VetPatientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [patient,      setPatient]      = useState<any | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [checkResults, setCheckResults] = useState<VetCheckResult[]>([])
  const [uploading,    setUploading]    = useState(false)

  // Modals
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [showApptForm,    setShowApptForm]    = useState(false)
  const [editingSession,  setEditingSession]  = useState<VetSession | null>(null)

  const loadPatient = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.vet?.patients.getById(id)
      if (!data) { setError('Patient not found'); return }
      setPatient(data)
      setCheckResults(data.checkResults ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Failed to load patient')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadPatient() }, [loadPatient])

  const handleUpload = async () => {
    if (!id || !patient) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.dcm,.doc,.docx'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const buffer = Array.from(new Uint8Array(await file.arrayBuffer()))
        const title  = file.name.replace(/\.[^.]+$/, '')
        const result = await window.api.vet?.checkResults.create({
          patientId:   id,
          title,
          fileName:    file.name,
          buffer,
          mimeType:    file.type,
          resultDate:  new Date().toISOString()
        })
        if (result) {
          setCheckResults(prev => [result, ...prev])
          toast.success('File uploaded')
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Upload failed')
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleDeleteResult = async (resultId: string) => {
    try {
      await window.api.vet?.checkResults.delete(resultId)
      setCheckResults(prev => prev.filter(r => r.id !== resultId))
      toast.success('File deleted')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
    </div>
  )

  if (error || !patient) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <p className="text-red-600 dark:text-red-400">{error ?? 'Patient not found'}</p>
      <button onClick={() => navigate('/vet')} className="text-sm text-violet-600 hover:underline">← Back to Vet</button>
    </div>
  )

  const finance = patient.finance ?? { totalCharged: 0, totalPaid: 0, outstanding: 0 }
  const sessions: VetSession[] = patient.sessions ?? []

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/vet')}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Vet
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingSession(null); setShowSessionForm(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="h-4 w-4" /> New Session
          </button>
          <button
            onClick={() => setShowApptForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <Calendar className="h-4 w-4" /> Book
          </button>
          <button
            onClick={() => setShowPatientForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* ── Patient header ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-3xl">
              {patient.species === 'dog' ? '🐕' : patient.species === 'cat' ? '🐈' : patient.species === 'bird' ? '🦜' : patient.species === 'rabbit' ? '🐇' : patient.species === 'guinea_pig' ? '🐹' : patient.species === 'reptile' ? '🦎' : patient.species === 'fish' ? '🐠' : '🐾'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{patient.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm capitalize">{patient.species}{patient.breed ? ` · ${patient.breed}` : ''}{patient.petColor ? ` · ${patient.petColor}` : ''}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {patient.gender     && <span className="text-xs text-slate-500">{patient.gender}</span>}
                {patient.weight     && <span className="text-xs text-slate-500">{patient.weight} kg</span>}
                {patient.microchipId && <span className="text-xs font-mono text-slate-500">Chip: {patient.microchipId}</span>}
                {patient.dateOfBirth && <span className="text-xs text-slate-500">Born: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Total visits</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{sessions.length}</p>
            </div>
          </div>

          {(patient.allergies || patient.medicalNotes) && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              {patient.allergies   && <p className="text-xs text-amber-700 dark:text-amber-300"><span className="font-semibold">Allergies: </span>{patient.allergies}</p>}
              {patient.medicalNotes && <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5"><span className="font-semibold">Notes: </span>{patient.medicalNotes}</p>}
            </div>
          )}
        </div>

        {/* ── Owner card ──────────────────────────────────────────────────────── */}
        {patient.owner && (
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-violet-500" /> Owner
            </h3>
            <div className="flex flex-wrap gap-4">
              <span className="font-medium text-slate-900 dark:text-white">{patient.owner.name}</span>
              <a href={`tel:${patient.owner.phone}`} className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:underline">
                <Phone className="h-3.5 w-3.5" />{patient.owner.phone}
              </a>
              {patient.owner.email && (
                <a href={`mailto:${patient.owner.email}`} className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:underline">
                  <Mail className="h-3.5 w-3.5" />{patient.owner.email}
                </a>
              )}
              {patient.owner.address && (
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />{patient.owner.address}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Finance summary ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Charged', value: finance.totalCharged, color: 'text-slate-900 dark:text-white', icon: CreditCard },
            { label: 'Total Paid',    value: finance.totalPaid,    color: 'text-emerald-600 dark:text-emerald-400', icon: Banknote },
            { label: 'Outstanding',   value: finance.outstanding,  color: finance.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400', icon: DollarSign }
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-bold ${color}`}>{value.toFixed(2)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Session timeline ────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-violet-500" /> Visit History
          </h2>
          {sessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-400">
              <PawPrint className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No visits recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const isOpen = expandedId === session.id
                const vitals = session.vetVitals ? (() => { try { return JSON.parse(session.vetVitals!) } catch { return null } })() : null

                return (
                  <div key={session.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {/* Session header */}
                    <button
                      onClick={() => setExpandedId(isOpen ? null : session.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VISIT_TYPE_COLORS[session.visitType] ?? 'bg-slate-100 text-slate-600'}`}>
                          {visitTypeLabel(session.visitType)}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {new Date(session.visitDate).toLocaleDateString()}
                        </span>
                        {session.vetName && <span className="text-xs text-slate-400">Dr. {session.vetName}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <PaymentBadge status={session.paymentStatus} />
                        {session.amountCharged != null && (
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{session.amountCharged.toFixed(2)}</span>
                        )}
                        {isOpen
                          ? <ChevronUp className="h-4 w-4 text-slate-400" />
                          : <ChevronDown className="h-4 w-4 text-slate-400" />
                        }
                      </div>
                    </button>

                    {/* Expanded body */}
                    {isOpen && (
                      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4 space-y-3">
                        {/* Chief complaint */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Chief Complaint</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{session.chiefComplaint}</p>
                        </div>

                        {/* Vitals */}
                        {vitals && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Vitals</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {vitals.weight_kg    && <VitalPill label="Weight"    value={`${vitals.weight_kg} kg`} />}
                              {vitals.temp_rectal_c && <VitalPill label="Temp (rectal)" value={`${vitals.temp_rectal_c}°C`} />}
                              {vitals.heart_rate   && <VitalPill label="Heart Rate" value={`${vitals.heart_rate} bpm`} />}
                              {vitals.resp_rate    && <VitalPill label="Resp Rate"  value={`${vitals.resp_rate} brpm`} />}
                              {vitals.crt          && <VitalPill label="CRT"        value={vitals.crt} />}
                              {vitals.mucous_membranes && <VitalPill label="Mucous Memb." value={vitals.mucous_membranes} />}
                            </div>
                          </div>
                        )}

                        {/* Diagnosis & Notes */}
                        {session.diagnosis && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Diagnosis</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{session.diagnosis}</p>
                          </div>
                        )}
                        {session.notes && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{session.notes}</p>
                          </div>
                        )}

                        {/* Prescriptions */}
                        {session.prescriptions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Prescriptions</p>
                            <div className="space-y-1">
                              {session.prescriptions.map((rx) => (
                                <div key={rx.id} className={`text-xs px-3 py-2 rounded-lg ${rx.isActive ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800' : 'bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 opacity-60'}`}>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{rx.medicineName}</span>
                                  {rx.dosage     && <span className="text-slate-500 dark:text-slate-400"> · {rx.dosage}</span>}
                                  {rx.frequency  && <span className="text-slate-500 dark:text-slate-400"> · {rx.frequency}</span>}
                                  {rx.duration   && <span className="text-slate-500 dark:text-slate-400"> · {rx.duration}</span>}
                                  {!rx.isActive && rx.stopReason && <span className="ml-2 text-red-400">(stopped: {rx.stopReason})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Follow-up */}
                        {session.followUpDate && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-blue-700 dark:text-blue-300">
                              Follow-up: {new Date(session.followUpDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {/* Edit session button */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => { setEditingSession(session); setShowSessionForm(true) }}
                            className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit session
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Check Results ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-500" /> Lab & Imaging Results
            </h2>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </button>
          </div>
          {checkResults.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center text-slate-400">
              <p className="text-sm">No results uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {checkResults.map(r => (
                <div key={r.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.title}</p>
                    <p className="text-xs text-slate-400">{new Date(r.resultDate).toLocaleDateString()} · {r.fileName}{r.fileSize ? ` · ${(r.fileSize / 1024).toFixed(1)} KB` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.api.vet?.checkResults.openFile(r.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Open file"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteResult(r.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {showSessionForm && (
        <VetSessionFormModal
          session={editingSession ?? undefined}
          preselectedPatient={patient}
          onSave={() => { setShowSessionForm(false); setEditingSession(null); loadPatient() }}
          onClose={() => { setShowSessionForm(false); setEditingSession(null) }}
        />
      )}
      {showPatientForm && (
        <VetPatientFormModal
          patient={patient}
          onSave={() => { setShowPatientForm(false); loadPatient() }}
          onClose={() => setShowPatientForm(false)}
        />
      )}
      {showApptForm && (
        <VetAppointmentFormModal
          preselectedPatient={patient}
          onSave={() => { setShowApptForm(false); loadPatient() }}
          onClose={() => setShowApptForm(false)}
        />
      )}
    </div>
  )
}

function VitalPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-lg">
      <p className="text-xs text-violet-500 dark:text-violet-400">{label}</p>
      <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">{value}</p>
    </div>
  )
}
