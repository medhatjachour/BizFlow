import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Loader2, ArrowDown, UserPlus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { usePatients } from './hooks/usePatients'
import { Patient } from './types'

import PatientStatsBar from './components/PatientStatsBar'
import PatientFiltersBar from './components/PatientFiltersBar'
import PatientCard from './components/PatientCard'
import PatientRow from './components/PatientRow'
import PatientFormModal from './components/PatientFormModal'
import AppointmentFormModal from '../components/appointments/AppointmentFormModal'
import SessionFormModal from '../components/sessions/SessionFormModal'

export default function PatientsTab() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const {
    patients,
    loading,
    loadingMore,
    hasMore,
    total,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    reload,
    loadMore,
    deletePatient,
    stats
  } = usePatients()

  // Modal dialog states
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [newSessionPatient, setNewSessionPatient] = useState<Patient | null>(null)
  const [bookApptPatient, setBookApptPatient] = useState<Patient | null>(null)

  return (
    <div className="space-y-4">
      {/* High-level Overview Metrics */}
      <PatientStatsBar stats={stats} />

      {/* Filter and View Bar */}
      <PatientFiltersBar
        filters={filters}
        onChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewPatient={() => setShowNewPatient(true)}
      />

      {/* Data presentation */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-xs text-slate-400">Loading patients records...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 text-center p-6 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
          <div className="h-16 w-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
            <Users className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white">No patients found</p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {filters.search || filters.gender || filters.bloodType
              ? 'No registered patients match your active search filters.'
              : 'Start by registering your first patient into the clinic system.'}
          </p>
          <button
            onClick={() => setShowNewPatient(true)}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-600/20 transition-all"
          >
            <UserPlus className="h-4 w-4" /> Register Patient
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {patients.map(p => (
              <PatientCard
                key={p.id}
                patient={p}
                onView={() => navigate(`/clinic/patients/${p.id}`)}
                onEdit={() => setEditPatient(p)}
                onDelete={() => deletePatient(p.id)}
                onNewSession={() => setNewSessionPatient(p)}
                onBookAppt={() => setBookApptPatient(p)}
              />
            ))}
          </div>

          {/* Load More Pagination */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin text-teal-600" /> : <ArrowDown className="h-4 w-4" />}
                Load more ({patients.length} of {total})
              </button>
            </div>
          )}

          {!hasMore && patients.length > 0 && (
            <p className="text-center text-xs text-slate-400 pt-2 font-medium">
              Showing all {total} {total === 1 ? 'patient' : 'patients'}
            </p>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Age / Blood</th>
                  <th className="py-3 px-3">Last Visit</th>
                  <th className="py-3 px-3">Financial</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <PatientRow
                    key={p.id}
                    patient={p}
                    onView={() => navigate(`/clinic/patients/${p.id}`)}
                    onEdit={() => setEditPatient(p)}
                    onDelete={() => deletePatient(p.id)}
                    onNewSession={() => setNewSessionPatient(p)}
                    onBookAppt={() => setBookApptPatient(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1.5"
              >
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Load more records ({patients.length} of {total})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Modals */}
      {(showNewPatient || editPatient) && (
        <PatientFormModal
          patient={editPatient}
          onClose={() => {
            setShowNewPatient(false)
            setEditPatient(null)
          }}
          onSaved={() => {
            setShowNewPatient(false)
            setEditPatient(null)
            reload()
          }}
        />
      )}

      {newSessionPatient && (
        <SessionFormModal
          defaultPatient={newSessionPatient}
          onClose={() => setNewSessionPatient(null)}
          onSaved={() => {
            setNewSessionPatient(null)
            reload()
          }}
        />
      )}

      {bookApptPatient && (
        <AppointmentFormModal
          defaultPatientId={bookApptPatient.id}
          defaultPatientName={bookApptPatient.name}
          onClose={() => setBookApptPatient(null)}
          onSaved={() => setBookApptPatient(null)}
        />
      )}
    </div>
  )
}