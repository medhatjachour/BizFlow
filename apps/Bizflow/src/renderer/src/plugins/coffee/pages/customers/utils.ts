import type { Customer } from './types'

export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '0.00'
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  })
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function getAvatarGradient(name: string): string {
  const gradients = [
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-blue-500 to-indigo-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-blue-500'
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}

export function exportCustomersToCSV(customers: Customer[], filename = 'customers.csv') {
  const headers = ['Name', 'Phone', 'Address', 'Total Spent', 'Visits', 'Last Visit', 'Notes']
  const rows = customers.map(c => [
    c.name,
    c.phone ?? '',
    c.address ?? '',
    c.totalSpent,
    c.visitCount,
    c.lastVisit ? formatDate(c.lastVisit) : '',
    c.notes ?? ''
  ])
  
  const csv = [headers, ...rows].map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
