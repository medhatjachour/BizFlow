import { useState } from 'react'
import { X, Loader2, User, Phone, ShieldAlert, HeartPulse, FileText, Check } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { Patient, BloodType, Gender } from '../types'
import { calcNumericAge, dobFromAge } from '../utils'

interface Props {
  patient?: Patient | null
  onClose: () => void
  onSaved: () => void
}

export default function PatientFormModal({ patient, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'general' | 'medical'>('general')

  const initialAge = calcNumericAge(patient?.dateOfBirth)

  const [name, setName] = useState(patient?.name ?? '')
  const [age, setAge] = useState<string>(initialAge === '' ? '' : String(initialAge))
  const [gender, setGender] = useState<Gender | ''>(patient?.gender ?? '')
  const [phone, setPhone] = useState(patient?.phone ?? '')
  const [email, setEmail] = useState(patient?.email ?? '')
  const [nationalId, setNationalId] = useState(patient?.nationalId ?? '')
  const [folderNumber, setFolderNumber] = useState(patient?.folderNumber ?? '')
  const [bloodType, setBloodType] = useState<BloodType | ''>(patient?.bloodType ?? '')
  const [address, setAddress] = useState(patient?.address ?? '')
  const [allergies, setAllergies] = useState(patient?.allergies ?? '')
  const [medicalNotes, setMedicalNotes] = useState(patient?.medicalNotes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      showToast('error', 'Patient name is required')
      return
    }
    if (!phone.trim()) {
      showToast('error', 'Contact phone number is required')
      return
    }

    setSaving(true)
    try {
      const derivedDob = age.trim() ? dobFromAge(age.trim()) : (patient?.dateOfBirth || null)

      const payload = {
        name: name.trim(),
        dateOfBirth: derivedDob,
        gender: gender || null,
        phone: phone.trim(),
        email: email.trim() || null,
        nationalId: nationalId.trim() || null,
        folderNumber: folderNumber.trim() || null,
        bloodType: bloodType || null,
        address: address.trim() || null,
        allergies: allergies.trim() || null,
        medicalNotes: medicalNotes.trim() || null
      }

      if (patient?.id) {
        await window.api.clinic.patients.update(patient.id, payload)
        showToast('success', t('savedSuccessfully') || 'Patient updated successfully')
      } else {
        await window.api.clinic.patients.create(payload)
        showToast('success', t('createdSuccessfully') || 'Patient registered successfully')
      }
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Failed to save patient record')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-all'
  const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {patient ? 'Edit Patient File' : 'New Patient Registration'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {patient ? `Editing #${patient.folderNumber || patient.id.slice(0, 8)}` : 'Create permanent medical file'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6 text-sm font-semibold flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('general')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 ${
              activeSection === 'general'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="h-4 w-4" /> Personal & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('medical')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 ${
              activeSection === 'medical'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <HeartPulse className="h-4 w-4" /> Medical History & Notes
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
          {activeSection === 'general' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>Full Name *</label>
                  <input
                    className={inputCls}
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelCls}>Age (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="130"
                    className={inputCls}
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 34"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      className={`${inputCls} pl-10`}
                      required
                      placeholder="e.g. +1 555-0199"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input
                    type="email"
                    className={inputCls}
                    placeholder="patient@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Gender</label>
                  <select className={inputCls} value={gender} onChange={e => setGender(e.target.value as Gender)}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>National ID / SSN</label>
                  <input
                    className={inputCls}
                    placeholder="ID card number"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Folder / File #</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 2026-042"
                    value={folderNumber}
                    onChange={e => setFolderNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Residential Address</label>
                <input
                  className={inputCls}
                  placeholder="Street, City, Postal code"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Blood Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as BloodType[]).map(bt => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setBloodType(bloodType === bt ? '' : bt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        bloodType === bt
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`${labelCls} text-amber-600 dark:text-amber-400 flex items-center gap-1.5`}>
                  <ShieldAlert className="h-4 w-4" /> Allergies & Drug Reactions
                </label>
                <input
                  className="w-full rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Penicillin, Latex, Aspirin, Peanuts"
                  value={allergies}
                  onChange={e => setAllergies(e.target.value)}
                />
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <FileText className="h-4 w-4 text-slate-400" /> Chronic Conditions & Clinical Notes
                </label>
                <textarea
                  className={inputCls}
                  rows={4}
                  placeholder="Record diabetes, hypertension, previous surgeries, or long-term medication notes..."
                  value={medicalNotes}
                  onChange={e => setMedicalNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-600/20 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {patient ? 'Save Changes' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}