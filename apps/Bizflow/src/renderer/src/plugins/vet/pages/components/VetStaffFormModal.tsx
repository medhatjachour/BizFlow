import { useState, useEffect } from 'react'
import { X, Loader2, User, Phone, Mail, Stethoscope, Briefcase } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DateField from '@renderer/components/DateField'

export interface VetStaff {
  id:             string
  name:           string
  role:           string
  phone:          string
  email?:         string | null
  employmentType: string
  status:         string
  baseSalary:     number
  salaryType:     string
  hourlyRate?:    number | null
  hireDate?:      string | null
}

interface Props {
  staff?:  VetStaff | null
  onSave:  (staff: VetStaff) => void
  onClose: () => void
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors'

const selectCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors'

const EMP_TYPES = [
  { value: 'full_time', labelKey: 'vetEmpFullTime',  label: 'Full-time' },
  { value: 'part_time', labelKey: 'vetEmpPartTime',  label: 'Part-time' },
  { value: 'contract',  labelKey: 'vetEmpContract',  label: 'Contract' },
]

export default function VetStaffFormModal({ staff, onSave, onClose }: Props) {
  const isEdit = !!staff
  const { t } = useLanguage()

  const [form, setForm] = useState({
    name:           '',
    phone:          '',
    email:          '',
    employmentType: 'full_time',
    status:         'active',
    baseSalary:     '',
    salaryType:     'monthly',
    hourlyRate:     '',
    hireDate:       '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (staff) {
      setForm({
        name:           staff.name,
        phone:          staff.phone,
        email:          staff.email          ?? '',
        employmentType: staff.employmentType,
        status:         staff.status,
        baseSalary:     staff.baseSalary ? String(staff.baseSalary) : '',
        salaryType:     staff.salaryType,
        hourlyRate:     staff.hourlyRate ? String(staff.hourlyRate) : '',
        hireDate:       staff.hireDate ? staff.hireDate.slice(0, 10) : '',
      })
    }
  }, [staff])

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())  { setError('Name is required');  return }
    if (!form.phone.trim()) { setError('Phone is required'); return }

    setSaving(true)
    setError('')
    try {
      const payload: any = {
        name:           form.name.trim(),
        role:           'veterinarian',
        phone:          form.phone.trim(),
        email:          form.email.trim()  || undefined,
        employmentType: form.employmentType,
        status:         form.status,
        baseSalary:     form.baseSalary ? parseFloat(form.baseSalary) : 0,
        salaryType:     form.salaryType,
        hourlyRate:     form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        hireDate:       form.hireDate || undefined,
      }

      let result: VetStaff
      if (isEdit) {
        result = await window.api.vet?.staff.update(staff!.id, payload) as VetStaff
      } else {
        result = await window.api.vet?.staff.create(payload) as VetStaff
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
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEdit ? 'Edit Veterinarian' : 'Add Veterinarian'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Only veterinarians should be managed here.</p>
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
            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Dr. Sara Ali"
                  required
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            {/* Employment type */}
            <div>
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-3 py-2 mb-3">
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" /> Veterinarian
                </p>
                <p className="text-[11px] text-violet-600/80 dark:text-violet-300/80 mt-0.5">
                  Non-veterinarian team members should be created from the Employees page.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('empEmploymentType')||'Employment Type'}
                </label>
                <select value={form.employmentType} onChange={set('employmentType')} className={selectCls}>
                  {EMP_TYPES.map(et => (
                    <option key={et.value} value={et.value}>{t(et.labelKey as any)||et.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('phone')||'Phone'} *
                </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="e.g. 0501234567"
                  required
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('vetEmailLabel')||'Email'}
                </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="e.g. dr.sara@clinic.com"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            {/* Salary type + base salary */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('vetSalaryType')||'Salary Type'}
                </label>
                <select value={form.salaryType} onChange={set('salaryType')} className={selectCls}>
                  <option value="monthly">{t('vetSalaryMonthly')||'Monthly'}</option>
                  <option value="hourly">{t('vetSalaryHourly')||'Hourly'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('vetBaseSalary')||'Base Salary'}
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.baseSalary}
                    onChange={set('baseSalary')}
                    placeholder="0.00"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
            </div>

            {/* Hourly rate (shown for hourly type) */}
            {form.salaryType === 'hourly' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('vetHourlyRate')||'Hourly Rate'}
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.hourlyRate}
                    onChange={set('hourlyRate')}
                    placeholder="0.00"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
            )}

            {/* Hire date + status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('hireDate')||'Hire Date'}
                </label>
                <DateField
                  value={form.hireDate}
                  onChange={v => set('hireDate')({ target: { value: v } } as any)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {t('vetStatusLabel')||'Status'}
                </label>
                <select value={form.status} onChange={set('status')} className={selectCls}>
                  <option value="active">{t('vetStatusActive')||'Active'}</option>
                  <option value="inactive">{t('vetStatusInactive')||'Inactive'}</option>
                </select>
              </div>
            </div>
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
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                isEdit ? (t('vetSaveChanges')||'Save Changes') : 'Add Veterinarian'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
