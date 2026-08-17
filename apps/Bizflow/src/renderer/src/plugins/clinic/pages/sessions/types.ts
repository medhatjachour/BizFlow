
export type SessionStatus = 'active' | 'completed' | 'cancelled'
export type VisitType = 'first_visit' | 'follow_up' | 'routine' | 'emergency'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'waived'
export type PaymentMethod = 'cash' | 'card' | 'insurance' | 'transfer' | 'other'
export type TimeframeFilter = 'today' | 'week' | 'month' | 'all'

export interface VitalsData {
  bp?: string
  temp?: string
  weight?: string
  height?: string
  pulse?: string
  o2sat?: string
}

export interface PrescriptionItem {
  id?: string
  medicineName: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
  quantity?: number | string | null
  instructions?: string | null
  isActive?: boolean
  startDate?: string | null
  stoppedAt?: string | null
  stopReason?: string | null
}

export interface LabOrderItem {
  testName: string
  notes?: string
}

export interface SessionMaterialBatch {
  id: string
  batchNumber?: string | null
  quantity: number
  expiryDate?: string | null
}

export interface SessionMaterialItem {
  id?: string
  materialId: string
  materialName?: string
  unit?: string
  quantityUsed: number | string
  notes?: string | null
  batchId?: string | null
  batch?: { id: string; batchNumber?: string | null; expiryDate?: string | null } | null
  batches?: SessionMaterialBatch[]
  material?: { id: string; name: string; unit: string }
}

export interface SessionPatientInfo {
  id: string
  name: string
  phone?: string
  dateOfBirth?: string | null
  bloodType?: string | null
  gender?: string | null
}

export interface Session {
  id: string
  patientId: string
  visitDate: string
  visitType: VisitType
  doctorName?: string | null
  doctorId?: string | null
  chiefComplaint: string
  vitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: SessionStatus
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod | string | null
  dentalChart?: string | null
  labOrders?: string | null
  prescriptions: PrescriptionItem[]
  sessionMaterials?: SessionMaterialItem[]
  patient: SessionPatientInfo
}

export interface SessionFilterState {
  timeframe: TimeframeFilter
  status?: string
  paymentStatus?: string
  search: string
}

export interface SessionFormProps {
  existingSession?: Session | null
  defaultPatient?: SessionPatientInfo | null
  defaultAppointment?: {
    id: string
    appointmentDate: string
    type: string
    doctorName?: string | null
    doctorId?: string | null
    notes?: string | null
    amountCharged?: number | null
    amountPaid?: number | null
    paymentMethod?: string | null
    patient: { id: string; name: string; phone: string }
  } | null
  onClose: () => void
  onSaved: () => void
}