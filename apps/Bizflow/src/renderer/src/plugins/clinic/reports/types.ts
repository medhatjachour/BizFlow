import type { ElementType } from 'react'

export type ReportType = 'sessions' | 'patients' | 'prescriptions'

export interface ReportOption {
  id: ReportType
  label: string
  icon: ElementType
  color: string
  activeColor: string
  desc: string
}

export interface PrescriptionSummary {
  id?: string
  medicineName?: string
  dosage?: string | null
  frequency?: string | null
  patientName?: string
  sessionDate?: string
}

export interface SessionRecord {
  id: string
  patientId: string
  patient?: { id: string; name: string; phone?: string; dateOfBirth?: string | null; gender?: string | null }
  visitDate: string
  diagnosis?: string | null
  chiefComplaint?: string | null
  prescriptions?: PrescriptionSummary[]
}

export interface PatientRecord {
  id: string
  name: string
  gender?: string | null
  dateOfBirth?: string | null
  phone?: string | null
  createdAt: string
}

export interface FollowUpRecord {
  id: string
  patientId: string
  patient?: { name: string }
  patientName?: string
  followUpDate: string
  notes?: string | null
  reason?: string | null
}

export interface ClinicActivityData {
  patientCount: number
  todaySessions: SessionRecord[]
  followUps: FollowUpRecord[]
  todayPrescriptions: PrescriptionSummary[]
  patients: PatientRecord[]
}