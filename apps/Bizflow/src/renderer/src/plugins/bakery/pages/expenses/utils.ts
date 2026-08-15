import { EXPENSE_CATEGORIES } from './constants'
import { CategoryMeta, DateRangeKey } from './types'

export function getCategoryMeta(category: string): CategoryMeta {
  return (
    EXPENSE_CATEGORIES.find(c => c.value === category) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  )
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function buildDateBounds(range: DateRangeKey): { start: string; end: string } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const start = new Date()
  if (range === '7days') {
    start.setDate(start.getDate() - 7)
  } else if (range === '30days') {
    start.setDate(start.getDate() - 30)
  } else if (range === '90days') {
    start.setDate(start.getDate() - 90)
  } else {
    start.setFullYear(2000, 0, 1)
  }
  start.setHours(0, 0, 0, 0)

  return { start: start.toISOString(), end: end.toISOString() }
}