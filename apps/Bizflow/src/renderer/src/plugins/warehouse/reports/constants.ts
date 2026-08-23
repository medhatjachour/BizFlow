import { Package, ArrowLeftRight, AlertTriangle, DollarSign } from 'lucide-react'
import { ReportType } from './types'

export interface ReportOptionConfig {
  id: ReportType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badgeColor: string
  pdfThemeColor: [number, number, number]
}

export const REPORT_OPTIONS: ReportOptionConfig[] = [
  {
    id: 'stock',
    label: 'Stock Levels & Bins',
    description: 'Comprehensive inventory ledger grouped by facility nodes',
    icon: Package,
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    pdfThemeColor: [79, 70, 229]
  },
  {
    id: 'transfers',
    label: 'Transfer Audit Log',
    description: 'Inter-facility stock movements and transit manifests',
    icon: ArrowLeftRight,
    badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    pdfThemeColor: [14, 165, 233]
  },
  {
    id: 'critical',
    label: 'Critical Stock Alerts',
    description: 'Out-of-stock items and depleted reorder thresholds',
    icon: AlertTriangle,
    badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    pdfThemeColor: [225, 29, 72]
  },
  {
    id: 'valuation',
    label: 'Facility Asset Valuation',
    description: 'Financial capital asset breakdown per warehouse zone',
    icon: DollarSign,
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    pdfThemeColor: [16, 185, 129]
  }
]