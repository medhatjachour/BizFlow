import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DateField from '@renderer/components/DateField'
import { VetPatient } from '..'
import { VetStaff } from '../vet-staff/types'
import { speciesEmoji } from '../components/owners/species'
import { useVisitTypes } from './visitTypes'
import VetVisitTypesManager from './VetVisitTypesManager'

interface Props {
  session?: any
  preselectedPatient?: VetPatient | any
  onSave: () => void
  onClose: () => void
}

const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'other']

// Placeholder pet used to record an owner-level session when the owner has no
// specific pet (schema requires a patientId — no migration). Reused per owner
// via find-or-create on this exact name.
const GENERAL_PET_NAME = 'General Visit'

const STATUS_BADGE: Record<string, string> = {
  paid:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unpaid:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  waived:  'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

/** Derive payment status from charged/paid amounts (or 'waived' override). */
function computePaymentStatus(charged: number, paid: number, waived: boolean): string {
  if (waived) return 'waived'
  if (charged > 0 && paid >= charged) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

export default function VetSessionFormModal({ session, preselectedPatient, onSave, onClose }: Props) {
  const isEdit = !!session
  const { t } = useLanguage()

  const [patient,    setPatient]    = useState<any | null>(preselectedPatient ?? null)
  const [ptSearch,   setPtSearch]   = useState('')
  const [ptResults,  setPtResults]  = useState<any[]>([])
  const [ptSearching, setPtSearching] = useState(false)
  const ptSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection mode: link the session by pet directly, or pick the owner first
  // then one of their pets. (Sessions always store a patientId — no schema change.)
  const [selectMode, setSelectMode] = useState<'pet' | 'owner'>('pet')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerResults, setOwnerResults] = useState<any[]>([])
  const [ownerSearching, setOwnerSearching] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null)
  const [ownerPets, setOwnerPets] = useState<any[]>([])
  const [ownerPetsLoading, setOwnerPetsLoading] = useState(false)
  const ownerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Payment status is auto-derived from charged/paid; `waived` is the override.
  const [waived, setWaived] = useState(false)

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
  const [attendingVets, setAttendingVets] = useState<VetStaff[]>([])
  const [showVitals, setShowVitals] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const { options: visitTypeOptions, reload: reloadVisitTypes } = useVisitTypes()
  const [showTypeMgr, setShowTypeMgr] = useState(false)

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
        if (session.vetVitals) { setVitals(JSON.parse(session.vetVitals)); setShowVitals(true) }
      } catch {}
      setPrescriptions(session.prescriptions?.map((r: any) => ({ ...r })) ?? [])
      setWaived(session.paymentStatus === 'waived')
    }
  }, [session])

  useEffect(() => {
    const loadVets = async () => {
      try {
        const raw: any = await window.api.vet?.staff.getAll({ status: 'active', take: 200 })
        const list: VetStaff[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        const vets = list
          .filter((staff) => staff.status === 'active')
          .sort((a, b) => a.name.localeCompare(b.name))
        setAttendingVets(vets)
      } catch { /* suggestions are optional */ }
    }

    void loadVets()
  }, [])

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

  const searchOwners = async (q: string) => {
    if (!q.trim()) { setOwnerResults([]); return }
    setOwnerSearching(true)
    try {
      const res = await window.api.vet?.owners.searchLite(q)
      setOwnerResults(res ?? [])
    } finally {
      setOwnerSearching(false)
    }
  }

  const selectOwner = async (o: any) => {
    setSelectedOwner(o)
    setOwnerResults([])
    setOwnerSearch('')
    setOwnerPetsLoading(true)
    try {
      // patients.getAll matches owner name/phone too; filter to exactly this owner.
      const res = await window.api.vet?.patients.getAll({ search: o.phone || o.name, take: 50 })
      const list = (res?.data ?? []).filter((p: any) => p.owner?.id === o.id)
      setOwnerPets(list)
    } finally {
      setOwnerPetsLoading(false)
    }
  }

  // Start a session for the owner without a specific pet: find-or-create a
  // single reusable placeholder pet under that owner (schema needs a patientId).
  const useGeneralVisit = async () => {
    if (!selectedOwner) return
    const existing = ownerPets.find((p: any) => p.species === 'other' && p.name === GENERAL_PET_NAME)
    if (existing) { setPatient({ ...existing, owner: existing.owner ?? selectedOwner }); return }
    setOwnerPetsLoading(true)
    setError('')
    try {
      const created = await window.api.vet?.patients.create({ name: GENERAL_PET_NAME, species: 'other', ownerId: selectedOwner.id })
      setPatient({ ...created, owner: selectedOwner })
    } catch (e: any) {
      setError(e.message ?? 'Failed to start owner session')
    } finally {
      setOwnerPetsLoading(false)
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
        paymentStatus: computePaymentStatus(parseFloat(form.amountCharged) || 0, parseFloat(form.amountPaid) || 0, waived),
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

  const filledVitals = Object.values(vitals).filter(v => v.trim()).length

  const payInfo = (() => {
    const charged = parseFloat(form.amountCharged) || 0
    const paid = parseFloat(form.amountPaid) || 0
    return { charged, paid, balance: charged - paid, status: computePaymentStatus(charged, paid, waived) }
  })()

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
          {/* Patient / Owner selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">{t('vetPatientLabel')||'Patient'} *</label>
              {!patient && !preselectedPatient && (
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
                  <button type="button" onClick={() => setSelectMode('pet')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${selectMode === 'pet' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                    {t('vetByPet') || 'By Pet'}
                  </button>
                  <button type="button" onClick={() => setSelectMode('owner')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${selectMode === 'owner' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                    {t('vetByOwner') || 'By Owner'}
                  </button>
                </div>
              )}
            </div>

            {patient ? (
              <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-lg leading-none">{speciesEmoji(patient.species)}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{patient.name} <span className="text-slate-400 text-xs capitalize">({patient.species})</span></span>
                    {patient.owner && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{(t('vetOwnerLabel')||'Owner')}: {patient.owner.name}{patient.owner.phone ? ` · ${patient.owner.phone}` : ''}</p>}
                  </div>
                </div>
                {!preselectedPatient && (
                  <button type="button" onClick={() => { setPatient(null); setSelectedOwner(null); setOwnerPets([]) }} className="text-slate-400 hover:text-slate-600 shrink-0"><X className="h-4 w-4" /></button>
                )}
              </div>
            ) : selectMode === 'pet' ? (
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
                  placeholder={t('vetSearchPatient')||'Search patient by name or owner…'}
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
            ) : (
              <div className="space-y-2">
                {!selectedOwner ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      value={ownerSearch}
                      onChange={e => {
                        setOwnerSearch(e.target.value)
                        if (ownerSearchTimer.current) clearTimeout(ownerSearchTimer.current)
                        ownerSearchTimer.current = setTimeout(() => searchOwners(e.target.value), 300)
                      }}
                      className={`${inputCls} pl-9`}
                      placeholder={t('vetSearchOwner')||'Search owner by name or phone…'}
                    />
                    {ownerSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                    {ownerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {ownerResults.map((o: any) => (
                          <button key={o.id} type="button" onClick={() => selectOwner(o)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                            <span className="font-medium text-slate-900 dark:text-white">{o.name}</span>
                            <span className="text-slate-400 ml-2">{o.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{selectedOwner.name}</p>
                        <p className="text-xs text-slate-500">{selectedOwner.phone}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedOwner(null); setOwnerPets([]) }} className="text-slate-400 hover:text-slate-600 shrink-0"><X className="h-4 w-4" /></button>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('vetChoosePet')||'Choose a pet'}</p>
                    {ownerPetsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('loading')||'Loading…'}</div>
                    ) : ownerPets.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 py-1">{t('vetOwnerNoPets')||'This owner has no pets yet — add a pet first, or switch to “By Pet”.'}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ownerPets.map((p: any) => (
                          <button key={p.id} type="button" onClick={() => setPatient({ ...p, owner: p.owner ?? selectedOwner })}
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-700 text-left transition-colors">
                            <span className="text-lg leading-none">{speciesEmoji(p.species)}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                              <p className="text-xs text-slate-400 capitalize truncate">{p.species}{p.breed ? ` · ${p.breed}` : ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={useGeneralVisit}
                      className="w-full mt-1 py-2 text-xs font-medium text-violet-600 dark:text-violet-300 border border-dashed border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                      {t('vetSessionNoPet')||'Session without a specific pet'}
                    </button>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">{t('visitType')||'Visit Type'}</label>
                <button type="button" onClick={() => setShowTypeMgr(true)}
                  className="text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                  <Settings2 size={12} /> {t('vetManage') || 'Manage'}
                </button>
              </div>
              <select value={form.visitType} onChange={setF('visitType')} className={inputCls}>
                {form.visitType && !visitTypeOptions.some(o => o.value === form.visitType) && (
                  <option value={form.visitType}>{t(form.visitType as any) || form.visitType}</option>
                )}
                {visitTypeOptions.map(o => <option key={o.value} value={o.value}>{t(o.value as any) || o.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetName')||'Attending Vet'}</label>
              <input value={form.vetName} onChange={setF('vetName')} list="vet-attending-list"
                placeholder={t('vetAttendingPlaceholder') || 'Type a name (optional)'} className={inputCls} />
              <datalist id="vet-attending-list">
                {attendingVets.map((vet) => (
                  <option key={vet.id} value={vet.name} />
                ))}
              </datalist>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('chiefComplaint')||'Chief Complaint'} *</label>
              <textarea value={form.chiefComplaint} onChange={setF('chiefComplaint')} rows={2} className={inputCls} required />
            </div>
          </div>

          {/* Vitals — collapsed by default, expandable */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl">
            <button type="button" onClick={() => setShowVitals(s => !s)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                {t('vetVitals')||'Vitals'}
                {filledVitals > 0 && (
                  <span className="text-[10px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-full px-1.5 py-0.5 normal-case">{filledVitals}</span>
                )}
              </h3>
              {showVitals ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {showVitals && (
              <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([['weight_kg', 'petWeight', 'Weight (kg)'], ['temp_rectal_c', 'tempRectal', 'Temp rectal (°C)'], ['heart_rate', 'heartRate', 'Heart Rate (bpm)'], ['resp_rate', 'respRate', 'Resp Rate (brpm)'], ['crt', 'crt', 'CRT'], ['mucous_membranes', 'mucousMembranes', 'Mucous Membranes']] as const).map(([key, tKey, label]) => (
                  <div key={key}>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t(tKey as any)||label}</label>
                    <input value={vitals[key]} onChange={setV(key)} className={inputCls} placeholder="—" />
                  </div>
                ))}
              </div>
            )}
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
            <DateField value={form.followUpDate} onChange={v => setF('followUpDate')({ target: { value: v } } as any)} className={inputCls} />
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
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('amountCharged')||'Amount Charged'}</label>
                <input type="number" step="0.01" min="0" value={form.amountCharged} onChange={setF('amountCharged')} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('amountPaid')||'Amount Paid'}</label>
                <input type="number" step="0.01" min="0" value={form.amountPaid} onChange={setF('amountPaid')} className={inputCls} placeholder="0.00" />
              </div>
            </div>

            {/* Auto-detected payment status */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('vetPaymentStatus')||'Payment Status'}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[payInfo.status]}`}>
                  {t((`vetPayment${payInfo.status.charAt(0).toUpperCase() + payInfo.status.slice(1)}`) as any) || payInfo.status}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('vetBalance')||'Balance'}: <span className={`font-semibold tabular-nums ${payInfo.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{payInfo.balance.toFixed(2)}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetPaymentMethod')||'Payment Method'}</label>
                <select value={form.paymentMethod} onChange={setF('paymentMethod')} className={inputCls}>
                  <option value="">—</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{t(`vetPayment_${m}` as any)||m}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 mt-5 cursor-pointer select-none">
                <input type="checkbox" checked={waived} onChange={e => setWaived(e.target.checked)} className="rounded border-slate-300 text-[color:var(--accent)] focus:ring-[color:var(--accent)]" />
                {t('vetWaivePayment')||'Waive payment'}
              </label>
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
      {showTypeMgr && (
        <VetVisitTypesManager onClose={() => setShowTypeMgr(false)} onChanged={reloadVisitTypes} />
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]'
