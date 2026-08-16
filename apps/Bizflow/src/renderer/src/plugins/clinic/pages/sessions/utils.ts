import { VitalsData, PrescriptionItem, LabOrderItem, PaymentStatus } from './types'

export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const offset = d.getTimezoneOffset() * 60000
    const local = new Date(d.getTime() - offset)
    return local.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

export function parseVitals(raw?: string | null): VitalsData {
  if (!raw) return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' }
  try {
    const parsed = JSON.parse(raw)
    return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '', ...parsed }
  } catch {
    return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' }
  }
}

export function computePaymentStatus(charged?: string | number | null, paid?: string | number | null): PaymentStatus {
  const c = typeof charged === 'string' ? parseFloat(charged) || 0 : charged ?? 0
  const p = typeof paid === 'string' ? parseFloat(paid) || 0 : paid ?? 0
  if (c === 0) return 'unpaid'
  if (p >= c) return 'paid'
  if (p > 0) return 'partial'
  return 'unpaid'
}

export function emptyRx(): PrescriptionItem {
  return {
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    instructions: '',
    isActive: true,
    stoppedAt: '',
    stopReason: ''
  }
}

export function emptyLab(): LabOrderItem {
  return { testName: '', notes: '' }
}

export function formatCurrency(amount?: number | null): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export function formatVisitDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}