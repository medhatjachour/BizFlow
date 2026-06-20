// Shared types for the clinic SessionFormModal.
import type { Patient } from '../index'

export interface LabCheckRow {
  testName: string
  notes: string
}

export interface SessionMaterialRow {
  materialId: string
  materialName: string
  unit: string
  quantityUsed: string
  notes: string
  batchId?: string
  batches?: Array<{ id: string; batchNumber?: string | null; quantity: number; expiryDate?: string | null }>
}

export interface PrescriptionRow {
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: string
  instructions: string
  isActive: boolean
  stoppedAt: string
  stopReason: string
}

export interface ExistingSession {
  id: string
  patientId: string
  visitDate: string
  visitType: string
  doctorName?: string | null
  chiefComplaint: string
  vitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: string
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: string
  paymentMethod?: string | null
  dentalChart?: string | null
  labOrders?: string | null
  prescriptions: Array<{
    id: string
    medicineName: string
    dosage?: string | null
    frequency?: string | null
    duration?: string | null
    quantity?: number | null
    instructions?: string | null
    isActive?: boolean
    startDate?: string | null
    stoppedAt?: string | null
    stopReason?: string | null
  }>
  sessionMaterials?: Array<{
    id: string
    materialId: string
    batchId?: string | null
    quantityUsed: number
    notes?: string | null
    material: { id: string; name: string; unit: string }
    batch?: { id: string; batchNumber?: string | null } | null
  }>
  patient: { id: string; name: string }
}

export interface DefaultAppointment {
  id: string
  appointmentDate: string
  type: string
  doctorName?: string | null
  notes?: string | null
  amountCharged?: number | null
  amountPaid?: number | null
  paymentMethod?: string | null
  patient: { id: string; name: string; phone: string }
}

export interface Props {
  existingSession?: ExistingSession | null
  defaultPatient?: Patient | null
  defaultAppointment?: DefaultAppointment | null
  onClose: () => void
  onSaved: () => void
}
