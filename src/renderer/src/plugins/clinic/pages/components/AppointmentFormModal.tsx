import { useState, useRef } from 'react'
import { X, Calendar, Loader2, Search } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  existing?: any | null
  defaultDate?: string | null
  defaultPatientId?: string | null
  defaultPatientName?: string | null
  onClose: () => void
  onSaved: () => void
}


function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
}

function initDateTime(existing: any, defaultDate?: string | null): string {
  if (existing?.appointmentDate) return toDatetimeLocal(existing.appointmentDate)
  if (defaultDate) return `${defaultDate}T09:00`
  // default to next hour
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
  return toDatetimeLocal(d.toISOString())
}

export default function AppointmentFormModal({
  existing, defaultDate, defaultPatientId, defaultPatientName, onClose, onSaved
}: Props) {
  const { showToast } = useToast()
  const { t } = useLanguage()

  // Type + status options use translated labels
  const TYPES = [
    { value: 'consultation', label: t('apptTypeConsultation') },
    { value: 'follow_up',    label: t('apptTypeFollowUp') },
    { value: 'procedure',    label: t('apptTypeProcedure') },
    { value: 'checkup',      label: t('apptTypeCheckup') },
  ]
  const STATUSES = [
    { value: 'scheduled',  label: t('apptStatusScheduled') },
    { value: 'confirmed',  label: t('apptStatusConfirmed') },
    { value: 'completed',  label: t('apptStatusCompleted') },
    { value: 'cancelled',  label: t('cancelled') },
    { value: 'no_show',    label: t('apptStatusNoShow') },
  ]
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    patientId:       existing?.patientId       ?? defaultPatientId ?? '',
    appointmentDate: initDateTime(existing, defaultDate),
    duration:        String(existing?.duration ?? 30),
    type:            existing?.type            ?? 'consultation',
    doctorName:      existing?.doctorName      ?? '',
    notes:           existing?.notes           ?? '',
    status:          existing?.status          ?? 'scheduled',
  })

  const [searchQuery,   setSearchQuery]   = useState(existing?.patient?.name ?? defaultPatientName ?? '')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching,     setSearching]     = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try { setSearchResults((await window.api.clinic.patients.searchLite(q)) ?? []) }
    finally { setSearching(false) }
  }

  const handleSearchChange = (v: string) => {
    setSearchQuery(v)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => runSearch(v), 250)
  }

  const selectPatient = (p: any) => {
    setForm(f => ({ ...f, patientId: p.id }))
    setSearchQuery(p.name)
    setSearchResults([])
  }

  const handleSave = async () => {
    if (!form.patientId)       { showToast('error', t('pleaseSelectPatient')); return }
    if (!form.appointmentDate) { showToast('error', t('pleaseSetDateTime')); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        duration:   Number(form.duration) || 30,
        doctorName: form.doctorName.trim() || null,
        notes:      form.notes.trim()      || null,
      }
      if (existing?.id) {
        await window.api.clinic.appointments.update(existing.id, payload)
        showToast('success', t('appointmentUpdated'))
      } else {
        await window.api.clinic.appointments.create(payload)
        showToast('success', t('appointmentBooked'))
      }
      onSaved()
    } catch { showToast('error', t('failedSaveAppointment')) }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {existing?.id ? t('editAppointment') : t('bookAppointment')}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Patient search */}
          {field('Patient *',
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder={t('searchPatient')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={!!defaultPatientId}
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>}
              {searchResults.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-44 overflow-y-auto">
                  {searchResults.map((p) => (
                    <li
                      key={p.id}
                      onMouseDown={() => selectPatient(p)}
                      className="px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer"
                    >
                      <div className="font-medium text-sm text-slate-800 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.phone}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Date / Duration */}
          <div className="grid grid-cols-2 gap-4">
            {field(t('dateTimeLabel') + ' *',
              <input type="datetime-local" className={inputCls}
                value={form.appointmentDate}
                onChange={(e) => setForm(f => ({ ...f, appointmentDate: e.target.value }))} />
            )}
            {field(t('durationMinLabel'),
              <input type="number" className={inputCls} min="5" step="5"
                value={form.duration}
                onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} />
            )}
          </div>

          {/* Type / Status */}
          <div className="grid grid-cols-2 gap-4">
            {field(t('apptTypeLabel'),
              <select className={inputCls} value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
              </select>
            )}
            {field(t('apptStatusLabel'),
              <select className={inputCls} value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
          </div>

          {field(t('doctorName'),
            <input type="text" className={inputCls} placeholder={t('optionalField')}
              value={form.doctorName}
              onChange={(e) => setForm(f => ({ ...f, doctorName: e.target.value }))} />
          )}

          {field(t('notes'),
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder={t('optionalNotes')}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          )}
        </div>

        <div className="flex items-center gap-3 px-6 pb-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t('cancel')}
          </button>
          <button onClick={handleSave}
            disabled={saving || !form.patientId || !form.appointmentDate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {existing?.id ? t('editAppointment') : t('bookAppointment')}
          </button>
        </div>
      </div>
    </div>
  )
}
