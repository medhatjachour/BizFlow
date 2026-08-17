import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { usePatientProfile } from './hooks/usePatientProfile'
import { PatientBanner } from './components/PatientBanner'
import { PatientStatCards } from './components/PatientStatCards'
import { CheckResultsPanel } from './components/CheckResultsPanel'
import { DentalChartPanel } from './components/DentalChartPanel'
import { FinanceSummaryCard } from './components/FinanceSummaryCard'
import { MedicalHighlights } from './components/MedicalHighlights'
import { UpcomingScheduleGrid } from './components/UpcomingScheduleGrid'
import { PrescriptionsTable } from './components/PrescriptionsTable'
import { SessionTimelineSection } from './components/SessionTimelineSection'
import { PatientProfileModals } from './components/PatientProfileModals'

import type { Session, Appointment, CheckResult, Prescription } from './types'

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>()
  const isDentistMode = useMemo(() => localStorage.getItem('clinicDentistMode') === 'true', [])

  // Modals & Panels Local UI state
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [showNewSession, setShowNewSession] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [showUploadResult, setShowUploadResult] = useState(false)
  const [viewingResult, setViewingResult] = useState<CheckResult | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showResultsPanel, setShowResultsPanel] = useState(false)
  const [showDentalPanel, setShowDentalPanel] = useState(false)

  // Primary data hook
  const {
    patient,
    stats,
    checkResults,
    appointments,
    loading,
    exportingPdf,
    reload,
    deleteCheckResult,
    exportMedicalRecordPdf
  } = usePatientProfile(id)

  // Normalized session & prescription collections
  const sessions = useMemo(() => {
    if (!patient?.sessions) return []
    return patient.sessions.map((s) => ({
      ...s,
      patientId: s.patientId ?? patient.id,
      patient: s.patient ?? {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        bloodType: patient.bloodType,
        gender: patient.gender
      },
      visitType: s.visitType ?? 'routine',
      status: s.status ?? 'completed',
      paymentStatus: s.paymentStatus ?? 'unpaid',
      prescriptions: s.prescriptions ?? []
    }))
  }, [patient])

  const allPrescriptions: Prescription[] = useMemo(() => {
    return sessions.flatMap((s) =>
      (s.prescriptions ?? []).map((rx) => ({
        ...rx,
        sessionDate: s.visitDate,
        diagnosis: s.diagnosis
      }))
    )
  }, [sessions])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!patient) return null

  return (
    <div className="flex flex-col h-full overflow-auto bg-slate-50/50 dark:bg-slate-900/50">
      {/* Hero Banner Header */}
      <PatientBanner
        patient={patient}
        exportingPdf={exportingPdf}
        onBack={() => window.history.back()}
        onEditPatient={() => setShowEditPatient(true)}
        onUploadResult={() => setShowUploadResult(true)}
        onExportPdf={exportMedicalRecordPdf}
        onNewSession={() => setShowNewSession(true)}
      />

      {/* Main Container Layout */}
      <div className="flex-1 p-5 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Stat Metrics Grid */}
        {stats && (
          <PatientStatCards
            stats={stats}
            checkResults={checkResults}
            sessions={sessions}
            isDentistMode={isDentistMode}
            showResultsPanel={showResultsPanel}
            showDentalPanel={showDentalPanel}
            onToggleResults={() => setShowResultsPanel((v) => !v)}
            onToggleDental={() => setShowDentalPanel((v) => !v)}
            onOpenPayModal={() => setShowPayModal(true)}
          />
        )}

        {/* Collapsible Drawers */}
        {showResultsPanel && (
          <CheckResultsPanel
            results={checkResults}
            onUpload={() => setShowUploadResult(true)}
            onView={(res) => setViewingResult(res)}
            onDelete={deleteCheckResult}
          />
        )}

        {isDentistMode && showDentalPanel && <DentalChartPanel sessions={sessions} />}

        {/* Financial Progress Bar */}
        {stats && stats.totalCharged > 0 && <FinanceSummaryCard stats={stats} />}

        {/* Medical & High-priority Badges */}
        <MedicalHighlights patient={patient} stats={stats} />

        {/* Upcoming Appointments & Follow-ups */}
        <UpcomingScheduleGrid
          appointments={appointments}
          sessions={sessions}
          onBookAppointment={() => {
            setEditAppointment(null)
            setShowAppointmentForm(true)
          }}
          onEditAppointment={(appt) => {
            setEditAppointment(appt)
            setShowAppointmentForm(true)
          }}
        />

        {/* Tabular Prescriptions View */}
        <PrescriptionsTable prescriptions={allPrescriptions} onReload={reload} />

        {/* Sessions Historical Timeline */}
        <SessionTimelineSection
          sessions={sessions}
          stats={stats}
          onNewSession={() => setShowNewSession(true)}
          onEditSession={(session) => setEditSession(session)}
        />
      </div>

      {/* Modals Orchestrator */}
      <PatientProfileModals
        patient={patient}
        showEditPatient={showEditPatient}
        showNewSession={showNewSession}
        editSession={editSession}
        showAppointmentForm={showAppointmentForm}
        editAppointment={editAppointment}
        showUploadResult={showUploadResult}
        viewingResult={viewingResult}
        showPayModal={showPayModal}
        onCloseEditPatient={() => setShowEditPatient(false)}
        onCloseNewSession={() => setShowNewSession(false)}
        onCloseEditSession={() => setEditSession(null)}
        onCloseAppointmentForm={() => {
          setShowAppointmentForm(false)
          setEditAppointment(null)
        }}
        onCloseUploadResult={() => setShowUploadResult(false)}
        onCloseViewer={() => setViewingResult(null)}
        onClosePayModal={() => setShowPayModal(false)}
        onReload={reload}
      />
    </div>
  )
}