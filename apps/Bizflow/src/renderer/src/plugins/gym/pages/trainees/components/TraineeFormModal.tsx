import { useState, useEffect } from 'react'
import { X, Loader2, User, Phone, Mail, ShieldAlert } from 'lucide-react'
import { Trainee, TraineeFormData } from '../types'
import { GENDER_OPTIONS } from '../constants'
import { calculateAge } from '../utils'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface TraineeFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (trainee: Trainee) => void
  initial?: Trainee | null
}

const defaultFormData: TraineeFormData = {
  name: '',
  phone: '',
  email: '',
  age: '',
  gender: '',
  nationalId: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: '',
  notes: ''
}

export function TraineeFormModal({ isOpen, onClose, onSaved, initial }: TraineeFormModalProps) {
  const toast = useToast()
  const { t } = useLanguage()
  const [form, setForm] = useState<TraineeFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        name: initial.name ?? '',
        phone: initial.phone ?? '',
        email: initial.email ?? '',
        age: calculateAge(initial.dateOfBirth),
        gender: initial.gender ?? '',
        nationalId: initial.nationalId ?? '',
        address: initial.address ?? '',
        emergencyContact: initial.emergencyContact ?? '',
        emergencyPhone: initial.emergencyPhone ?? '',
        notes: initial.notes ?? ''
      })
    } else {
      setForm(defaultFormData)
    }
  }, [isOpen, initial])

  if (!isOpen) return null

  const setField = (k: keyof TraineeFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        dateOfBirth: form.age
          ? new Date(new Date().getFullYear() - parseInt(form.age), 0, 1).toISOString()
          : null,
        gender: form.gender || null,
        nationalId: form.nationalId.trim() || null,
        address: form.address.trim() || null,
        emergencyContact: form.emergencyContact.trim() || null,
        emergencyPhone: form.emergencyPhone.trim() || null,
        notes: form.notes.trim() || null
      }

      let result: Trainee
      if (initial) {
        result = await (window.api as any).gym?.trainees?.update(initial.id, payload)
        toast.success('Member profile updated')
      } else {
        result = await (window.api as any).gym?.trainees?.create(payload)
        toast.success('New member registered')
      }
      onSaved(result)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save member profile')
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <User size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initial ? t('gymEditTrainee') || 'Edit Member' : t('gymNewTrainee') || 'Register New Member'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Full Name */}
          <div>
            <label className={labelCls}>{t('gymFullName') || 'Full Name'} *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={setField('name')}
              placeholder={t('gymMemberFullName') || 'e.g. Alexander Smith'}
              required
              autoFocus
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymPhone') || 'Phone'}</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className={`${inputCls} pl-9 font-mono`}
                  type="tel"
                  value={form.phone}
                  onChange={setField('phone')}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('gymEmail') || 'Email'}</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className={`${inputCls} pl-9`}
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder="alex@example.com"
                />
              </div>
            </div>
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymAge') || 'Age'}</label>
              <input
                className={inputCls}
                type="number"
                min="5"
                max="110"
                value={form.age}
                onChange={setField('age')}
                placeholder="e.g. 28"
              />
            </div>
            <div>
              <label className={labelCls}>{t('gymGender') || 'Gender'}</label>
              <select className={inputCls} value={form.gender} onChange={setField('gender')}>
                <option value="">Select Gender</option>
                {GENDER_OPTIONS.map(g => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* National ID & Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymNationalId') || 'National / Passport ID'}</label>
              <input
                className={inputCls}
                value={form.nationalId}
                onChange={setField('nationalId')}
                placeholder="ID Number"
              />
            </div>
            <div>
              <label className={labelCls}>{t('gymAddress') || 'Address'}</label>
              <input
                className={inputCls}
                value={form.address}
                onChange={setField('address')}
                placeholder="City, Street"
              />
            </div>
          </div>

          {/* Emergency Contact Group */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>Emergency Contact Info</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                className={inputCls}
                value={form.emergencyContact}
                onChange={setField('emergencyContact')}
                placeholder="Contact Name"
              />
              <input
                className={`${inputCls} font-mono`}
                type="tel"
                value={form.emergencyPhone}
                onChange={setField('emergencyPhone')}
                placeholder="Emergency Phone"
              />
            </div>
          </div>

          {/* Medical Notes */}
          <div>
            <label className={labelCls}>{t('gymNotes') || 'Health & Medical Notes'}</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={setField('notes')}
              placeholder="Allergies, injuries, physician notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('gymCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{initial ? t('gymSave') || 'Save Changes' : t('gymAddTrainee') || 'Create Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}