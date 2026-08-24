export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface TableBrief {
  id: string
  number: number
  capacity: number
  section: string | null
  status: string
}

export interface ReservationData {
  id: string
  tableId: string | null
  customerName: string
  customerPhone: string | null
  partySize: number
  date: string
  durationMins: number
  notes: string | null
  guestTags: string | null
  status: ReservationStatus
  table?: TableBrief | null
  createdAt: string
}

export interface ReservationFormData {
  tableId: string
  customerName: string
  customerPhone: string
  partySize: string
  date: string
  durationMins: number
  notes: string
  guestTags: string[]
}

export interface WaitlistEntry {
  id: string
  customerName: string
  customerPhone?: string
  partySize: number
  quotedWaitMins: number
  createdAt: string
  notes?: string
}