import { useState } from 'react'
import { Plus, Loader2, Stethoscope, UserCog } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import { useDoctors } from './hooks/useDoctors'
import { DoctorStatusLegend } from './components/DoctorStatusLegend'
import { DoctorCard } from './components/DoctorCard'
import { DeleteDoctorModal } from './components/DeleteDoctorModal'
import { DoctorProfileModal } from './components/DoctorProfileModal'
import { DoctorFormModal } from './components/DoctorFormModal'
import type { Doctor } from './types'

export default function DoctorsTab() {
  const { t } = useLanguage()

  const [formOpen, setFormOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null)

  const {
    doctors,
    loading,
    singleMode,
    reload,
    setDefaultDoctor,
    deleteDoctor,
    toggleSingleMode
  } = useDoctors()

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            {t('clinicDoctors') || 'Doctors & Specialists'}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {t('doctorsSubtitle') || 'Manage medical staff, availability schedules, and default practitioner'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap ms-auto">
          {/* Single-Doctor Mode Switch */}
          <button
            onClick={toggleSingleMode}
            title={
              t('singleDoctorModeHint') ||
              'When enabled, the default doctor is automatically assigned in session & appointment forms'
            }
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all ${
              singleMode
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <UserCog className="h-4 w-4" />
            <span>{t('singleDoctorMode') || 'Single-doctor clinic'}</span>
            <span
              className={`relative inline-block h-4 w-7 rounded-full transition-colors ${
                singleMode ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 start-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  singleMode ? 'translate-x-3 rtl:-translate-x-3' : ''
                }`}
              />
            </span>
          </button>

          {/* Add Doctor Button */}
          <button
            onClick={() => {
              setEditingDoctor(null)
              setFormOpen(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all shadow-sm shadow-teal-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addDoctor') || 'Add Doctor'}</span>
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <DoctorStatusLegend />

      {/* Main Doctor Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center p-6 bg-white/50 dark:bg-slate-800/30">
          <Stethoscope className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {t('noDoctorsYet') || 'No doctors registered yet'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {t('noDoctorsHint') || 'Add doctors to assign clinical sessions, manage calendars, and track revenue.'}
          </p>
          <button
            onClick={() => {
              setEditingDoctor(null)
              setFormOpen(true)
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm"
          >
            <Plus className="h-4 w-4" /> {t('addDoctor') || 'Add Doctor'}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => (
            <DoctorCard
              key={d.id}
              doctor={d}
              onViewProfile={(id) => setProfileId(id)}
              onEdit={(doc) => {
                setEditingDoctor(doc)
                setFormOpen(true)
              }}
              onDelete={(doc) => setDeleteTarget(doc)}
              onSetDefault={setDefaultDoctor}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {formOpen && (
        <DoctorFormModal
          existing={editingDoctor}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            reload()
          }}
        />
      )}

      {/* Doctor Detailed Analytics Modal */}
      {profileId && (
        <DoctorProfileModal
          doctorId={profileId}
          onClose={() => setProfileId(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteDoctorModal
          doctor={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteDoctor(deleteTarget.id)
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}