export type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom'
export type SessionPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'waived'
export type SessionViewMode = 'table' | 'grid'
export type SessionSortField =
  | 'visitDate'
  | 'amountCharged'
  | 'patient'
  | 'visitType'
  | 'paymentStatus'
export interface VetOwner {
  id: string
  name: string
  phone: string
  email?: string | null
  address?: string | null
  notes?: string | null
}
export interface VetPatient {
  id: string
  ownerId: string
  owner: VetOwner
  name: string
  species: string
  breed?: string | null
  petColor?: string | null
  microchipId?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  weight?: number | null
  allergies?: string | null
  medicalNotes?: string | null
  createdAt: string
  updatedAt: string
  finance?: { totalCharged: number; totalPaid: number; outstanding: number }
  _count?: { sessions: number }
  sessions?: any[]
}

export interface PrescriptionItem {
  id?: string
  medicineName: string
  dosage?: string
  frequency?: string
  duration?: string
  quantity?: string
  instructions?: string
  isActive?: boolean
}

export interface SessionVitals {
  weight_kg?: string
  temp_rectal_c?: string
  heart_rate?: string
  resp_rate?: string
  crt?: string
  mucous_membranes?: string
  [key: string]: string | undefined
}

export interface VetSessionRecord {
  id: string
  patientId: string
  patient?: VetPatient & { owner?: { id: string; name: string; phone: string } }
  visitDate: string
  visitType: string
  vetName?: string | null
  chiefComplaint: string
  vetVitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: 'completed' | 'active' | 'cancelled' | string
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: SessionPaymentStatus
  paymentMethod?: string | null
  prescriptions?: PrescriptionItem[]
  createdAt?: string
  updatedAt?: string
}

export interface SessionFormData {
  visitDate: string
  visitType: string
  vetName: string
  chiefComplaint: string
  diagnosis: string
  notes: string
  followUpDate: string
  status: string
  amountCharged: string
  amountPaid: string
  paymentStatus: SessionPaymentStatus
  paymentMethod: string
}

export interface VisitType {
  id: string
  name: string
  color: string
  isDefault: boolean
  sortOrder: number
}
