import { TableStatus, TableShape } from './types'

export const TABLE_STATUS_CONFIG: Record<
  TableStatus,
  { label: string; bg: string; border: string; text: string; dot: string; glow: string }
> = {
  available: {
    label: 'Available',
    bg: 'bg-emerald-50 dark:bg-emerald-950/25',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    glow: 'hover:shadow-emerald-500/10'
  },
  occupied: {
    label: 'Occupied',
    bg: 'bg-amber-50 dark:bg-amber-950/25',
    border: 'border-amber-300 dark:border-amber-700/60',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 animate-pulse',
    glow: 'hover:shadow-amber-500/10'
  },
  billing: {
    label: 'Billing',
    bg: 'bg-purple-50 dark:bg-purple-950/25',
    border: 'border-purple-300 dark:border-purple-700/60',
    text: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500',
    glow: 'hover:shadow-purple-500/10'
  },
  reserved: {
    label: 'Reserved',
    bg: 'bg-blue-50 dark:bg-blue-950/25',
    border: 'border-blue-200 dark:border-blue-800/60',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
    glow: 'hover:shadow-blue-500/10'
  },
  cleaning: {
    label: 'Cleaning',
    bg: 'bg-rose-50 dark:bg-rose-950/25',
    border: 'border-rose-200 dark:border-rose-800/60',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    glow: 'hover:shadow-rose-500/10'
  }
}

export const SHAPE_OPTIONS: Array<{ value: TableShape; label: string; iconSize: string }> = [
  { value: 'square', label: 'Square', iconSize: 'aspect-square' },
  { value: 'circle', label: 'Round', iconSize: 'rounded-full aspect-square' },
  { value: 'rectangle', label: 'Rectangle', iconSize: 'aspect-video' }
]

export const DEFAULT_SECTIONS = ['Main Hall', 'Indoor Dining', 'Patio / Terrace', 'Bar Lounge', 'VIP Room']