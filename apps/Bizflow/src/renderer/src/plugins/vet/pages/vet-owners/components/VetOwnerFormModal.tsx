import { useState, useEffect } from 'react'
import { X, Loader2, User, Phone, MapPin, PawPrint , Mail } from 'lucide-react'
import { VetOwner } from '../types'
import { SPECIES_OPTIONS } from '../species'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  owner?: VetOwner | null
  onSave: (owner: VetOwner) => void
  onClose: () => void
}

const inputCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

export function VetOwnerFormModal({ owner, onSave, onClose }: Props) {
  const isEdit = Boolean(owner)
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const [addPet, setAddPet] = useState(false)
  const [pet, setPet] = useState({ name: '', species: 'dog', breed: '', gender: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (owner) {
      setForm({
        name: owner.name || '',
        phone: owner.phone || '',
        email: owner.email || '',
        address: owner.address || '',
        notes: owner.notes || ''
      })
    }
  }, [owner])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(isAr ? 'اسم المالك مطلوب' : 'Owner name is required')
      return
    }
    if (!form.phone.trim()) {
      setError(isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required')
      return
    }
    if (addPet && !pet.name.trim()) {
      setError(isAr ? 'اسم الحيوان الأليف مطلوب' : 'Pet name is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined
      }

      let result: VetOwner
      if (isEdit && owner) {
        result = (await window.api.vet?.owners.update(owner.id, payload)) as VetOwner
      } else {
        result = (await window.api.vet?.owners.create(payload)) as VetOwner
        if (addPet && pet.name.trim()) {
          await window.api.vet?.patients.create({
            name: pet.name.trim(),
            species: pet.species,
            breed: pet.breed.trim() || undefined,
            gender: pet.gender || undefined,
            ownerId: result.id
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <User size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEdit ? (isAr ? 'تعديل بيانات المالك' : 'Edit Pet Owner') : (isAr ? 'تسجيل مالك جديد' : 'Register New Owner')}
              </h2>
              <p className="text-xs text-slate-400">{isAr ? 'إدارة سجل بيانات العميل والاتصال' : 'Contact & Profile details'}</p>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'الاسم بالكامل' : 'Full Name'} *
              </label>
              <div className="relative">
                <User className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={isAr ? 'مثال: أحمد عبد الله' : 'e.g. Ahmed Ali'}
                  required
                  className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'رقم الهاتف' : 'Phone'} *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="05xxxxxxxx"
                    required
                    dir="ltr"
                    className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9 text-start`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="owner@example.com"
                    dir="ltr"
                    className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9 text-start`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'العنوان' : 'Address'}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder={isAr ? 'المدينة / الحي...' : 'City / District'}
                  className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder={isAr ? 'أي معلومات إضافية...' : 'Any preferences or notes...'}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Optional First Pet Creation */}
            {!isEdit && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAddPet((p) => !p)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                    addPet
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <PawPrint size={15} />
                  <span>{addPet ? (isAr ? 'إلغاء إضافة الحيوان الأول' : 'Remove First Pet') : (isAr ? '+ إضافة الحيوان الأليف الأول معه الآن' : '+ Register First Pet Now')}</span>
                </button>

                {addPet && (
                  <div className="mt-3 p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-violet-700 dark:text-violet-300 mb-1">
                        {isAr ? 'اسم الحيوان' : 'Pet Name'} *
                      </label>
                      <input
                        value={pet.name}
                        onChange={(e) => setPet((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Max"
                        className={inputCls}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-violet-700 dark:text-violet-300 mb-1">
                          {isAr ? 'النوع' : 'Species'}
                        </label>
                        <select
                          value={pet.species}
                          onChange={(e) => setPet((p) => ({ ...p, species: e.target.value }))}
                          className={inputCls}
                        >
                          {SPECIES_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.emoji} {isAr ? s.labelAr : s.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-violet-700 dark:text-violet-300 mb-1">
                          {isAr ? 'السلالة' : 'Breed'}
                        </label>
                        <input
                          value={pet.breed}
                          onChange={(e) => setPet((p) => ({ ...p, breed: e.target.value }))}
                          placeholder="e.g. Husky"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              {saving ? <Loader2 size={14} className="animate-spin" /> : isEdit ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'تسجيل المالك' : 'Create Owner')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}