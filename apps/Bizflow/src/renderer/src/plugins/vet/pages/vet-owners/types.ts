export interface VetOwner {
  id: string
  name: string
  phone: string
  email?: string | null
  address?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface VetPatient {
  id: string
  ownerId: string
  owner?: VetOwner
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

export interface VetOwnerWithPets extends VetOwner {
  patients: Array<{ id: string; name: string; species: string; breed?: string | null }>
  _count: { patients: number }
  finance?: {
    sessions?: { charged: number; paid: number; outstanding: number }
    sales?: { charged: number; paid: number; outstanding: number }
    totalCharged?: number
    totalPaid?: number
    outstanding?: number
  }
}

export type OwnerViewMode = 'grid' | 'table'
export type OwnerSortField = 'name' | 'patients' | 'createdAt'