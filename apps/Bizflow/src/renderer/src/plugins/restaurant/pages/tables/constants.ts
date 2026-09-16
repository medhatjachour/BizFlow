import { TableStatus, TableShape } from './types'

/**
 * Status metadata carries a `labelKey` rather than a label: the floor plan is
 * bilingual, so every surface that renders a status has to run it through `t()`.
 */
export const TABLE_STATUS_CONFIG: Record<
  TableStatus,
  { labelKey: string; bg: string; border: string; text: string; dot: string; glow: string }
> = {
  available: {
    labelKey: 'restTableStatusAvailable',
    bg: 'bg-emerald-50 dark:bg-emerald-950/25',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    glow: 'hover:shadow-emerald-500/10'
  },
  occupied: {
    labelKey: 'restTableStatusOccupied',
    bg: 'bg-amber-50 dark:bg-amber-950/25',
    border: 'border-amber-300 dark:border-amber-700/60',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 animate-pulse',
    glow: 'hover:shadow-amber-500/10'
  },
  billing: {
    labelKey: 'restTableStatusBilling',
    bg: 'bg-purple-50 dark:bg-purple-950/25',
    border: 'border-purple-300 dark:border-purple-700/60',
    text: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500',
    glow: 'hover:shadow-purple-500/10'
  },
  reserved: {
    labelKey: 'restTableStatusReserved',
    bg: 'bg-blue-50 dark:bg-blue-950/25',
    border: 'border-blue-200 dark:border-blue-800/60',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
    glow: 'hover:shadow-blue-500/10'
  },
  cleaning: {
    labelKey: 'restTableStatusCleaning',
    bg: 'bg-rose-50 dark:bg-rose-950/25',
    border: 'border-rose-200 dark:border-rose-800/60',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    glow: 'hover:shadow-rose-500/10'
  }
}

export const SHAPE_OPTIONS: Array<{ value: TableShape; labelKey: string; iconSize: string }> = [
  { value: 'square', labelKey: 'restTableShapeSquare', iconSize: 'aspect-square' },
  { value: 'circle', labelKey: 'restTableShapeRound', iconSize: 'rounded-full aspect-square' },
  { value: 'rectangle', labelKey: 'restTableShapeRectangle', iconSize: 'aspect-video' }
]

/** Footprint of a floor tile in pixels — shared by the canvas and its clamp math. */
export const TILE_SIZE: Record<TableShape, { width: number; height: number }> = {
  square: { width: 115, height: 115 },
  circle: { width: 115, height: 115 },
  rectangle: { width: 160, height: 100 }
}

/** Smallest floor the spatial map renders at before it starts scrolling. */
export const FLOOR_MIN_WIDTH = 760
export const FLOOR_HEIGHT = 600

export const DEFAULT_SECTIONS = [
  'Main Hall',
  'Indoor Dining',
  'Patio / Terrace',
  'Bar Lounge',
  'VIP Room'
]
