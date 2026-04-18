import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import type { VetPatient } from '../index'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  session?: any
  preselectedPatient?: VetPatient | any
  onSave: () => void
  onClose: () => void
}

const VISIT_TYPES = [
  { value: 'wellness_exam', label: 'Wellness Exam' },
  { value: 'vaccination',   label: 'Vaccination' },
  { value: 'surgery',       label: 'Surgery' },
  { value: 'emergency',     label: 'Emergency' },
  { value: 'follow_up',     label: 'Follow-up' },
  { value: 'grooming',      label: 'Grooming' }
]

const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'other']

export default function VetSessionFormModal({ session, preselectedPatient, onSave, onClose }: Props) {
  const isEdit = !!session
  const { t } = useLanguage()

  const [patient,    setPatient]    = useState<any | null>(preselectedPatient ?? null)
  const [ptSearch,   setPtSearch]   = useState('')
  const [ptResults,  setPtResults]  = useState<any[]>([])
  const [ptSearching, setPtSearching] = useState(false)
  const ptSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    visitDate:     new Date().toISOString().slice(0, 16),
    visitType:     'wellness_exam',
    vetName:       '',
    chiefComplaint: '',
    diagnosis:     '',
    notes:         '',
    followUpDate:  '',
    status:        'completed',
    amountCharged: '',
    amountPaid:    '',
    paymentStatus: 'unpaid',
    paymentMethod: ''
  })

  // Vitals
  const [vitals, setVitals] = useState({
    weight_kg: '',
    temp_rectal_c: '',
    heart_rate: '',
    resp_rate: '',
    crt: '',
    mucous_membranes: ''
  })

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState<any[]>([])

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (session) {
      setForm({
        visitDate:     session.visitDate?.slice(0, 16) ?? new Date().toISOString().slice(0, 16),
        visitType:     session.visitType ?? 'wellness_exam',
        vetName:       session.vetName ?? '',
        chiefComplaint: session.chiefComplaint ?? '',
        diagnosis:     session.diagnosis ?? '',
        notes:         session.notes ?? '',
        followUpDate:  session.followUpDate ? session.followUpDate.slice(0, 10) : '',
        status:        session.status ?? 'completed',
        amountCharged: session.amountCharged?.toString() ?? '',
        amountPaid:    session.amountPaid?.toString() ?? '',
        paymentStatus: session.paymentStatus ?? 'unpaid',
        paymentMethod: session.paymentMethod ?? ''
      })
      try {
        if (session.vetVitals) setVitals(JSON.parse(session.vetVitals))
      } catch {}
      setPrescriptions(session.prescriptions?.map((r: any) => ({ ...r })) ?? [])
    }
  }, [session])

  const searchPatients = async (q: string) => {
    if (!q.trim()) { setPtResults([]); return }
    setPtSearching(true)
    try {
      const res = await window.api.vet?.patients.getAll({ search: q, take: 10 })
      setPtResults(res?.data ?? [])
    } finally {
      setPtSearching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) { setError('Please select a patient'); return }
    if (!form.chiefComplaint.trim()) { setError('Chief complaint is required'); return }

    setSaving(true)
    setError('')
    try {
      const vitalsJson = Object.values(vitals).some(v => v.trim())
        ? JSON.stringify(Object.fromEntries(Object.entries(vitals).filter(([, v]) => v.trim())))
        : undefined

      const payload: any = {
        patientId:     patient.id,
        visitDate:     new Date(form.visitDate).toISOString(),
        visitType:     form.visitType,
        vetName:       form.vetName.trim() || undefined,
        chiefComplaint: form.chiefComplaint.trim(),
        vetVitals:     vitalsJson,
        diagnosis:     form.diagnosis.trim() || undefined,
        notes:         form.notes.trim() || undefined,
        followUpDate:  form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
        status:        form.status,
        amountCharged: form.amountCharged ? parseFloat(form.amountCharged) : undefined,
        amountPaid:    form.amountPaid ? parseFloat(form.amountPaid) : undefined,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod || undefined,
        prescriptions: prescriptions.map(({ id: _id, sessionId: _sid, createdAt: _ca, ...rest }) => rest)
      }

      if (isEdit) {
        await window.api.vet?.sessions.update(session.id, payload)
      } else {
        await window.api.vet?.sessions.create(payload)
      }
      onSave()
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const setV = (k: keyof typeof vitals) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVitals(p => ({ ...p, [k]: e.target.value }))

  const addRx = () => setPrescriptions(p => [...p, { medicineName: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', isActive: true }])
  const removeRx = (i: number) => setPrescriptions(p => p.filter((_, idx) => idx !== i))
  const setRx = (i: number, k: string, v: string) => setPrescriptions(p => p.map((rx, idx) => idx === i ? { ...rx, [k]: v } : rx))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{isEdit ? (t('vetEditSession')||'Edit Session') : (t('vetNewSession')||'New Session')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Patient selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetPatientLabel')||'Patient'} *</label>
            {patient ? (
              <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
                <span className="text-sm font-medium text-slate-900 dark:text-white">{patient.name} <span className="text-slate-400 text-xs capitalize">({patient.species})</span></span>
                {!preselectedPatient && (
                  <button type="button" onClick={() => setPatient(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={ptSearch}
                  onChange={e => {
                    setPtSearch(e.target.value)
                    if (ptSearchTimer.current) clearTimeout(ptSearchTimer.current)
                    ptSearchTimer.current = setTimeout(() => searchPatients(e.target.value), 300)
                  }}
                  className={`${inputCls} pl-9`}
                  placeholder={t('vetSearchPatient')||'Search patient…'}
                />
                {ptSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                {ptResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {ptResults.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => { setPatient(p); setPtSearch(''); setPtResults([]) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                        <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
                        <span className="text-slate-400 ml-2 capitalize">{p.species}</span>
                        {p.owner && <span className="text-slate-400 ml-2">· {p.owner.name}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetVisitDate')||'Visit Date'} *</label>
              <input type="datetime-local" value={form.visitDate} onChange={setF('visitDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('visitType')||'Visit Type'}</label>
              <select value={form.visitType} onChange={setF('visitType')} className={inputCls}>
                {VISIT_TYPES.map(vt => <option key={vt.value} value={vt.value}>{t(vt.value as any)||vt.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetName')||'Veterinarian Name'}</label>
              <input value={form.vetName} onChange={setF('vetName')} className={inputCls} placeholder="Dr. Name" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('chiefComplaint')||'Chief Complaint'} *</label>
              <textarea value={form.chiefComplaint} onChange={setF('chiefComplaint')} rows={2} className={inputCls} required />
            </div>
          </div>

          {/* Vitals */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">{t('vetVitals')||'Vitals'}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {([['weight_kg', 'petWeight', 'Weight (kg)'], ['temp_rectal_c', 'tempRectal', 'Temp rectal (°C)'], ['heart_rate', 'heartRate', 'Heart Rate (bpm)'], ['resp_rate', 'respRate', 'Resp Rate (brpm)'], ['crt', 'crt', 'CRT'], ['mucous_membranes', 'mucousMembranes', 'Mucous Membranes']] as const).map(([key, tKey, label]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t(tKey as any)||label}</label>
                  <input value={vitals[key]} onChange={setV(key)} className={inputCls} placeholder="—" />
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis & notes */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('diagnosis')||'Diagnosis'}</label>
              <textarea value={form.diagnosis} onChange={setF('diagnosis')} rows={2} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetNotes')||'Notes'}</label>
              <textarea value={form.notes} onChange={setF('notes')} rows={2} className={inputCls} />
            </div>
          </div>

          {/* Follow-up */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('followUpDate')||'Follow-up Date'}</label>
            <input type="date" value={form.followUpDate} onChange={setF('followUpDate')} className={inputCls} />
          </div>

          {/* Prescriptions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('vetPrescriptions')||'Prescriptions'}</h3>
              <button type="button" onClick={addRx} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">{t('vetAddPrescription')||'+ Add'}</button>
            </div>
            {prescriptions.map((rx, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="col-span-3">
                  <input value={rx.medicineName} onChange={e => setRx(i, 'medicineName', e.target.value)} className={inputCls} placeholder={`${t('vetMedicineName')||'Medicine name'} *`} />
                </div>
                <input value={rx.dosage ?? ''} onChange={e => setRx(i, 'dosage', e.target.value)} className={inputCls} placeholder={t('vetDosage')||'Dosage'} />
                <input value={rx.frequency ?? ''} onChange={e => setRx(i, 'frequency', e.target.value)} className={inputCls} placeholder={t('vetFrequency')||'Frequency'} />
                <input value={rx.duration ?? ''} onChange={e => setRx(i, 'duration', e.target.value)} className={inputCls} placeholder={t('vetDurationRx')||'Duration'} />
                <div className="col-span-2">
                  <input value={rx.instructions ?? ''} onChange={e => setRx(i, 'instructions', e.target.value)} className={inputCls} placeholder={t('vetInstructions')||'Instructions'} />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => removeRx(i)} className="w-full py-2 text-xs text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">{t('vetRemoveMed')||'Remove'}</button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('amountCharged')||'Amount Charged'}</label>
              <input type="number" step="0.01" min="0" value={form.amountCharged} onChange={setF('amountCharged')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('amountPaid')||'Amount Paid'}</label>
              <input type="number" step="0.01" min="0" value={form.amountPaid} onChange={setF('amountPaid')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetPaymentStatus')||'Payment Status'}</label>
              <select value={form.paymentStatus} onChange={setF('paymentStatus')} className={inputCls}>
                <option value="unpaid">{t('vetPaymentUnpaid')||'Unpaid'}</option>
                <option value="partial">{t('vetPaymentPartial')||'Partial'}</option>
                <option value="paid">{t('vetPaymentPaid')||'Paid'}</option>
                <option value="waived">{t('vetPaymentWaived')||'Waived'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetPaymentMethod')||'Payment Method'}</label>
              <select value={form.paymentMethod} onChange={setF('paymentMethod')} className={inputCls}>
                <option value="">—</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{t(`vetPayment_${m}` as any)||m}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">{t('cancel')||'Cancel'}</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEdit ? (t('vetSaveChanges')||'Save Changes') : (t('vetNewSession')||'Create Session')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'
