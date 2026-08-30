import * as XLSX from 'xlsx'
import type { Expense, DateRange } from './types'

/**
 * Format currency with locale and RTL safety
 */
export function formatCurrency(amount: number, locale = 'en-US', currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0)
  } catch {
    return `$${(amount || 0).toFixed(2)}`
  }
}

/**
 * Generate start and end date boundaries for queries
 */
export function buildDateBounds(range: DateRange): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date()

  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0)
      break
    case '7days':
      startDate.setDate(startDate.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      break
    case '30days':
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case '90days':
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'this_month':
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'last_month':
      startDate.setMonth(startDate.getMonth() - 1)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(0)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'all':
    default:
      startDate.setFullYear(2000, 0, 1)
      startDate.setHours(0, 0, 0, 0)
      break
  }

  return { startDate, endDate }
}

/**
 * Export expenses to formatted Excel sheet
 */
export function exportExpensesToExcel(expenses: Expense[], getCategoryName: (c: any) => string, fileNamePrefix = 'expenses') {
  const rows = expenses.map(e => ({
    ID: e.id,
    Date: new Date(e.date || e.createdAt).toLocaleDateString(),
    Category: getCategoryName(e.category),
    Description: e.description,
    Vendor: e.vendor || '—',
    Amount: e.amount,
    'Payment Method': e.paymentMethod,
    'Recurrence': e.recurrence,
    'Ref #': e.referenceNumber || '—',
    'Tax Deductible': e.isTaxDeductible ? 'Yes' : 'No',
    'Recorded By': e.user?.name || e.user?.username || 'Unknown',
    Notes: e.notes || ''
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
  XLSX.writeFile(wb, `${fileNamePrefix}-${new Date().toISOString().split('T')[0]}.xlsx`)
}