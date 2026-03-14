import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Patient } from '../index'

interface Props {
  patient?: Patient | null
  onClose: () => void
  onSaved: () => void
}

export default function PatientFormModal({ patient, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(patient?.name ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : '')
  const [gender, setGender] = useState(patient?.gender ?? '')
  const [phone, setPhone] = useState(patient?.phone ?? '')
  const [email, setEmail] = useState(patient?.email ?? '')
  const [nationalId, setNationalId] = useState(patient?.nationalId ?? '')
  const [bloodType, setBloodType] = useState(patient?.bloodType ?? '')
  const [address, setAddress] = useState(patient?.address ?? '')
  const [allergies, setAllergies] = useState(patient?.allergies ?? '')
  const [medicalNotes, setMedicalNotes] = useState(patient?.medicalNotes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      showToast('error', t('namePhoneRequired'))
      return
    }
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        gender: gender || null,
        phone: phone.trim(),
        email: email.trim() || null,
        nationalId: nationalId.trim() || null,
        bloodType: bloodType || null,
        address: address.trim() || null,
        allergies: allergies.trim() || null,
        medicalNotes: medicalNotes.trim() || null
      }

      if (patient) {
        await window.api.clinic.patients.update(patient.id, data)
        showToast('success', t('savedSuccessfully'))
      } else {
        await window.api.clinic.patients.create(data)
        showToast('success', t('createdSuccessfully'))
      }
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {patient ? t('editPatient') : t('newPatient')}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name + DOB */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('fullName')} *</label>
              <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('dateOfBirth')}</label>
              <input type="date" className={inputCls} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
          </div>

          {/* Gender + Blood Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('gender')}</label>
              <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">{t('select')}</option>
                <option value="male">{t('male')}</option>
                <option value="female">{t('female')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('bloodType')}</label>
              <select className={inputCls} value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                <option value="">{t('select')}</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('phone')} *</label>
              <input className={inputCls} required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('email')}</label>
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {/* National ID */}
          <div>
            <label className={labelCls}>{t('nationalId')}</label>
            <input className={inputCls} value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>{t('address')}</label>
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {/* Allergies */}
          <div>
            <label className={`${labelCls} text-amber-600 dark:text-amber-400`}>⚠️ {t('allergies')}</label>
            <input
              className="w-full rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder={t('listAllergies')}
            />
          </div>

          {/* Medical Notes */}
          <div>
            <label className={labelCls}>{t('medicalNotes')}</label>
            <textarea className={inputCls} rows={3} value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)} />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('savePatient')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
