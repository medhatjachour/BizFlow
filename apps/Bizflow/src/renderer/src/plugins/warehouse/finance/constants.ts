import { Warehouse, BarChart3, AlertTriangle } from 'lucide-react'
import { FinanceTabType } from './types'

export const FINANCE_PALETTE = [
  '#6366f1', // Indigo
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316'  // Orange
]

export const FINANCE_TABS: Array<{
  id: FinanceTabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  {
    id: 'overview',
    label: 'Inventory Overview',
    icon: Warehouse,
    description: 'Real-time SKU distribution and storage node balances'
  },
  {
    id: 'valuation',
    label: 'Asset Valuation & Allocation',
    icon: BarChart3,
    description: 'Capital stock distribution and location concentration'
  },
  {
    id: 'critical',
    label: 'Critical Cost & Risk Exposure',
    icon: AlertTriangle,
    description: 'Depleted threshold audit and replenishment gap analysis'
  }
]