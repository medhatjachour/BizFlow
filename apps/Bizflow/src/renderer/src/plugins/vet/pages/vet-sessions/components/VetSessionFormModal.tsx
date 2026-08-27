import { useState, useEffect, useRef } from 'react'
import {
  X, Search, Loader2, Settings2, ChevronDown, ChevronUp,
  Stethoscope, Pill, Plus, Trash2, DollarSign, Activity
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DateField from '@renderer/components/DateField'
import { VetPatient } from '../types'
import { VetStaff } from '../../vet-staff/types'
import { useVisitTypes } from '../hooks/useVisitTypes'
import { VetVisitTypesManager } from './VetVisitTypesManager'
import { VetSessionRecord, PrescriptionItem, SessionVitals } from '../types'
import { computeSessionPaymentStatus } from '../utils'
import { PAYMENT_STATUS_CONFIG, SESSION_PAYMENT_METHODS } from '../constants'
import { speciesEmoji } from '../../vet-owners/species'

interface Props {
  session?: VetSessionRecord | null
  preselectedPatient?: VetPatient | any
  onSave: () => void
  onClose: () => void
}

const GENERAL_PET_NAME = 'General Visit'
const inputCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

// Safe helper functions for Date inputs
const formatToDateTimeLocal = (dateVal?: any): string => {
  if (!dateVal) return new Date().toISOString().slice(0, 16)
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16)
    return d.toISOString().slice(0, 16)
  } catch {
    return new Date().toISOString().slice(0, 16)
  }
}

const formatToDateOnly = (dateVal?: any): string => {
  if (!dateVal) return ''
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function VetSessionFormModal({ session, preselectedPatient, onSave, onClose }: Props) {
  const isEdit = Boolean(session)
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [patient, setPatient] = useState<any | null>(preselectedPatient ?? null)
  const [selectMode, setSelectMode] = useState<'pet' | 'owner'>('pet')
  const [ptSearch, setPtSearch] = useState('')
  const [ptResults, setPtResults] = useState<any[]>([])
  const [ptSearching, setPtSearching] = useState(false)
  const ptSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerResults, setOwnerResults] = useState<any[]>([])
  const [ownerSearching, setOwnerSearching] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null)
  const [ownerPets, setOwnerPets] = useState<any[]>([])
  const [, setOwnerPetsLoading] = useState(false)
  const ownerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [waived, setWaived] = useState(false)

  const [form, setForm] = useState({
    visitDate: formatToDateTimeLocal(),
    visitType: 'wellness_exam',
    vetName: '',
    chiefComplaint: '',
    diagnosis: '',
    notes: '',
    followUpDate: '',
    status: 'completed',
    amountCharged: '',
    amountPaid: '',
    paymentMethod: 'cash'
  })

  const [vitals, setVitals] = useState<SessionVitals>({
    weight_kg: '',
    temp_rectal_c: '',
    heart_rate: '',
    resp_rate: '',
    crt: '',
    mucous_membranes: ''
  })
  const [showVitals, setShowVitals] = useState(false)

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([])
  const [attendingVets, setAttendingVets] = useState<VetStaff[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { options: visitTypeOptions, reload: reloadVisitTypes } = useVisitTypes()
  const [showTypeMgr, setShowTypeMgr] = useState(false)

  useEffect(() => {
    if (session) {
      setForm({
        visitDate: formatToDateTimeLocal(session.visitDate),
        visitType: session.visitType || 'wellness_exam',
        vetName: session.vetName || '',
        chiefComplaint: session.chiefComplaint || '',
        diagnosis: session.diagnosis || '',
        notes: session.notes || '',
        followUpDate: formatToDateOnly(session.followUpDate),
        status: session.status || 'completed',
        amountCharged: session.amountCharged ? String(session.amountCharged) : '',
        amountPaid: session.amountPaid ? String(session.amountPaid) : '',
        paymentMethod: session.paymentMethod || 'cash'
      })
      try {
        if (session.vetVitals) {
          const parsed = typeof session.vetVitals === 'string' ? JSON.parse(session.vetVitals) : session.vetVitals
          setVitals(parsed)
          setShowVitals(true)
        }
      } catch {}
      setPrescriptions(
        Array.isArray(session.prescriptions)
          ? session.prescriptions.map((r) => ({ ...r }))
          : []
      )
      setWaived(session.paymentStatus === 'waived')
      if (session.patient) setPatient(session.patient)
    }
  }, [session])

  useEffect(() => {
    const loadVets = async () => {
      try {
        const raw: any = await window.api.vet?.staff.getAll({ status: 'active', take: 200 })
        const list: VetStaff[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setAttendingVets(list.filter((s) => s.status === 'active'))
      } catch {}
    }
    loadVets()
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
      const res = await window.api.vet?.patients.getAll({ search: o.phone || o.name, take: 50 })
      const list = (res?.data ?? []).filter((p: any) => p.owner?.id === o.id)
      setOwnerPets(list)
    } finally {
      setOwnerPetsLoading(false)
    }
  }

  const useGeneralVisit = async () => {
    if (!selectedOwner) return
    const existing = ownerPets.find((p: any) => p.name === GENERAL_PET_NAME)
    if (existing) {
      setPatient({ ...existing, owner: existing.owner ?? selectedOwner })
      return
    }
    setOwnerPetsLoading(true)
    try {
      const created = await window.api.vet?.patients.create({
        name: GENERAL_PET_NAME,
        species: 'other',
        ownerId: selectedOwner.id
      })
      setPatient({ ...created, owner: selectedOwner })
    } catch (e: any) {
      setError(e.message ?? 'Failed to start owner session')
    } finally {
      setOwnerPetsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) {
      setError(isAr ? 'يرجى اختيار مريض / حيوان أليف' : 'Please select a patient')
      return
    }
    if (!form.chiefComplaint.trim()) {
      setError(isAr ? 'يرجى كتابة الشكوى الرئيسية أو سبب الزيارة' : 'Chief complaint is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      const vitalsJson = Object.values(vitals).some((v) => v?.trim())
        ? JSON.stringify(Object.fromEntries(Object.entries(vitals).filter(([, v]) => v?.trim())))
        : undefined

      const chargedNum = form.amountCharged ? parseFloat(form.amountCharged) : 0
      const paidNum = form.amountPaid ? parseFloat(form.amountPaid) : 0

      const payload: any = {
        patientId: patient.id,
        visitDate: new Date(form.visitDate).toISOString(),
        visitType: form.visitType,
        vetName: form.vetName.trim() || undefined,
        chiefComplaint: form.chiefComplaint.trim(),
        vetVitals: vitalsJson,
        diagnosis: form.diagnosis.trim() || undefined,
        notes: form.notes.trim() || undefined,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
        status: form.status,
        amountCharged: chargedNum,
        amountPaid: paidNum,
        paymentStatus: computeSessionPaymentStatus(chargedNum, paidNum, waived),
        paymentMethod: form.paymentMethod || undefined,
        prescriptions: prescriptions.map(({ id: _id, ...rest }) => rest)
      }

      if (isEdit && session) {
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

  const chargedVal = parseFloat(form.amountCharged) || 0
  const paidVal = parseFloat(form.amountPaid) || 0
  const balanceVal = Math.max(0, chargedVal - paidVal)
  const currentPayStatus = computeSessionPaymentStatus(chargedVal, paidVal, waived)
  const payCfg = PAYMENT_STATUS_CONFIG[currentPayStatus]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEdit ? (isAr ? 'تعديل الجلسة السريرية' : 'Edit Clinical Session') : (isAr ? 'تسجيل جلسة علاجية جديدة' : 'New Clinical Session')}
              </h2>
              <p className="text-xs text-slate-400">{isAr ? 'التشخيص، الوصفات الطبية، الفواتير' : 'Veterinary visit documentation'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Patient Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'المريض / الحيوان الأليف' : 'Patient'} *
                </label>
                {!patient && !preselectedPatient && (
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectMode('pet')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        selectMode === 'pet' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {isAr ? 'حسب الحيوان' : 'By Pet'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectMode('owner')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        selectMode === 'owner' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {isAr ? 'حسب المالك' : 'By Owner'}
                    </button>
                  </div>
                )}
              </div>

              {patient ? (
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{speciesEmoji(patient.species)}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {patient.name} <span className="text-[10px] text-slate-400 font-semibold capitalize">({patient.species})</span>
                      </p>
                      {patient.owner && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {isAr ? 'المالك:' : 'Owner:'} {patient.owner.name} • {patient.owner.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {!preselectedPatient && (
                    <button
                      type="button"
                      onClick={() => {
                        setPatient(null)
                        setSelectedOwner(null)
                        setOwnerPets([])
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : selectMode === 'pet' ? (
                <div className="relative">
                  <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={ptSearch}
                    onChange={(e) => {
                      setPtSearch(e.target.value)
                      if (ptSearchTimer.current) clearTimeout(ptSearchTimer.current)
                      ptSearchTimer.current = setTimeout(() => searchPatients(e.target.value), 300)
                    }}
                    className={`${inputCls} pl-9 rtl:pl-3 rtl:pr-9`}
                    placeholder={isAr ? 'ابحث باسم الحيوان أو المالك...' : 'Search patient by name or owner phone…'}
                  />
                  {ptSearching && <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                  {ptResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                      {ptResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPatient(p)
                            setPtSearch('')
                            setPtResults([])
                          }}
                          className="w-full text-left rtl:text-right px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                          <span className="text-slate-400 ml-2 rtl:ml-0 rtl:mr-2 capitalize">({p.species})</span>
                          {p.owner && <span className="text-slate-400 ml-2 rtl:ml-0 rtl:mr-2">• {p.owner.name}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {!selectedOwner ? (
                    <div className="relative">
                      <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        value={ownerSearch}
                        onChange={(e) => {
                          setOwnerSearch(e.target.value)
                          if (ownerSearchTimer.current) clearTimeout(ownerSearchTimer.current)
                          ownerSearchTimer.current = setTimeout(() => searchOwners(e.target.value), 300)
                        }}
                        className={`${inputCls} pl-9 rtl:pl-3 rtl:pr-9`}
                        placeholder={isAr ? 'ابحث باسم المالك أو رقم هاتفه...' : 'Search owner by name or phone…'}
                      />
                      {ownerSearching && <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                      {ownerResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                          {ownerResults.map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => selectOwner(o)}
                              className="w-full text-left rtl:text-right px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              <span className="font-bold text-slate-900 dark:text-white">{o.name}</span>
                              <span className="text-slate-400 ml-2 rtl:ml-0 rtl:mr-2 font-mono">{o.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedOwner.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{selectedOwner.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOwner(null)
                            setOwnerPets([])
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {ownerPets.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPatient({ ...p, owner: selectedOwner })}
                            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-left rtl:text-right"
                          >
                            <span>{speciesEmoji(p.species)}</span>
                            <span className="text-xs font-bold truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={useGeneralVisit}
                        className="w-full py-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all"
                      >
                        {isAr ? 'جلسة عامة للمالك بدون اختيار حيوان محدد' : 'General session without specific pet'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Visit Date & Visit Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'تاريخ ووقت الزيارة' : 'Visit Date & Time'} *
                </label>
                <input
                  type="datetime-local"
                  value={form.visitDate}
                  onChange={(e) => setForm((p) => ({ ...p, visitDate: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'نوع الزيارة' : 'Visit Type'} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTypeMgr(true)}
                    className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                  >
                    <Settings2 size={12} /> {isAr ? 'إدارة' : 'Manage'}
                  </button>
                </div>
                <select
                  value={form.visitType}
                  onChange={(e) => setForm((p) => ({ ...p, visitType: e.target.value }))}
                  className={inputCls}
                >
                  {visitTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attending Doctor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'الطبيب البيطري المعالج' : 'Attending Veterinarian'}
              </label>
              <input
                value={form.vetName}
                onChange={(e) => setForm((p) => ({ ...p, vetName: e.target.value }))}
                list="vet-doctor-attending"
                placeholder={isAr ? 'اسم الطبيب المعالج...' : 'Type doctor name...'}
                className={inputCls}
              />
              <datalist id="vet-doctor-attending">
                {attendingVets.map((v) => (
                  <option key={v.id} value={v.name} />
                ))}
              </datalist>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'الشكوى الرئيسية وسبب الاستشارة' : 'Chief Complaint'} *
              </label>
              <textarea
                value={form.chiefComplaint}
                onChange={(e) => setForm((p) => ({ ...p, chiefComplaint: e.target.value }))}
                rows={2}
                placeholder={isAr ? 'الأعراض، المشكلة الظاهرة، سبب الزيارة...' : 'Symptoms, client concerns, reasons for visit...'}
                className={`${inputCls} resize-none`}
                required
              />
            </div>

            {/* Collapsible Vitals */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVitals((v) => !v)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 font-bold text-xs text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-1.5">
                  <Activity size={14} className="text-rose-500" />
                  {isAr ? 'العلامات الحيوية (Vitals)' : 'Patient Vitals & Examination'}
                </span>
                {showVitals ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showVitals && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{isAr ? 'الوزن (kg)' : 'Weight (kg)'}</label>
                    <input
                      value={vitals.weight_kg || ''}
                      onChange={(e) => setVitals((p) => ({ ...p, weight_kg: e.target.value }))}
                      placeholder="e.g. 12.5"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{isAr ? 'الحرارة (°C)' : 'Temp (°C)'}</label>
                    <input
                      value={vitals.temp_rectal_c || ''}
                      onChange={(e) => setVitals((p) => ({ ...p, temp_rectal_c: e.target.value }))}
                      placeholder="e.g. 38.5"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{isAr ? 'النبض (bpm)' : 'Heart Rate'}</label>
                    <input
                      value={vitals.heart_rate || ''}
                      onChange={(e) => setVitals((p) => ({ ...p, heart_rate: e.target.value }))}
                      placeholder="e.g. 110"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{isAr ? 'التنفس (brpm)' : 'Resp Rate'}</label>
                    <input
                      value={vitals.resp_rate || ''}
                      onChange={(e) => setVitals((p) => ({ ...p, resp_rate: e.target.value }))}
                      placeholder="e.g. 24"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">CRT</label>
                    <input
                      value={vitals.crt || ''}
                      onChange={(e) => setVitals((p) => ({ ...p, crt: e.target.value }))}
                      placeholder="< 2s"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">{isAr ? 'الأغشية' : 'Mucous Memb.'}</label>
                    <input
                      value={vitals.mucous_membranes || ''}
                      onChange={(e) => setVitals((p) => ({ ...p, mucous_membranes: e.target.value }))}
                      placeholder="Pink, moist"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Diagnosis & Clinical Notes */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'التشخيص الطبي' : 'Clinical Diagnosis'}
                </label>
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                  rows={2}
                  placeholder={isAr ? 'النتيجة التشخيصية...' : 'Diagnostic findings and clinical conclusions...'}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'ملاحظات الطبيب وتوصيات العلاج' : 'Treatment & Internal Notes'}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder={isAr ? 'تعليمات خاصة للعميل أو العيادة...' : 'Client instructions, dietary advice...'}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'تاريخ المتابعة القادمة' : 'Follow-up Check Date'}
              </label>
              <DateField
                value={form.followUpDate}
                onChange={(v) => setForm((p) => ({ ...p, followUpDate: v }))}
                className={inputCls}
              />
            </div>

            {/* Prescriptions Section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Pill size={14} className="text-emerald-500" />
                  {isAr ? 'الوصفة الطبية والعلاجات المصروفة' : 'Prescriptions & Rx'}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setPrescriptions((p) => [
                      ...p,
                      { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '', isActive: true }
                    ])
                  }
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={13} /> {isAr ? 'إضافة دواء' : 'Add Medication'}
                </button>
              </div>

              {prescriptions.map((rx, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      value={rx.medicineName}
                      onChange={(e) =>
                        setPrescriptions((p) =>
                          p.map((item, i) => (i === idx ? { ...item, medicineName: e.target.value } : item))
                        )
                      }
                      placeholder={isAr ? 'اسم الدواء *' : 'Medicine name *'}
                      className={`${inputCls} flex-1`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setPrescriptions((p) => p.filter((_, i) => i !== idx))}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={rx.dosage || ''}
                      onChange={(e) =>
                        setPrescriptions((p) =>
                          p.map((item, i) => (i === idx ? { ...item, dosage: e.target.value } : item))
                        )
                      }
                      placeholder={isAr ? 'الجرعة' : 'Dosage (e.g. 5ml)'}
                      className={inputCls}
                    />
                    <input
                      value={rx.frequency || ''}
                      onChange={(e) =>
                        setPrescriptions((p) =>
                          p.map((item, i) => (i === idx ? { ...item, frequency: e.target.value } : item))
                        )
                      }
                      placeholder={isAr ? 'التكرار' : 'Freq (e.g. 2x/day)'}
                      className={inputCls}
                    />
                    <input
                      value={rx.duration || ''}
                      onChange={(e) =>
                        setPrescriptions((p) =>
                          p.map((item, i) => (i === idx ? { ...item, duration: e.target.value } : item))
                        )
                      }
                      placeholder={isAr ? 'المدة' : 'Duration (5 days)'}
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Financial & Billing */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-500" />
                {isAr ? 'الحسابات ورسوم الجلسة' : 'Billing & Payment Settlement'}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'المبلغ المطلوب' : 'Amount Charged'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amountCharged}
                    onChange={(e) => setForm((p) => ({ ...p, amountCharged: e.target.value }))}
                    placeholder="0.00"
                    className={`${inputCls} font-black text-slate-900 dark:text-white`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'المبلغ المدفوع' : 'Amount Paid'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amountPaid}
                    onChange={(e) => setForm((p) => ({ ...p, amountPaid: e.target.value }))}
                    placeholder="0.00"
                    className={`${inputCls} font-black text-emerald-600 dark:text-emerald-400`}
                  />
                </div>
              </div>

              {/* Live Badge & Balance */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">{isAr ? 'حالة الدفع:' : 'Status:'}</span>
                  <span className={`font-black px-2.5 py-0.5 rounded-full border text-[10px] ${payCfg.bg}`}>
                    {isAr ? payCfg.labelAr : payCfg.labelEn}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 mr-1.5">{isAr ? 'المتبقي:' : 'Balance Due:'}</span>
                  <span className={`font-black text-sm ${balanceVal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                    ${balanceVal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'طريقة الدفع' : 'Payment Method'}
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                    className={inputCls}
                  >
                    {SESSION_PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {isAr ? pm.labelAr : pm.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 mt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waived}
                    onChange={(e) => setWaived(e.target.checked)}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>{isAr ? 'إعفاء من الرسوم (مجاني)' : 'Waive session charges'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{isAr ? 'جاري الحفظ...' : 'Saving…'}</span>
                </>
              ) : (
                <span>{isEdit ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'تسجيل الجلسة' : 'Create Session')}</span>
              )}
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