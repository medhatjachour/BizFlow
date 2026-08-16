export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'
export type Gender = 'male' | 'female' | 'other'

export interface PatientFinanceSummary {
  totalCharged: number
  totalPaid: number
  outstanding: number
}

export interface PatientRecentSession {
  id?: string
  visitDate: string
  paymentStatus?: 'paid' | 'partial' | 'unpaid'
  visitType?: 'first_visit' | 'follow_up' | 'routine' | 'emergency'
  diagnosis?: string
}

export interface Patient {
  id: string
  name: string
  dateOfBirth?: string | null
  gender?: Gender | null
  phone: string
  email?: string | null
  address?: string | null
  nationalId?: string | null
  folderNumber?: string | null
  bloodType?: BloodType | null
  allergies?: string | null
  medicalNotes?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    sessions: number
  }
  sessions?: PatientRecentSession[]
  finance?: PatientFinanceSummary
}

export interface PatientFormData {
  name: string
  age?: string | number
  dateOfBirth?: string | null
  gender?: Gender | ''
  phone: string
  email?: string
  nationalId?: string
  folderNumber?: string
  bloodType?: BloodType | ''
  address?: string
  allergies?: string
  medicalNotes?: string
}

export interface PatientFilterState {
  search: string
  gender: string
  bloodType: string
  hasOutstandingOnly: boolean
  sortBy: 'name' | 'recentVisit' | 'outstanding' | 'createdAt'
  sortOrder: 'asc' | 'desc'
}

export interface PaginatedPatientResponse {
  data: Patient[]
  total: number
  hasMore: boolean
}
export interface Session {
  id: string
  patientId?: string | null     // <-- Made optional & nullable
  visitDate: string
  diagnosis?: string | null
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus?: string | null
  paymentMethod?: string | null
  [key: string]: any            // <-- Accommodates extra session fields from patient profile
}

export interface CheckResult {
  id: string
  patientId?: string | null     // <-- Made optional & nullable
  title: string
  fileName: string
  filePath: string
  fileSize?: number | null      // <-- Added `| null` to accept null from database
  resultDate?: string
  description?: string | null
  createdAt?: string
  [key: string]: any
}