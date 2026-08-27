import { useState, useEffect } from 'react'
import { X, Loader2, User, Phone, Mail, Stethoscope, Briefcase } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DateField from '@renderer/components/DateField'
import { VetStaff, VetStaffFormData } from '../types'
import { EMP_TYPES } from '../constants'

interface Props {
  staff?: VetStaff | null
  onSave: (staff: VetStaff) => void
  onClose: () => void
}

const inputCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

const selectCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

export function VetStaffFormModal({ staff, onSave, onClose }: Props) {
  const isEdit = Boolean(staff)
  const { t, language } = useLanguage()
  const isAr = language === 'ar'

  const [form, setForm] = useState<VetStaffFormData>({
    name: '',
    phone: '',
    email: '',
    employmentType: 'full_time',
    status: 'active',
    baseSalary: '',
    salaryType: 'monthly',
    hourlyRate: '',
    hireDate: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name,
        phone: staff.phone,
        email: staff.email ?? '',
        employmentType: staff.employmentType || 'full_time',
        status: staff.status || 'active',
        baseSalary: staff.baseSalary ? String(staff.baseSalary) : '',
        salaryType: staff.salaryType || 'monthly',
        hourlyRate: staff.hourlyRate ? String(staff.hourlyRate) : '',
        hireDate: staff.hireDate ? staff.hireDate.slice(0, 10) : ''
      })
    }
  }, [staff])

  const setField = (k: keyof VetStaffFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(isAr ? 'اسم الطبيب مطلوب' : 'Doctor name is required')
      return
    }
    if (!form.phone.trim()) {
      setError(isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      // Convert YYYY-MM-DD into a full ISO-8601 string for Prisma DateTime field
      let isoHireDate: string | undefined = undefined
      if (form.hireDate && form.hireDate.trim()) {
        const parsed = new Date(form.hireDate)
        if (!isNaN(parsed.getTime())) {
          isoHireDate = parsed.toISOString()
        }
      }

      const payload = {
        name: form.name.trim(),
        role: 'veterinarian',
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        employmentType: form.employmentType,
        status: form.status,
        baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : 0,
        salaryType: form.salaryType,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        hireDate: isoHireDate
      }

      let result: VetStaff
      if (isEdit && staff) {
        result = (await window.api.vet?.staff.update(staff.id, payload)) as VetStaff
      } else {
        result = (await window.api.vet?.staff.create(payload)) as VetStaff
      }
      onSave(result)
    } catch (err: any) {
      setError(err.message ?? (isAr ? 'فشل حفظ البيانات' : 'Failed to save veterinarian'))
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEdit
                  ? isAr
                    ? 'تعديل بيانات الطبيب البيطري'
                    : 'Edit Veterinarian'
                  : isAr
                  ? 'إضافة طبيب بيطري جديد'
                  : 'Add New Veterinarian'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'إدارة السجل الوظيفي والسريري للأطباء' : 'Clinical veterinarian team registry'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Doctor Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'اسم الطبيب بالكامل' : 'Full Name'} *
              </label>
              <div className="relative">
                <User className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={form.name}
                  onChange={setField('name')}
                  placeholder={isAr ? 'مثال: د. أحمد خالد' : 'e.g. Dr. Sara Ali'}
                  required
                  className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9`}
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'رقم الهاتف' : 'Phone'} *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={form.phone}
                    onChange={setField('phone')}
                    placeholder={isAr ? 'مثال: 0501234567' : 'e.g. 0501234567'}
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
                    onChange={setField('email')}
                    placeholder="doctor@clinic.com"
                    dir="ltr"
                    className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9 text-start`}
                  />
                </div>
              </div>
            </div>

            {/* Employment Type & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'نوع العمل' : 'Employment Type'}
                </label>
                <select value={form.employmentType} onChange={setField('employmentType')} className={selectCls}>
                  {EMP_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>
                      {isAr ? et.ar : et.fallback}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'الحالة' : 'Status'}
                </label>
                <select value={form.status} onChange={setField('status')} className={selectCls}>
                  <option value="active">{isAr ? 'نشط' : 'Active'}</option>
                  <option value="inactive">{isAr ? 'غير نشط' : 'Inactive'}</option>
                </select>
              </div>
            </div>

            {/* Salary Type & Base Compensation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'نوع الراتب' : 'Salary Type'}
                </label>
                <select value={form.salaryType} onChange={setField('salaryType')} className={selectCls}>
                  <option value="monthly">{isAr ? 'شهري' : 'Monthly'}</option>
                  <option value="hourly">{isAr ? 'بالساعة' : 'Hourly'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'الراتب الأساسي' : 'Base Salary'}
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.baseSalary}
                    onChange={setField('baseSalary')}
                    placeholder="0.00"
                    className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9`}
                  />
                </div>
              </div>
            </div>

            {/* Hourly rate (shown when salaryType is hourly) */}
            {form.salaryType === 'hourly' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'الأجر لكل ساعة' : 'Hourly Rate'}
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.hourlyRate}
                    onChange={setField('hourlyRate')}
                    placeholder="0.00"
                    className={`${inputCls} pl-9 rtl:pl-3.5 rtl:pr-9`}
                  />
                </div>
              </div>
            )}

            {/* Hire Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'تاريخ التعيين' : 'Hire Date'}
              </label>
              <DateField
                value={form.hireDate}
                onChange={(v) => setField('hireDate')({ target: { value: v } } as any)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Modal Footer */}
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
                <span>
                  {isEdit
                    ? isAr
                      ? 'حفظ التعديلات'
                      : 'Save Changes'
                    : isAr
                    ? 'إضافة الطبيب'
                    : 'Add Veterinarian'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}