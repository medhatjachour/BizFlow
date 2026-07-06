import { useState, useEffect } from 'react'
import { X, Loader2, User, Phone, MapPin, FileText, PawPrint, Plus, Minus } from 'lucide-react'
import type { VetOwner } from '../../index'
import { useLanguage } from '@renderer/contexts/LanguageContext'

const SPECIES_OPTS = [
  { value: 'dog',     emoji: '🐕', label: 'Dog' },
  { value: 'cat',     emoji: '🐈', label: 'Cat' },
  { value: 'bird',    emoji: '🦜', label: 'Bird' },
  { value: 'rabbit',  emoji: '🐇', label: 'Rabbit' },
  { value: 'reptile', emoji: '🦎', label: 'Reptile' },
  { value: 'fish',    emoji: '🐠', label: 'Fish' },
  { value: 'other',   emoji: '🐾', label: 'Other' },
]

interface Props {
  owner?: VetOwner | null
  onSave: (owner: VetOwner) => void
  onClose: () => void
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors'

export default function VetOwnerFormModal({ owner, onSave, onClose }: Props) {
  const isEdit = !!owner
  const { t } = useLanguage()

  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const [addPet, setAddPet] = useState(false)
  const [pet, setPet]       = useState({ name: '', species: 'dog', breed: '', gender: '' })

  useEffect(() => {
    if (owner) {
      setForm({
        name:    owner.name,
        phone:   owner.phone,
        address: owner.address ?? '',
        notes:   owner.notes   ?? '',
      })
    }
  }, [owner])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())  { setError('Name is required');     return }
    if (!form.phone.trim()) { setError('Phone is required');    return }
    if (addPet && !pet.name.trim()) { setError('Pet name is required'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        name:    form.name.trim(),
        phone:   form.phone.trim(),
        address: form.address.trim() || undefined,
        notes:   form.notes.trim()   || undefined,
      }

      let result: VetOwner
      if (isEdit) {
        result = await window.api.vet?.owners.update(owner!.id, payload) as VetOwner
      } else {
        result = await window.api.vet?.owners.create(payload) as VetOwner
        if (addPet && pet.name.trim()) {
          await window.api.vet?.patients.create({
            name:    pet.name.trim(),
            species: pet.species,
            breed:   pet.breed.trim() || undefined,
            gender:  pet.gender       || undefined,
            ownerId: result.id,
          })
        }
      }
      onSave(result)
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-sm">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {isEdit ? (t('vetEditOwner')||'Edit Owner') : (t('vetNewOwner')||'New Owner')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('vetPetOwnerReg')||'Pet owner registration'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">

            {/* Owner fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('fullName')||'Full Name'} *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={form.name} onChange={set('name')} placeholder="e.g. Ahmed Al-Rashidi" required className={`${inputCls} pl-9`} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('phone')||'Phone'} *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={form.phone} onChange={set('phone')} placeholder="05xxxxxxxx" required className={`${inputCls} pl-9`} />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('vetAddress')||'Address'}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={form.address} onChange={set('address')} placeholder="City / district" className={`${inputCls} pl-9`} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('vetNotes')||'Notes'}</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any additional notes..." className={`${inputCls} pl-9 resize-none`} />
                </div>
              </div>
            </div>

            {/* Add First Pet (new owner only) */}
            {!isEdit && (
              <div>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <button
                    type="button"
                    onClick={() => setAddPet(p => !p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-all ${
                      addPet
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400'
                    }`}
                  >
                    {addPet ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    <PawPrint className="h-3 w-3" />
                    {addPet ? (t('vetRemoveFirstPet')||'Remove first pet') : (t('vetAddFirstPet')||'Add first pet')}
                  </button>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                {addPet && (
                  <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/15 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-800 flex items-center justify-center">
                        <PawPrint className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
                      </div>
                      <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">{t('vetFirstPet')||'First Pet'}</p>
                    </div>

                    {/* Species chips */}
                    <div>
                      <label className="block text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">{t('species')||'Species'}</label>
                      <div className="flex flex-wrap gap-2">
                        {SPECIES_OPTS.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setPet(p => ({ ...p, species: s.value }))}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border-2 transition-all ${
                              pet.species === s.value
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm scale-105'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-400'
                            }`}
                          >
                            <span className="text-base leading-none">{s.emoji}</span>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pet name */}
                    <div>
                      <label className="block text-xs font-medium text-violet-700 dark:text-violet-400 mb-1.5">{t('petName')||'Pet Name'} *</label>
                      <input
                        value={pet.name}
                        onChange={e => setPet(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Buddy"
                        className={inputCls}
                      />
                    </div>

                    {/* Breed + Gender */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-violet-700 dark:text-violet-400 mb-1.5">{t('breed')||'Breed'}</label>
                        <input
                          value={pet.breed}
                          onChange={e => setPet(p => ({ ...p, breed: e.target.value }))}
                          placeholder="e.g. Labrador"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-violet-700 dark:text-violet-400 mb-1.5">{t('petGender')||'Gender'}</label>
                        <select
                          value={pet.gender}
                          onChange={e => setPet(p => ({ ...p, gender: e.target.value }))}
                          className={inputCls}
                        >
                          <option value="">{t('petUnknownGender')||'Unknown'}</option>
                          <option value="male">{t('petMale')||'Male'}</option>
                          <option value="female">{t('petFemale')||'Female'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('cancel')||'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving...' : isEdit ? (t('vetSaveChanges')||'Save Changes') : addPet ? 'Create Owner & Pet' : (t('vetNewOwner')||'Create Owner')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}