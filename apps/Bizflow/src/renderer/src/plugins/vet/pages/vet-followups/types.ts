import { VetPatient } from '../vet-owners/types'

export type FollowUpUrgency = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'upcoming'
export type FollowUpFilterKey = 'all' | 'overdue' | 'today' | 'upcoming'
export type FollowUpViewMode = 'grid' | 'table'
export type FollowUpSortField = 'followUpDate' | 'patient' | 'vetName' | 'visitDate'

export interface VetFollowUpRecord {
  id: string
  visitDate: string
  visitType: string
  vetName?: string | null
  chiefComplaint?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate: string
  status: string
  patient?: VetPatient & {
    owner?: {
      id: string
      name: string
      phone: string
      email?: string | null
    }
  }
}

export interface FollowUpMetrics {
  total: number
  overdue: number
  today: number
  upcoming: number
  thisWeek: number
}