import { useState, useEffect } from 'react'
import { X, Loader2, UserCheck, Phone, Mail, DollarSign, Calendar } from 'lucide-react'
import { Coach, CoachFormData } from '../types'
import { SALARY_TYPES } from '../constants'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface CoachFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (coach: Coach) => void
  initial?: Coach | null
}

const defaultForm: CoachFormData = {
  name: '',
  specialty: '',
  phone: '',
  email: '',
  nationalId: '',
  salary: '',
  salaryType: 'monthly',
  hireDate: '',
  isActive: true,
  notes: ''
}

export function CoachFormModal({ isOpen, onClose, onSaved, initial }: CoachFormModalProps) {
  const toast = useToast()
  const { t } = useLanguage()
  const [form, setForm] = useState<CoachFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        name: initial.name ?? '',
        specialty: initial.specialty ?? '',
        phone: initial.phone ?? '',
        email: initial.email ?? '',
        nationalId: initial.nationalId ?? '',
        salary: initial.salary != null ? String(initial.salary) : '',
        salaryType: initial.salaryType ?? 'monthly',
        hireDate: initial.hireDate ? new Date(initial.hireDate).toISOString().slice(0, 10) : '',
        isActive: initial.isActive ?? true,
        notes: initial.notes ?? ''
      })
    } else {
      setForm(defaultForm)
    }
  }, [isOpen, initial])

  if (!isOpen) return null

  const setField = (k: keyof CoachFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        specialty: form.specialty.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        nationalId: form.nationalId.trim() || null,
        salary: form.salary !== '' ? parseFloat(form.salary) : 0,
        salaryType: form.salaryType || 'monthly',
        ...(form.hireDate ? { hireDate: new Date(form.hireDate).toISOString() } : {}),
        isActive: form.isActive,
        notes: form.notes.trim() || null
      }

      let result: Coach
      if (initial) {
        result = await (window.api as any).gym?.coaches?.update(initial.id, payload)
        toast.success('Coach updated')
      } else {
        result = await (window.api as any).gym?.coaches?.create(payload)
        toast.success('Coach enrolled')
      }
      onSaved(result)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
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
              <UserCheck size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initial ? t('gymEditCoach') || 'Edit Coach Profile' : t('gymNewCoach') || 'Add New Coach'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Full Name */}
          <div>
            <label className={labelCls}>{t('gymFullName') || 'Coach Name'} *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={setField('name')}
              placeholder={t('gymCoachName') || 'e.g. Marcus Vance'}
              required
              autoFocus
            />
          </div>

          {/* Specialty & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymSpecialty') || 'Specialty / Focus'}</label>
              <input
                className={inputCls}
                value={form.specialty}
                onChange={setField('specialty')}
                placeholder="e.g. Crossfit, Nutrition, HIIT"
              />
            </div>
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
          </div>

          {/* Email & National ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymEmail') || 'Email'}</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className={`${inputCls} pl-9`}
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  placeholder="coach@gym.com"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('gymNationalId') || 'National ID / SSN'}</label>
              <input
                className={inputCls}
                value={form.nationalId}
                onChange={setField('nationalId')}
                placeholder="ID Number"
              />
            </div>
          </div>

          {/* Salary & Structure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymSalary') || 'Compensation Amount'}</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className={`${inputCls} pl-9 tabular-nums`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={setField('salary')}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('gymSalaryType') || 'Pay Structure'}</label>
              <select
                className={inputCls}
                value={form.salaryType}
                onChange={setField('salaryType')}
              >
                {SALARY_TYPES.map(st => (
                  <option key={st.value} value={st.value}>
                    {t(st.labelKey) || st.fallbackLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hire Date & Active Checkbox */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className={labelCls}>{t('gymHireDate') || 'Hire Date'}</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className={`${inputCls} pl-9`}
                  type="date"
                  value={form.hireDate}
                  onChange={setField('hireDate')}
                />
              </div>
            </div>

            <div className="pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t('gymActive') || 'Active Staff Member'}
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>{t('gymNotes') || 'Certifications & Internal Notes'}</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={setField('notes')}
              placeholder="Certifications, shift preferences, CPR validity, etc."
            />
          </div>

          {/* Actions */}
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
              <span>{initial ? t('gymSave') || 'Save Changes' : t('gymAddCoach') || 'Enroll Coach'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}