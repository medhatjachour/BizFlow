// Shared domain types for the clinic Patient Profile page and its sub-components.

export interface Prescription {
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
}

export interface Session {
  id: string
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
  prescriptions: Prescription[]
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
