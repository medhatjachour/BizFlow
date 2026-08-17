export type TrendRange = 7 | 30 | 90

export interface ClinicOverview {
  totalPatients: number
  sessionsThisMonth: number
  newPatientsThisMonth: number
  followUpsDue: number
  todaySessions: number
  revenueThisMonth: number
  outstandingThisMonth: number
}

export interface DiagnosisEntry {
  diagnosis: string
  count: number
}

export interface FullTrendEntry {
  date: string
  sessions: number
  charged: number
  paid: number
}

export interface MonthlyEntry {
  month: string
  sessions: number
  revenue: number
}

export interface Breakdowns {
  visitTypes: Array<{ type: string; count: number }>
  paymentStatuses: Array<{ status: string; count: number }>
}

export interface DoctorPerformance {
  id: string
  name: string
  title?: string | null
  specialty?: string | null
  avatarColor?: string | null
  isDefault?: boolean
  sessions: number
  patients: number
  revenue: number
  commission: number
  noShowRate: number
}

export type TrendDirection = 'up' | 'down' | 'flat'

export interface TrendMetric {
  pct: number
  dir: TrendDirection
}

export interface InsightItem {
  id: string
  type: 'good' | 'warn' | 'info'
  text: string
}