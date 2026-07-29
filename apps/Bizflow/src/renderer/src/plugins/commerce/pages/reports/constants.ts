import { TrendingUp, Package, DollarSign, Users } from 'lucide-react'
import type { ReportType } from '@renderer/pages/Reports/types'

export const REPORT_TYPES_BASE: Omit<ReportType, 'title'>[] = [
  { id: 'sales', icon: TrendingUp, color: 'text-blue-600' },
  { id: 'inventory', icon: Package, color: 'text-green-600' },
  { id: 'financial', icon: DollarSign, color: 'text-purple-600' },
  { id: 'customer', icon: Users, color: 'text-orange-600' },
]

export const DEFAULT_START_DATE = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

export const DEFAULT_END_DATE = () => new Date().toISOString().split('T')[0]

export const ACTIVITY_FEED_LIMIT = 10
export const WEEKLY_TREND_DAYS = 7