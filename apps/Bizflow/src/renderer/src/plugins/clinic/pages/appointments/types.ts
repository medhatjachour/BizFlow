export interface PatientSummary {
  id: string
  name: string
  phone: string
  bloodType?: string
  nationalId?: string
}

export interface Appointment {
  id: string
  patientId: string
  patient: PatientSummary
  appointmentDate: string
  duration?: number | null
  type: string
  doctorName?: string | null
  doctorId?: string | null
  notes?: string | null
  status: string
  amountCharged?: number | null
  amountPaid?: number | null
  paymentMethod?: string | null
}

export interface FollowUp {
  id: string
  patientId: string
  patient: PatientSummary
  followUpDate: string
  chiefComplaint: string
  diagnosis?: string | null
  visitDate: string
  doctorName?: string | null
}

export type FollowUpFilter = 'all' | 'today' | 'overdue' | 'upcoming'

export type SlotState = 'available' | 'booked' | 'overlap' | 'past'

export interface SlotStatusResult {
  state: SlotState
  patient?: string
}

export interface DoctorOption {
  id: string
  name: string
  specialty?: string
  isDefault?: boolean
}

export interface AppointmentFormData {
  patientId: string
  appointmentDate: string
  duration: string
  type: string
  doctorName: string
  doctorId: string
  notes: string
  status: string
  amountCharged: string
  amountPaid: string
  paymentMethod: string
}