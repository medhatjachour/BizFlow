import { useState } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Patient } from '../index'

interface PrescriptionRow {
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: string
  instructions: string
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
  prescriptions: Array<{
    id: string
    medicineName: string
    dosage?: string | null
    frequency?: string | null
    duration?: string | null
    quantity?: number | null
    instructions?: string | null
  }>
  patient: { id: string; name: string }
}

interface Props {
  existingSession?: ExistingSession | null
  defaultPatient?: Patient | null
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
  return { medicineName: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' }
}

export default function SessionFormModal({ existingSession, defaultPatient, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  // Determine initial patient (from existing session or from prop)
  const initialPatientId = existingSession?.patientId ?? defaultPatient?.id ?? ''
  const initialPatientName = existingSession?.patient?.name ?? defaultPatient?.name ?? ''

  // Form state
  const [patientId] = useState(initialPatientId)
  const [patientName] = useState(initialPatientName)

  const parseVitals = (raw?: string | null) => {
    if (!raw) return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' }
    try { return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '', ...JSON.parse(raw) } }
    catch { return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' } }
  }

  const [visitDate, setVisitDate] = useState(
    toDatetimeLocal(existingSession?.visitDate) || toDatetimeLocal(new Date().toISOString())
  )
  const [visitType, setVisitType] = useState(existingSession?.visitType ?? 'routine')
  const [doctorName, setDoctorName] = useState(existingSession?.doctorName ?? '')
  const [chiefComplaint, setChiefComplaint] = useState(existingSession?.chiefComplaint ?? '')
  const [vitals, setVitals] = useState(parseVitals(existingSession?.vitals))
  const [diagnosis, setDiagnosis] = useState(existingSession?.diagnosis ?? '')
  const [notes, setNotes] = useState(existingSession?.notes ?? '')
  const [followUpDate, setFollowUpDate] = useState(toDatetimeLocal(existingSession?.followUpDate))
  const [status, setStatus] = useState(existingSession?.status ?? 'completed')
  const [amountCharged, setAmountCharged] = useState(existingSession?.amountCharged?.toString() ?? '')
  const [amountPaid, setAmountPaid] = useState(existingSession?.amountPaid?.toString() ?? '')
  const [paymentMethod, setPaymentMethod] = useState(existingSession?.paymentMethod ?? 'cash')

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
      instructions: rx.instructions ?? ''
    })) ?? []
  )

  function updateVital(key: string, value: string) {
    setVitals((prev) => ({ ...prev, [key]: value }))
  }

  function addRx() {
    setPrescriptions((prev) => [...prev, emptyRx()])
  }

  function updateRx(idx: number, field: keyof PrescriptionRow, value: string) {
    setPrescriptions((prev) => prev.map((rx, i) => i === idx ? { ...rx, [field]: value } : rx))
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
        status,
        amountCharged: amountCharged ? parseFloat(amountCharged) : null,
        amountPaid: amountPaid ? parseFloat(amountPaid) : null,
        paymentStatus: computePaymentStatus(amountCharged, amountPaid),
        paymentMethod: paymentMethod || null,
        prescriptions: prescriptions
          .filter((rx) => rx.medicineName.trim())
          .map((rx) => ({
            medicineName: rx.medicineName,
            dosage: rx.dosage || null,
            frequency: rx.frequency || null,
            duration: rx.duration || null,
            quantity: rx.quantity ? parseInt(rx.quantity) : null,
            instructions: rx.instructions || null
          }))
      }

      if (existingSession) {
        await window.api.clinic.sessions.update(existingSession.id, payload)
        showToast('success', t('savedSuccessfully'))
      } else {
        await window.api.clinic.sessions.create(payload)
        showToast('success', t('createdSuccessfully'))
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
          {/* Patient (read-only if pre-filled) */}
          <div>
            <label className={labelCls}>{t('patient')} *</label>
            <input className={inputCls} value={patientName} readOnly />
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

          {/* Doctor */}
          <div>
            <label className={labelCls}>{t('doctorName')}</label>
            <input className={inputCls} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder={t('optional')} />
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

          {/* Follow-up + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('followUpDate')}</label>
              <input type="date" className={inputCls} value={followUpDate.slice(0, 10)} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('status')}</label>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="completed">{t('completed')}</option>
                <option value="active">{t('active')}</option>
                <option value="cancelled">{t('cancelled')}</option>
              </select>
            </div>
          </div>

          {/* ── Payment ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2.5 border-b border-slate-200 dark:border-slate-600">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">💳 {t('payment')}</p>
            </div>
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
              <div className="space-y-2">
                {prescriptions.map((rx, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2 items-end">
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
