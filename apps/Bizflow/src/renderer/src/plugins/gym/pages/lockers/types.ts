export type LockerZone = 'general' | 'men' | 'women' | 'vip'
export type LockerZoneFilter = 'all' | LockerZone
export type LockerStatus = 'available' | 'occupied'
export type LockerViewMode = 'grid' | 'table'

export interface TraineeLite {
  id: string
  name: string
  phone?: string
  photoUrl?: string
}

export interface LockerAssignment {
  id: string
  lockerId: string
  traineeId: string
  trainee?: TraineeLite
  startDate?: string
  endDate?: string
  notes?: string
  createdAt?: string
}

export interface Locker {
  id: string
  number: string
  zone: LockerZone
  notes?: string
  assignments?: LockerAssignment[]
  createdAt?: string
  updatedAt?: string
}

export interface LockerFormData {
  number: string
  zone: LockerZone
  notes: string
}

export interface AssignLockerFormData {
  memberSearch: string
  traineeId: string
  selectedMember: TraineeLite | null
  endDate: string
  notes: string
}