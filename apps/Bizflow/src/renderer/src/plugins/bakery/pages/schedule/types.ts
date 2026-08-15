import React from 'react'

export type ScheduleStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled'
export type DateRangeFilter = 'all' | 'today' | 'week' | 'next7' | 'past' | 'overdue'

export interface Recipe {
  id: string
  name: string
  yieldQty?: number | null
  yieldUnit?: string | null
}

export interface ScheduleItem {
  id: string
  scheduledDate: string // YYYY-MM-DD
  plannedQuantity: number
  actualQuantity: number | null
  status: ScheduleStatus
  notes: string | null
  recipe: {
    id: string
    name: string
    yieldQty: number
    yieldUnit: string
  }
}

export interface ScheduleCounts {
  planned: number
  'in-progress': number
  completed: number
  cancelled: number
  overdue: number
  total: number
}

export interface ScheduleFormData {
  recipeId: string
  scheduledDate: string
  plannedQuantity: number
  notes: string
}

export interface StatusMeta {
  chip: string
  dot: string
  icon: React.ElementType
  label: string
  actionLabel?: string
}