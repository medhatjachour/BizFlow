
import AppointmentFormModal from '../../components/appointments/AppointmentFormModal'
import PatientFormModal from '../../patients/components/PatientFormModal'
import PdfViewerModal from '../../patients/components/PdfViewerModal'
import QuickPayModal from '../../patients/components/QuickPayModal'
import UploadCheckResultModal from '../../patients/components/UploadCheckResultModal'
import SessionFormModal from '../../sessions/components/SessionFormModal'
import type { PatientProfileData, Session, Appointment, CheckResult } from '../types'

interface Props {
  patient: PatientProfileData
  showEditPatient: boolean
  showNewSession: boolean
  editSession: Session | null
  showAppointmentForm: boolean
  editAppointment: Appointment | null
  showUploadResult: boolean
  viewingResult: CheckResult | null
  showPayModal: boolean
  onCloseEditPatient: () => void
  onCloseNewSession: () => void
  onCloseEditSession: () => void
  onCloseAppointmentForm: () => void
  onCloseUploadResult: () => void
  onCloseViewer: () => void
  onClosePayModal: () => void
  onReload: () => Promise<void>
}

const getDateInputValue = (value: unknown) => {
  if (!value) return new Date().toISOString().slice(0, 10)

  try {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    if (typeof value === 'string') return value.slice(0, 10)

    const date = new Date(value as string | number | Date)
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  } catch {
    // fall through to safe default below
  }

  return new Date().toISOString().slice(0, 10)
}

export const PatientProfileModals: React.FC<Props> = ({
  patient,
  showEditPatient,
  showNewSession,
  editSession,
  showAppointmentForm,
  editAppointment,
  showUploadResult,
  viewingResult,
  showPayModal,
  onCloseEditPatient,
  onCloseNewSession,
  onCloseEditSession,
  onCloseAppointmentForm,
  onCloseUploadResult,
  onCloseViewer,
  onClosePayModal,
  onReload
}) => {
  return (
    <>
      {showEditPatient && (
        <PatientFormModal
          patient={patient as any}
          onClose={onCloseEditPatient}
          onSaved={async () => {
            onCloseEditPatient()
            await onReload()
          }}
        />
      )}

      {showNewSession && (
        <SessionFormModal
          defaultPatient={patient as any}
          onClose={onCloseNewSession}
          onSaved={async () => {
            onCloseNewSession()
            await onReload()
          }}
        />
      )}

      {editSession && (
        <SessionFormModal
          existingSession={{
            ...editSession,
            patientId: patient.id,
            patient: {
              id: patient.id,
              name: patient.name,
              phone: patient.phone,
              dateOfBirth: patient.dateOfBirth,
              bloodType: patient.bloodType,
              gender: patient.gender
            },
            visitType: editSession.visitType ?? 'routine',
            status: editSession.status ?? 'completed',
            paymentStatus: editSession.paymentStatus ?? 'unpaid',
            prescriptions: editSession.prescriptions ?? []
          } as any}
          onClose={onCloseEditSession}
          onSaved={async () => {
            onCloseEditSession()
            await onReload()
          }}
        />
      )}

      {showAppointmentForm && (
        <AppointmentFormModal
          existing={editAppointment}
          defaultPatientId={patient.id}
          defaultPatientName={patient.name}
          defaultDate={getDateInputValue(editAppointment?.appointmentDate)}
          onClose={onCloseAppointmentForm}
          onSaved={async () => {
            onCloseAppointmentForm()
            await onReload()
          }}
        />
      )}

      {showUploadResult && (
        <UploadCheckResultModal
          patientId={patient.id}
          onClose={onCloseUploadResult}
          onSaved={async () => {
            onCloseUploadResult()
            await onReload()
          }}
        />
      )}

      {viewingResult && <PdfViewerModal result={viewingResult} onClose={onCloseViewer} />}

      {showPayModal && patient.sessions.length > 0 && (
        <QuickPayModal
          sessions={patient.sessions as any}
          onClose={onClosePayModal}
          onPaid={async () => {
            onClosePayModal()
            await onReload()
          }}
        />
      )}
    </>
  )
}