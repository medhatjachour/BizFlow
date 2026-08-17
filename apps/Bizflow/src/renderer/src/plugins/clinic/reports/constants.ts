import { ClipboardList, Users, Heart } from 'lucide-react'
import type { ReportOption } from './types'

export const DIAGNOSIS_PALETTE = [
  '#0d9488',
  '#6366f1',
  '#f59e0b',
  '#e11d48',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#f97316'
]

export const REPORT_OPTIONS_CONFIG: Array<Omit<ReportOption, 'label' | 'desc'> & { labelKey: string; descKey: string }> = [
  {
    id: 'sessions',
    icon: ClipboardList,
    color: 'text-teal-600 dark:text-teal-400',
    activeColor: 'bg-teal-600',
    labelKey: 'sessionsReport',
    descKey: 'sessionsReportDesc'
  },
  {
    id: 'patients',
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    activeColor: 'bg-indigo-600',
    labelKey: 'patientsReport',
    descKey: 'patientsReportDesc'
  },
  {
    id: 'prescriptions',
    icon: Heart,
    color: 'text-pink-600 dark:text-pink-400',
    activeColor: 'bg-pink-600',
    labelKey: 'prescriptionsReport',
    descKey: 'prescriptionsReportDesc'
  }
]