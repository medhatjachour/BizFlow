// Shared domain types for the clinic Patient Profile page and its sub-components.

import type { PaymentStatus, PrescriptionItem, SessionStatus, VisitType } from './sessions/types'

export interface Prescription extends PrescriptionItem {}

export interface Session {
  id: string
  patientId: string
  patient: {
    id: string
    name: string
    phone?: string
    dateOfBirth?: string | null
    bloodType?: string | null
    gender?: string | null
  }
  visitDate: string
  visitType: VisitType
  doctorName?: string | null
  chiefComplaint: string
  vitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: SessionStatus
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: PaymentStatus
  paymentMethod?: string | null
  dentalChart?: string | null
  prescriptions: PrescriptionItem[]
}

export interface PatientStats {
  totalSessions: number
  firstVisit: string | null
  lastVisit: string | null
  topDiagnosis: string | null
  nextFollowUp: string | null
  totalCharged: number
  totalPaid: number
  outstanding: number
}

export interface CheckResult {
  id: string
  patientId: string
  title: string
  description?: string | null
  fileName: string
  filePath: string
  fileSize?: number | null
  resultDate: string
  createdAt: string
}

export interface Appointment {
  id: string
  patientId: string
  appointmentDate: string
  duration?: number | null
  type: string
  doctorName?: string | null
  notes?: string | null
  status: string
}
