// Shared types for the bakery ScheduleTab.

export interface Recipe { id: string; name: string; yieldQty?: number; yieldUnit?: string }

export interface ScheduleItem {
  id: string
  scheduledDate: string
  plannedQuantity: number
  actualQuantity: number | null
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled'
  notes: string | null
  recipe: { id: string; name: string; yieldQty: number; yieldUnit: string }
}

export type Status = 'planned' | 'in-progress' | 'completed' | 'cancelled'
export type DateRange = 'all' | 'today' | 'week' | 'next7' | 'past' | 'overdue'
