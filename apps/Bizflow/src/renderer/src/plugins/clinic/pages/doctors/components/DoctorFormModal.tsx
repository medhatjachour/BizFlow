import React from 'react'
import { X, Loader2, Stethoscope } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDoctorForm } from '../hooks/useDoctorForm'
import { AVATAR_SWATCHES, DAY_KEYS, DAY_LABELS } from '../constants'
import type { Doctor } from '../types'

interface Props {
  existing?: Doctor | null
  onClose: () => void
  onSaved: () => void
}

export const DoctorFormModal: React.FC<Props> = ({ existing, onClose, onSaved }) => {
  const { t } = useLanguage()
  const { form, workingHours, saving, setField, setWorkingHours, save } = useDoctorForm(existing, onSaved)

  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs overflow-y-auto py-8 px-4 animate-in fade-in-50 duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            {existing ? (t('editDoctor') || 'Edit Doctor') : (t('addDoctor') || 'Add Doctor')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={save} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title & Name */}
          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <label className={labelCls}>{t('title') || 'Title'}</label>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Dr."
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{t('doctorName') || 'Name'} *</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Doctor Full Name"
                autoFocus
              />
            </div>
          </div>

          {/* Specialty & License */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>{t('specialty') || 'Specialty'}</label>
              <input
                className={inputCls}
                value={form.specialty}
                onChange={(e) => setField('specialty', e.target.value)}
                placeholder="e.g. Cardiologist, Dentist"
              />
            </div>
            <div>
              <label className={labelCls}>{t('licenseNo') || 'License No.'}</label>
              <input
                className={inputCls}
                value={form.licenseNo}
                onChange={(e) => setField('licenseNo', e.target.value)}
                placeholder="Medical License #"
              />
            </div>
          </div>

          {/* Phone, Email, Room */}
          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <label className={labelCls}>{t('phone') || 'Phone'}</label>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+1..."
              />
            </div>
            <div>
              <label className={labelCls}>{t('email') || 'Email'}</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="doctor@clinic.com"
              />
            </div>
            <div>
              <label className={labelCls}>{t('roomNumber') || 'Room'}</label>
              <input
                className={inputCls}
                value={form.roomNumber}
                onChange={(e) => setField('roomNumber', e.target.value)}
                placeholder="e.g. 102"
              />
            </div>
          </div>

          {/* Fees, Commission & Status */}
          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <label className={labelCls}>{t('consultationFee') || 'Consultation fee'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.consultationFee}
                onChange={(e) => setField('consultationFee', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>{t('commissionPct') || 'Commission %'}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={inputCls}
                value={form.commissionPct}
                onChange={(e) => setField('commissionPct', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelCls}>{t('status') || 'Status'}</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => setField('status', e.target.value as any)}
              >
                <option value="active">{t('active') || 'Active'}</option>
                <option value="on_leave">{t('onLeave') || 'On leave'}</option>
                <option value="inactive">{t('inactive') || 'Inactive'}</option>
              </select>
            </div>
          </div>

          {/* Avatar Color Swatches */}
          <div>
            <label className={labelCls}>{t('color') || 'Doctor Badge Color'}</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setField('avatarColor', c)}
                  className={`h-7 w-7 rounded-xl border-2 transition-transform ${
                    form.avatarColor === c
                      ? 'scale-115 border-slate-900 dark:border-white shadow-xs'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Working Hours Weekly Schedule */}
          <div>
            <label className={labelCls}>{t('workingHours') || 'Working Hours'}</label>
            <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/30">
              {DAY_KEYS.map((day) => {
                const d = workingHours[day] ?? {}
                return (
                  <div key={day} className="flex items-center gap-3 text-xs">
                    <span className="w-10 font-bold text-slate-600 dark:text-slate-300">{DAY_LABELS[day]}</span>
                    <label className="flex items-center gap-1.5 text-slate-500 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!d.off}
                        onChange={(e) =>
                          setWorkingHours((w) => ({
                            ...w,
                            [day]: { ...w[day], off: !e.target.checked }
                          }))
                        }
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t('open') || 'Open'}</span>
                    </label>
                    <input
                      type="time"
                      disabled={d.off}
                      className={`${inputCls} w-28 py-1 disabled:opacity-30`}
                      value={d.start ?? '09:00'}
                      onChange={(e) =>
                        setWorkingHours((w) => ({
                          ...w,
                          [day]: { ...w[day], start: e.target.value }
                        }))
                      }
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="time"
                      disabled={d.off}
                      className={`${inputCls} w-28 py-1 disabled:opacity-30`}
                      value={d.end ?? '17:00'}
                      onChange={(e) =>
                        setWorkingHours((w) => ({
                          ...w,
                          [day]: { ...w[day], end: e.target.value }
                        }))
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className={labelCls}>{t('bio') || 'Biography / Profile'}</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder={t('optional') || 'Doctor professional background...'}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {existing ? (t('save') || 'Save Changes') : (t('addDoctor') || 'Add Doctor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}