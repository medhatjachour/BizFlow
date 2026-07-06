// Constants and pure helpers for the clinic SessionFormModal.
import type { PrescriptionRow } from './sessionForm.types'

export const APPT_TO_VISIT_TYPE: Record<string, string> = {
  consultation: 'first_visit',
  follow_up: 'follow_up',
  procedure: 'routine',
  checkup: 'routine',
}

export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    // format: YYYY-MM-DDTHH:MM
    return d.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

export function emptyRx(): PrescriptionRow {
  return { medicineName: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', isActive: true, stoppedAt: '', stopReason: '' }
}

export function parseVitals(raw?: string | null) {
  if (!raw) return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' }
  try { return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '', ...JSON.parse(raw) } }
  catch { return { bp: '', temp: '', weight: '', height: '', pulse: '', o2sat: '' } }
}

export function computePaymentStatus(charged: string, paid: string): string {
  const c = parseFloat(charged) || 0
  const p = parseFloat(paid) || 0
  if (c === 0) return 'unpaid'
  if (p >= c) return 'paid'
  if (p > 0) return 'partial'
  return 'unpaid'
}
