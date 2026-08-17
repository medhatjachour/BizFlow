export const SINGLE_DOCTOR_KEY = 'clinicSingleDoctorMode'

export type LiveStatus = 'available' | 'busy' | 'off' | 'on_leave' | 'inactive'
export type DoctorStatus = 'active' | 'on_leave' | 'inactive'
export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export interface WorkingDay {
  start?: string
  end?: string
  off?: boolean
}

export type WorkingHours = Partial<Record<DayKey, WorkingDay>>

export interface NextAppointmentSummary {
  date: string
  patientName?: string
}

export interface Doctor {
  id: string
  name: string
  title?: string | null
  specialty?: string | null
  phone?: string | null
  email?: string | null
  licenseNo?: string | null
  roomNumber?: string | null
  consultationFee?: number | null
  commissionPct?: number | null
  status: DoctorStatus
  liveStatus?: LiveStatus
  currentPatient?: string | null
  avatarColor?: string | null
  bio?: string | null
  workingHours?: string | null
  isDefault?: boolean
  todayCount?: number
  panelSize?: number
  nextAppointment?: NextAppointmentSummary | null
}

export interface DoctorKpis {
  patientsSeen: number
  sessions: number
  revenue: number
  commission: number
  appointments: number
  avgFee: number
  panelSize: number
  noShowRate: number
}

export interface DoctorProfileData {
  doctor: Doctor
  kpis: DoctorKpis
  upcomingAppts: Array<{
    id: string
    appointmentDate: string
    patient: { id: string; name: string; phone?: string }
  }>
  recentSessions: Array<{
    id: string
    visitDate: string
    diagnosis?: string | null
    chiefComplaint?: string | null
    patient: { id: string; name: string }
  }>
}

export type ProfileTab = 'overview' | 'appointments' | 'sessions' | 'availability'

export interface DoctorFormData {
  name: string
  title: string
  specialty: string
  phone: string
  email: string
  licenseNo: string
  roomNumber: string
  consultationFee: string
  commissionPct: string
  status: DoctorStatus
  avatarColor: string
  bio: string
}