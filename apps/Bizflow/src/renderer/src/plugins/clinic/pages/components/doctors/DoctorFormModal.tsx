import { useState } from 'react'
import { X, Loader2, Stethoscope } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  AVATAR_SWATCHES, DAY_KEYS, DAY_LABELS, defaultWorkingHours, parseWorkingHours,
  colorForDoctor, type WorkingHours
} from './doctors.shared'

interface Props {
  existing?: any | null
  onClose: () => void
  onSaved: () => void
}

export default function DoctorFormModal({ existing, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name:            existing?.name            ?? '',
    title:           existing?.title           ?? 'Dr.',
    specialty:       existing?.specialty       ?? '',
    phone:           existing?.phone           ?? '',
    email:           existing?.email           ?? '',
    licenseNo:       existing?.licenseNo       ?? '',
    roomNumber:      existing?.roomNumber      ?? '',
    consultationFee: String(existing?.consultationFee ?? ''),
    commissionPct:   String(existing?.commissionPct ?? ''),
    status:          existing?.status          ?? 'active',
    avatarColor:     existing?.avatarColor     ?? colorForDoctor({ name: existing?.name ?? 'x', avatarColor: existing?.avatarColor }),
    bio:             existing?.bio             ?? '',
  })
  const [wh, setWh] = useState<WorkingHours>(
    () => parseWorkingHours(existing?.workingHours) ?? defaultWorkingHours()
  )

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { showToast('error', t('doctorNameRequired') || 'Doctor name is required'); return }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        role: 'doctor',
        title: form.title.trim() || null,
        specialty: form.specialty.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        licenseNo: form.licenseNo.trim() || null,
        roomNumber: form.roomNumber.trim() || null,
        consultationFee: form.consultationFee !== '' ? parseFloat(form.consultationFee) : null,
        commissionPct: form.commissionPct !== '' ? parseFloat(form.commissionPct) : null,
        status: form.status,
        avatarColor: form.avatarColor || null,
        bio: form.bio.trim() || null,
        workingHours: JSON.stringify(wh),
      }
      if (existing?.id) {
        await window.api.clinic.staff.update(existing.id, payload)
        showToast('success', t('savedSuccessfully'))
      } else {
        await window.api.clinic.staff.create(payload)
        showToast('success', t('createdSuccessfully'))
      }
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]'
  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-500" />
            {existing ? (t('editDoctor') || 'Edit Doctor') : (t('addDoctor') || 'Add Doctor')}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('title') || 'Title'}</label>
              <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Dr." />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{t('doctorName') || 'Name'} *</label>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('specialty') || 'Specialty'}</label>
              <input className={inputCls} value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder={t('optional')} />
            </div>
            <div>
              <label className={labelCls}>{t('licenseNo') || 'License No.'}</label>
              <input className={inputCls} value={form.licenseNo} onChange={e => set('licenseNo', e.target.value)} placeholder={t('optional')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('phone') || 'Phone'}</label>
              <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('email') || 'Email'}</label>
              <input className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('roomNumber') || 'Room'}</label>
              <input className={inputCls} value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('consultationFee') || 'Consultation fee'}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.consultationFee} onChange={e => set('consultationFee', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>{t('commissionPct') || 'Commission %'}</label>
              <input type="number" min="0" max="100" step="0.1" className={inputCls} value={form.commissionPct} onChange={e => set('commissionPct', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{t('status') || 'Status'}</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">{t('active') || 'Active'}</option>
                <option value="on_leave">{t('onLeave') || 'On leave'}</option>
                <option value="inactive">{t('inactive') || 'Inactive'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('color') || 'Color'}</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_SWATCHES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('avatarColor', c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${form.avatarColor === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Working hours */}
          <div>
            <label className={labelCls}>{t('workingHours') || 'Working hours'}</label>
            <div className="space-y-1.5 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              {DAY_KEYS.map(day => {
                const d = wh[day] ?? {}
                return (
                  <div key={day} className="flex items-center gap-2 text-sm">
                    <span className="w-10 text-slate-500 dark:text-slate-400">{DAY_LABELS[day]}</span>
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={!d.off}
                        onChange={e => setWh(w => ({ ...w, [day]: { ...w[day], off: !e.target.checked } }))}
                      />
                      {t('open') || 'Open'}
                    </label>
                    <input
                      type="time"
                      disabled={d.off}
                      className={`${inputCls} w-28 py-1 disabled:opacity-40`}
                      value={d.start ?? '09:00'}
                      onChange={e => setWh(w => ({ ...w, [day]: { ...w[day], start: e.target.value } }))}
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="time"
                      disabled={d.off}
                      className={`${inputCls} w-28 py-1 disabled:opacity-40`}
                      value={d.end ?? '17:00'}
                      onChange={e => setWh(w => ({ ...w, [day]: { ...w[day], end: e.target.value } }))}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('bio') || 'Bio'}</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder={t('optional')} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {t('cancel') || 'Cancel'}
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-strong)] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {existing ? (t('save') || 'Save') : (t('addDoctor') || 'Add Doctor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
