import { useState, useEffect } from 'react'
import { X, Loader2, UserCheck } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: (coach: any) => void
  initial?: any | null
}

interface Form {
  name: string; specialty: string; phone: string; email: string; nationalId: string
  salary: string; salaryType: string; hireDate: string; isActive: boolean; notes: string
}
const defaultForm = (): Form => ({
  name: '', specialty: '', phone: '', email: '', nationalId: '',
  salary: '', salaryType: 'monthly', hireDate: '', isActive: true, notes: ''
})

export default function CoachFormModal({ isOpen, onClose, onSaved, initial }: Props) {
  const toast = useToast()
  const { t } = useLanguage()
  const [form, setForm] = useState<Form>(defaultForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        name: initial.name ?? '', specialty: initial.specialty ?? '', phone: initial.phone ?? '',
        email: initial.email ?? '', nationalId: initial.nationalId ?? '',
        salary: initial.salary != null ? String(initial.salary) : '',
        salaryType: initial.salaryType ?? 'monthly',
        hireDate: initial.hireDate ? new Date(initial.hireDate).toISOString().slice(0,10) : '',
        isActive: initial.isActive ?? true, notes: initial.notes ?? ''
      })
    } else {
      setForm(defaultForm())
    }
  }, [isOpen, initial])

  if (!isOpen) return null

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
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
      let result: any
      if (initial) {
        result = await (window.api as any).gym?.coaches?.update(initial.id, payload)
        toast.success('Coach updated')
      } else {
        result = await (window.api as any).gym?.coaches?.create(payload)
        toast.success('Coach added')
      }
      onSaved(result)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{initial ? t('gymEditCoach') : t('gymNewCoach')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>{t('gymFullName')} *</label>
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder={t('gymCoachName')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymSpecialty')}</label>
              <input className={inputCls} value={form.specialty} onChange={set('specialty')} placeholder="e.g. Weightlifting, Cardio" />
            </div>
            <div>
              <label className={labelCls}>{t('gymPhone')}</label>
              <input className={inputCls} type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('gymEmail')}</label>
            <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="coach@gym.com" />
          </div>
          <div>
            <label className={labelCls}>{t('gymNationalId')}</label>
            <input className={inputCls} value={form.nationalId} onChange={set('nationalId')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymSalary')}</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={form.salary} onChange={set('salary')} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>{t('gymSalaryType')}</label>
              <select className={inputCls} value={form.salaryType} onChange={set('salaryType')}>
                <option value="monthly">{t('gymSalaryMonthly')}</option>
                <option value="hourly">{t('gymSalaryHourly')}</option>
                <option value="per_session">{t('gymSalaryPerSession')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('gymHireDate')}</label>
            <input className={inputCls} type="date" value={form.hireDate} onChange={set('hireDate')} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActiveCoach" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <label htmlFor="isActiveCoach" className="text-sm text-slate-700 dark:text-slate-300">{t('gymActive')}</label>
          </div>
          <div>
            <label className={labelCls}>{t('gymNotes')}</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} placeholder="Certifications, schedule notes, etc." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('gymCancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : initial ? t('gymSave') : t('gymAddCoach')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
