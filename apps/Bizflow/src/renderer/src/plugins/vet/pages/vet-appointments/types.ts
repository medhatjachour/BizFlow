import { VetPatient } from '../vet-owners/types'

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type AppointmentViewMode = 'day' | 'week' | 'table'

export interface VetAppointmentRecord {
  id: string
  patientId: string
  appointmentDate: string
  duration: number
  type: string
  vetName?: string | null
  notes?: string | null
  status: AppointmentStatus
  patient?: VetPatient & {
    owner?: {
      id: string
      name: string
      phone: string
      email?: string | null
    }
  }
  createdAt?: string
  updatedAt?: string
}

export interface AppointmentFormData {
  appointmentDate: string
  duration: string
  type: string
  vetName: string
  notes: string
  status: AppointmentStatus
}

export interface AppointmentMetrics {
  total: number
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
}