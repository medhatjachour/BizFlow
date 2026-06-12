import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { VetPatient } from '../index'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  patient?: VetPatient | null
  preselectedOwner?: { id: string; name: string; phone: string } | null
  onSave: () => void
  onClose: () => void
}

const KNOWN_SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'fish', 'other']

function computeAge(dob: string): { years: string; months: string } {
  if (!dob) return { years: '', months: '' }
  const d = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  let months = now.getMonth() - d.getMonth()
  if (months < 0) { years--; months += 12 }
  return { years: String(Math.max(0, years)), months: String(Math.max(0, months)) }
}

function dobFromAge(years: string, months: string): string | undefined {
  const y = parseInt(years) || 0
  const m = parseInt(months) || 0
  if (y === 0 && m === 0) return undefined
  const d = new Date()
  d.setFullYear(d.getFullYear() - y)
  d.setMonth(d.getMonth() - m)
  return d.toISOString()
}

export default function VetPatientFormModal({ patient, preselectedOwner, onSave, onClose }: Props) {
  const isEdit = !!patient
  const { t } = useLanguage()

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

  const [ownerSearch,    setOwnerSearch]   = useState('')
  const [ownerResults,   setOwnerResults]  = useState<any[]>([])
  const [selectedOwner,  setSelectedOwner] = useState<any | null>(null)
  const [ownerSearching, setOwnerSearching] = useState(false)

  const [showOwnerCreate, setShowOwnerCreate] = useState(false)
  const [ownerForm, setOwnerForm] = useState({ name: '', phone: '', address: '' })

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (patient) {
      const age = computeAge(patient.dateOfBirth ?? '')
      const knownSpecies = KNOWN_SPECIES.includes(patient.species) ? patient.species : 'other'
      const isCustom = !KNOWN_SPECIES.includes(patient.species) || (patient.species === 'other')
      setForm({
        name:         patient.name,
        species:      knownSpecies,
        breed:        patient.breed ?? '',
        petColor:     patient.petColor ?? '',
        microchipId:  patient.microchipId ?? '',
        ageYears:     age.years,
        ageMonths:    age.months,
        gender:       patient.gender ?? '',
        weight:       patient.weight?.toString() ?? '',
        allergies:    patient.allergies ?? '',
        medicalNotes: patient.medicalNotes ?? '',
        ownerId:      patient.ownerId
      })
      if (isCustom && patient.species !== 'other') setCustomSpecies(patient.species)
      setSelectedOwner(patient.owner)
    } else if (preselectedOwner) {
      setSelectedOwner(preselectedOwner)
      setForm(prev => ({ ...prev, ownerId: preselectedOwner.id }))
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
    if (!form.name.trim()) { setError('Pet name is required'); return }
    if (!selectedOwner && !showOwnerCreate) { setError('Owner is required'); return }

    setSaving(true)
    setError('')
    try {
      let ownerId = selectedOwner?.id

      if (showOwnerCreate) {
        if (!ownerForm.name.trim() || !ownerForm.phone.trim()) {
          setError('Owner name and phone are required')
          setSaving(false)
          return
        }
        const newOwner = await window.api.vet?.owners.create({
          name:    ownerForm.name.trim(),
          phone:   ownerForm.phone.trim(),
          address: ownerForm.address.trim() || undefined,
        })
        ownerId = newOwner?.id
      }

      const speciesValue =
        form.species === 'other' && customSpecies.trim()
          ? customSpecies.trim().toLowerCase()
          : form.species

      const payload: any = {
        name:         form.name.trim(),
        species:      speciesValue,
        breed:        form.breed.trim() || undefined,
        petColor:     form.petColor.trim() || undefined,
        microchipId:  form.microchipId.trim() || undefined,
        dateOfBirth:  dobFromAge(form.ageYears, form.ageMonths),
        gender:       form.gender || undefined,
        weight:       form.weight ? parseFloat(form.weight) : undefined,
        allergies:    form.allergies.trim() || undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
        ownerId
      }

      if (isEdit) {
        await window.api.vet?.patients.update(patient!.id, payload)
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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{isEdit ? (t('vetEditPet')||'Edit Pet') : (t('vetNewPet')||'New Pet')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Pet fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pet name */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('petName')||'Pet Name'} *</label>
              <input value={form.name} onChange={set('name')} required className={inputCls} placeholder="e.g. Buddy" />
            </div>

            {/* Species */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('species')||'Species'} *</label>
              <select value={form.species} onChange={set('species')} className={inputCls}>
                {KNOWN_SPECIES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              {form.species === 'other' && (
                <input
                  value={customSpecies}
                  onChange={e => setCustomSpecies(e.target.value)}
                  className={`${inputCls} mt-1.5`}
                  placeholder={`${t('vetSpecifySpecies')||'Specify species'} (e.g. Hamster, Turtle...)`}
                />
              )}
            </div>

            {/* Breed */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('breed')||'Breed'}</label>
              <input value={form.breed} onChange={set('breed')} className={inputCls} placeholder="e.g. Labrador" />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('petColor')||'Color'}</label>
              <input value={form.petColor} onChange={set('petColor')} className={inputCls} placeholder="e.g. Golden" />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('petGender')||'Gender'}</label>
              <select value={form.gender} onChange={set('gender')} className={inputCls}>
                <option value="">{t('petUnknownGender')||'Unknown'}</option>
                <option value="male">{t('petMale')||'Male'}</option>
                <option value="female">{t('petFemale')||'Female'}</option>
              </select>
            </div>

            {/* Age (replaces Date of Birth) */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetAgeYearsLabel')||'Age — Years'}</label>
              <input
                type="number" min="0" max="30"
                value={form.ageYears}
                onChange={set('ageYears')}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetAgeMonthsLabel')||'Age — Months'}</label>
              <input
                type="number" min="0" max="11"
                value={form.ageMonths}
                onChange={set('ageMonths')}
                className={inputCls}
                placeholder="0"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('petWeight')||'Weight (kg)'}</label>
              <input type="number" step="0.1" min="0" value={form.weight} onChange={set('weight')} className={inputCls} placeholder="e.g. 5.2" />
            </div>

            {/* Microchip */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('microchipId')||'Microchip ID'}</label>
              <input value={form.microchipId} onChange={set('microchipId')} className={inputCls} placeholder="e.g. 985141000123456" />
            </div>

            {/* Allergies */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('petAllergies')||'Allergies'}</label>
              <input value={form.allergies} onChange={set('allergies')} className={inputCls} placeholder="Known allergies" />
            </div>

            {/* Medical Notes */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('petMedicalNotes')||'Medical Notes'}</label>
              <textarea value={form.medicalNotes} onChange={set('medicalNotes')} rows={2} className={`${inputCls} resize-none`} placeholder="Ongoing conditions, history..." />
            </div>
          </div>

          {/* Owner section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('vetOwnerLabel')||'Owner'} *</h3>
              {!preselectedOwner && (
                <button
                  type="button"
                  onClick={() => { setShowOwnerCreate(c => !c); setSelectedOwner(null) }}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                >
                  {showOwnerCreate ? (t('vetSearchExistingOwner')||'Search existing owner') : (t('vetCreateNewOwner')||'+ Create new owner')}
                </button>
              )}
            </div>

            {preselectedOwner && (
              <div className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
                <div className="h-7 w-7 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 flex-shrink-0">
                  {preselectedOwner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{preselectedOwner.name}</p>
                  <p className="text-xs text-slate-500">{preselectedOwner.phone}</p>
                </div>
              </div>
            )}

            {!preselectedOwner && (
              <>
                {!showOwnerCreate ? (
                  selectedOwner ? (
                    <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedOwner.name}</p>
                        <p className="text-xs text-slate-500">{selectedOwner.phone}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedOwner(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={ownerSearch}
                        onChange={e => { setOwnerSearch(e.target.value); searchOwners(e.target.value) }}
                        className={inputCls}
                        placeholder={t('vetSearchOwner')||'Search owner by name or phone...'}
                      />
                      {ownerSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                      {ownerResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {ownerResults.map(o => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => { setSelectedOwner(o); setOwnerSearch(''); setOwnerResults([]) }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              <span className="font-medium text-slate-900 dark:text-white">{o.name}</span>
                              <span className="text-slate-400 ml-2">{o.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('fullName')||'Name'} *</label>
                      <input value={ownerForm.name} onChange={e => setOwnerForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('phone')||'Phone'} *</label>
                      <input value={ownerForm.phone} onChange={e => setOwnerForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetAddress')||'Address'}</label>
                      <input value={ownerForm.address} onChange={e => setOwnerForm(p => ({ ...p, address: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600">
              {t('cancel')||'Cancel'}
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : isEdit ? (t('vetSaveChanges')||'Save Changes') : (t('vetNewPet')||'Create Pet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'