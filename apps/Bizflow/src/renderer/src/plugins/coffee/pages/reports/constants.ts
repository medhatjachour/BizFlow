import { DatePreset, StatTone } from './types'

export const DATE_PRESETS: Array<{
  value: DatePreset
  labelKey: string
  icon: string
}> = [
  { value: 'today', labelKey: 'cfToday', icon: '☀️' },
  { value: 'week', labelKey: 'cfWeek', icon: '📅' },
  { value: 'month', labelKey: 'cfMonth', icon: '🗓️' },
  { value: 'quarter', labelKey: 'cfQuarter', icon: '📊' },
  { value: 'year', labelKey: 'cfYear', icon: '📈' },
  { value: 'all', labelKey: 'cfAllTime', icon: '∞' },
]

export const STAT_TONE_CONFIG: Record<StatTone, {
  gradient: string
  iconBg: string
  text: string
  border: string
  glow: string
}> = {
  revenue: {
    gradient: 'from-emerald-500/10 to-teal-500/5',
    iconBg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
  },
  profit: {
    gradient: 'from-green-500/10 to-emerald-500/5',
    iconBg: 'bg-green-500/15',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
    glow: 'shadow-green-500/10',
  },
  orders: {
    gradient: 'from-blue-500/10 to-indigo-500/5',
    iconBg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/10',
  },
  customers: {
    gradient: 'from-purple-500/10 to-violet-500/5',
    iconBg: 'bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    glow: 'shadow-purple-500/10',
  },
  items: {
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconBg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/10',
  },
  discount: {
    gradient: 'from-rose-500/10 to-pink-500/5',
    iconBg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-500/10',
  },
  expense: {
    gradient: 'from-red-500/10 to-rose-500/5',
    iconBg: 'bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/10',
  },
  neutral: {
    gradient: 'from-slate-500/10 to-gray-500/5',
    iconBg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20',
    glow: 'shadow-slate-500/10',
  },
}

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', color: '#10b981' },
  { key: 'card', label: 'Card', color: '#3b82f6' },
  { key: 'vodafone_cash', label: 'Vodafone Cash', color: '#ef4444' },
] as const

export const ORDER_TYPES = [
  { key: 'dine_in', labelKey: 'cfDineIn', color: '#8b5cf6', icon: '🍽️' },
  { key: 'takeaway', labelKey: 'cfTakeaway', color: '#f59e0b', icon: '🥤' },
  { key: 'delivery', labelKey: 'cfDeliveryOpt', color: '#06b6d4', icon: '🛵' },
] as const

export const CHART_COLORS = {
  revenue: '#10b981',
  orders: '#3b82f6',
  profit: '#22c55e',
  discount: '#f43f5e',
  expense: '#ef4444',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
}

export const EXPORT_OPTIONS = [
  { format: 'pdf' as const, label: 'PDF Report', icon: '📄', description: 'Formatted PDF document' },
  { format: 'excel' as const, label: 'Excel Spreadsheet', icon: '📊', description: 'XLSX with multiple sheets' },
  { format: 'csv' as const, label: 'CSV Data', icon: '📝', description: 'Raw CSV data export' },
  { format: 'print' as const, label: 'Print Report', icon: '🖨️', description: 'Print optimized view' },
]

export const TABLE_PAGE_SIZES = [10, 25, 50, 100]

export const ANIMATION_DURATION = 300
