import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Loader2, Stethoscope, Star, Pencil, Trash2, Phone, DoorOpen,
  Users, CalendarClock, UserCog
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import DoctorFormModal from './DoctorFormModal'
import DoctorProfileModal from './DoctorProfileModal'
import {
  STATUS_META, type LiveStatus, colorForDoctor, displayName, initials,
  isSingleDoctorMode, setSingleDoctorMode
} from './doctors.shared'

export default function DoctorsTab() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [singleMode, setSingle] = useState(isSingleDoctorMode())

  const load = useCallback(() => {
    setLoading(true)
    window.api.clinic.doctors.list()
      .then((rows: any[]) => setDoctors(rows ?? []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSetDefault(id: string) {
    try {
      await window.api.clinic.doctors.setDefault(id)
      showToast('success', t('defaultDoctorSet') || 'Default doctor updated')
      load()
    } catch { showToast('error', t('errorSavingRecord')) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await window.api.clinic.staff.delete(deleteTarget.id)
      showToast('success', t('deletedSuccessfully') || 'Deleted')
      setDeleteTarget(null)
      load()
    } catch { showToast('error', t('errorDeletingRecord') || 'Error deleting') }
  }

  function toggleSingle() {
    const next = !singleMode
    setSingle(next)
    setSingleDoctorMode(next)
    showToast('success', next
      ? (t('singleDoctorModeOn') || 'Single-doctor mode on — doctor is auto-selected')
      : (t('singleDoctorModeOff') || 'Single-doctor mode off'))
  }

  const fmtNext = (iso: string) => new Date(iso).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('clinicDoctors') || 'Doctors'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('doctorsSubtitle') || 'Manage your clinic team, availability and default doctor'}</p>
        </div>

        {/* Single-doctor toggle */}
        <button
          onClick={toggleSingle}
          title={t('singleDoctorModeHint') || 'When on, the doctor field is auto-filled with the default doctor and hidden in forms'}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            singleMode
              ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-teal-300 hover:text-teal-600'
          }`}
        >
          <UserCog className="h-3.5 w-3.5" />
          {t('singleDoctorMode') || 'Single-doctor clinic'}
          <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${singleMode ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${singleMode ? 'translate-x-3' : ''}`} />
          </span>
        </button>

        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-strong)] transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('addDoctor') || 'Add Doctor'}
        </button>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
        {(['available', 'busy', 'off', 'on_leave', 'inactive'] as LiveStatus[]).map(s => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
            {t(`doctorStatus_${s}`) || STATUS_META[s].label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <Stethoscope className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{t('noDoctorsYet') || 'No doctors yet'}</p>
          <p className="text-xs text-slate-400">{t('noDoctorsHint') || 'Add your first doctor to link sessions and appointments.'}</p>
          <button onClick={() => { setEditing(null); setFormOpen(true) }} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-strong)]">
            <Plus className="h-4 w-4" /> {t('addDoctor') || 'Add Doctor'}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map(d => {
            const meta = STATUS_META[(d.liveStatus as LiveStatus) ?? 'available']
            return (
              <div key={d.id} className={`rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 ring-1 ${meta.ring}/30`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setProfileId(d.id)}
                    className="relative h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0"
                    style={{ backgroundColor: colorForDoctor(d) }}
                  >
                    {initials(d.name)}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 ${meta.dot}`} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => setProfileId(d.id)} className="text-left">
                      <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        {displayName(d)}
                        {d.isDefault && <Star className="h-3.5 w-3.5 text-amber-500 fill-current shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{d.specialty || (t('generalPractitioner') || 'General practitioner')}</div>
                    </button>
                    <div className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      {t(`doctorStatus_${d.liveStatus}`) || meta.label}
                      {d.currentPatient && <span className="text-slate-400">· {d.currentPatient}</span>}
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 py-1.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{d.todayCount}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5"><CalendarClock className="h-3 w-3" />{t('today') || 'Today'}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 py-1.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{d.panelSize}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5"><Users className="h-3 w-3" />{t('panelSize') || 'Panel'}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 py-1.5">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate px-1">{d.nextAppointment ? fmtNext(d.nextAppointment.date) : '—'}</div>
                    <div className="text-[10px] text-slate-400">{t('next') || 'Next'}</div>
                  </div>
                </div>

                {/* Contact */}
                {(d.phone || d.roomNumber) && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    {d.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span>}
                    {d.roomNumber && <span className="inline-flex items-center gap-1"><DoorOpen className="h-3 w-3" />{d.roomNumber}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-700 pt-2.5">
                  {!d.isDefault && (
                    <button onClick={() => handleSetDefault(d.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <Star className="h-3.5 w-3.5" /> {t('setDefault') || 'Set default'}
                    </button>
                  )}
                  <button onClick={() => { setEditing(d); setFormOpen(true) }} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors" title={t('edit') || 'Edit'}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('delete') || 'Delete'}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formOpen && (
        <DoctorFormModal
          existing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load() }}
        />
      )}
      {profileId && <DoctorProfileModal doctorId={profileId} onClose={() => setProfileId(null)} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('deleteDoctor') || 'Delete doctor'}?</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('deleteDoctorMsg') || 'Their sessions and appointments will keep their history but become unassigned.'}
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cancel') || 'Cancel'}</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">{t('delete') || 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
