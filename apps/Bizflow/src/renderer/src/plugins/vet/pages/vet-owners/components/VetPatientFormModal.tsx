import { useState, useEffect } from 'react'
import { X, Loader2, PawPrint } from 'lucide-react'
import { VetPatient } from '../types'
import { SPECIES_OPTIONS, KNOWN_SPECIES } from '../species'
import { computePatientAge, dobFromAge } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  patient?: VetPatient | null
  preselectedOwner?: { id: string; name: string; phone: string } | null
  onSave: () => void
  onClose: () => void
}

const inputCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

export function VetPatientFormModal({ patient, preselectedOwner, onSave, onClose }: Props) {
  const isEdit = Boolean(patient)
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [form, setForm] = useState({
    name: '',
    species: 'dog',
    breed: '',
    petColor: '',
    microchipId: '',
    ageYears: '',
    ageMonths: '',
    gender: '',
    weight: '',
    allergies: '',
    medicalNotes: '',
    ownerId: ''
  })
  const [customSpecies, setCustomSpecies] = useState('')

  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerResults, setOwnerResults] = useState<any[]>([])
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null)
  const [ownerSearching, setOwnerSearching] = useState(false)

  const [showOwnerCreate, setShowOwnerCreate] = useState(false)
  const [ownerForm, setOwnerForm] = useState({ name: '', phone: '', address: '' })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (patient) {
      const age = computePatientAge(patient.dateOfBirth)
      const known = KNOWN_SPECIES.includes(patient.species) ? patient.species : 'other'
      setForm({
        name: patient.name,
        species: known,
        breed: patient.breed || '',
        petColor: patient.petColor || '',
        microchipId: patient.microchipId || '',
        ageYears: age.years,
        ageMonths: age.months,
        gender: patient.gender || '',
        weight: patient.weight ? String(patient.weight) : '',
        allergies: patient.allergies || '',
        medicalNotes: patient.medicalNotes || '',
        ownerId: patient.ownerId
      })
      if (!KNOWN_SPECIES.includes(patient.species) && patient.species !== 'other') {
        setCustomSpecies(patient.species)
      }
      setSelectedOwner(patient.owner)
    } else if (preselectedOwner) {
      setSelectedOwner(preselectedOwner)
      setForm((p) => ({ ...p, ownerId: preselectedOwner.id }))
    }
  }, [patient, preselectedOwner])

  const searchOwners = async (q: string) => {
    if (!q.trim()) { setOwnerResults([]); return }
    setOwnerSearching(true)
    try {
      const results = await window.api.vet?.owners.searchLite(q)
      setOwnerResults(results ?? [])
    } finally {
      setOwnerSearching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(isAr ? 'اسم الحيوان مطلوب' : 'Pet name is required')
      return
    }
    if (!selectedOwner && !showOwnerCreate) {
      setError(isAr ? 'يرجى تحديد مالك للحيوان' : 'Owner is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      let ownerId = selectedOwner?.id

      if (showOwnerCreate) {
        if (!ownerForm.name.trim() || !ownerForm.phone.trim()) {
          setError(isAr ? 'اسم وهاتف المالك مطلوبان' : 'Owner name and phone are required')
          setSaving(false)
          return
        }
        const newOwner = await window.api.vet?.owners.create({
          name: ownerForm.name.trim(),
          phone: ownerForm.phone.trim(),
          address: ownerForm.address.trim() || undefined
        })
        ownerId = newOwner?.id
      }

      const speciesValue =
        form.species === 'other' && customSpecies.trim()
          ? customSpecies.trim().toLowerCase()
          : form.species

      const payload: any = {
        name: form.name.trim(),
        species: speciesValue,
        breed: form.breed.trim() || undefined,
        petColor: form.petColor.trim() || undefined,
        microchipId: form.microchipId.trim() || undefined,
        dateOfBirth: dobFromAge(form.ageYears, form.ageMonths),
        gender: form.gender || undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        allergies: form.allergies.trim() || undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
        ownerId
      }

      if (isEdit && patient) {
        await window.api.vet?.patients.update(patient.id, payload)
      } else {
        await window.api.vet?.patients.create(payload)
      }
      onSave()
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <PawPrint size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEdit ? (isAr ? 'تعديل ملف الحيوان الأليف' : 'Edit Pet Profile') : (isAr ? 'تسجيل حيوان أليف جديد' : 'New Pet Registration')}
              </h2>
              <p className="text-xs text-slate-400">{isAr ? 'البيانات الحيوية والسلالة والملف الطبي' : 'Patient clinical demographics'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Pet Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'اسم الحيوان' : 'Pet Name'} *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Bella"
                required
                className={inputCls}
              />
            </div>

            {/* Species Selector Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isAr ? 'النوع / الفصيلة' : 'Species'} *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SPECIES_OPTIONS.map((s) => {
                  const active = form.species === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, species: s.value }))}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                        active
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 shadow-sm ring-2 ring-violet-500/20 scale-105'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                      }`}
                    >
                      <span className="text-xl">{s.emoji}</span>
                      <span>{isAr ? s.labelAr : s.labelEn}</span>
                    </button>
                  )
                })}
              </div>
              {form.species === 'other' && (
                <input
                  value={customSpecies}
                  onChange={(e) => setCustomSpecies(e.target.value)}
                  className={`${inputCls} mt-2`}
                  placeholder={isAr ? 'حدد نوع الحيوان (مثل: سلحفاة، هامستر، جمل...)' : 'Specify custom species...'}
                  autoFocus
                />
              )}
            </div>

            {/* Breed, Color, Gender, Weight */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'السلالة' : 'Breed'}</label>
                <input
                  value={form.breed}
                  onChange={(e) => setForm((p) => ({ ...p, breed: e.target.value }))}
                  placeholder="e.g. Persian"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'اللون' : 'Color'}</label>
                <input
                  value={form.petColor}
                  onChange={(e) => setForm((p) => ({ ...p, petColor: e.target.value }))}
                  placeholder="e.g. White"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'الجنس' : 'Gender'}</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">{isAr ? 'غير محدد' : 'Unknown'}</option>
                  <option value="male">{isAr ? 'ذكر' : 'Male'}</option>
                  <option value="female">{isAr ? 'أنثى' : 'Female'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'الوزن (kg)' : 'Weight'}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.weight}
                  onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                  placeholder="kg"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Age In Years & Months */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'العمر (بالسنوات)' : 'Age — Years'}</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={form.ageYears}
                  onChange={(e) => setForm((p) => ({ ...p, ageYears: e.target.value }))}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'الشهور' : 'Age — Months'}</label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={form.ageMonths}
                  onChange={(e) => setForm((p) => ({ ...p, ageMonths: e.target.value }))}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Microchip */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'رقم الشريحة (Microchip ID)' : 'Microchip ID'}</label>
              <input
                value={form.microchipId}
                onChange={(e) => setForm((p) => ({ ...p, microchipId: e.target.value }))}
                placeholder="e.g. 985141000123456"
                className={inputCls}
              />
            </div>

            {/* Allergies & Medical Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'الحساسية المعروفة' : 'Known Allergies'}</label>
                <input
                  value={form.allergies}
                  onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))}
                  placeholder="e.g. Penicillin"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isAr ? 'ملاحظات وتاريخ مرضي' : 'Medical Notes'}</label>
                <input
                  value={form.medicalNotes}
                  onChange={(e) => setForm((p) => ({ ...p, medicalNotes: e.target.value }))}
                  placeholder="Chronic conditions..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Owner Section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{isAr ? 'المالك المسؤول' : 'Responsible Owner'} *</label>
                {!preselectedOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOwnerCreate((c) => !c)
                      setSelectedOwner(null)
                    }}
                    className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {showOwnerCreate ? (isAr ? 'بحث في الملاك المسجلين' : 'Search existing owners') : (isAr ? '+ إنشاء مالك جديد' : '+ Create new owner')}
                  </button>
                )}
              </div>

              {selectedOwner ? (
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedOwner.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{selectedOwner.phone}</p>
                  </div>
                  {!preselectedOwner && (
                    <button
                      type="button"
                      onClick={() => setSelectedOwner(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ) : !showOwnerCreate ? (
                <div className="relative">
                  <input
                    value={ownerSearch}
                    onChange={(e) => {
                      setOwnerSearch(e.target.value)
                      searchOwners(e.target.value)
                    }}
                    className={inputCls}
                    placeholder={isAr ? 'ابحث باسم المالك أو الهاتف...' : 'Search owner by name or phone…'}
                  />
                  {ownerSearching && <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                  {ownerResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                      {ownerResults.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setSelectedOwner(o)
                            setOwnerSearch('')
                            setOwnerResults([])
                          }}
                          className="w-full text-left rtl:text-right px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{o.name}</span>
                          <span className="text-slate-400 ml-2 rtl:ml-0 rtl:mr-2 font-mono">{o.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">{isAr ? 'اسم المالك' : 'Name'} *</label>
                    <input
                      value={ownerForm.name}
                      onChange={(e) => setOwnerForm((p) => ({ ...p, name: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">{isAr ? 'رقم الهاتف' : 'Phone'} *</label>
                    <input
                      value={ownerForm.phone}
                      onChange={(e) => setOwnerForm((p) => ({ ...p, phone: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 active:scale-95"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : isEdit ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'تسجيل المريض' : 'Create Pet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}