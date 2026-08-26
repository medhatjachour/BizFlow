import { PeriodPreset, PeriodRange, MedicineItem, MedicineBatch } from './types'

const pad = (n: number) => String(n).padStart(2, '0')
export const formatDateISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function computePresetRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  let fromDate: Date

  switch (preset) {
    case 'today': {
      fromDate = new Date(now)
      fromDate.setHours(0, 0, 0, 0)
      break
    }
    case 'week': {
      fromDate = new Date(now.getTime() - 7 * 86400000)
      break
    }
    case 'year': {
      fromDate = new Date(now.getTime() - 365 * 86400000)
      break
    }
    case 'month':
    default: {
      fromDate = new Date(now.getTime() - 30 * 86400000)
      break
    }
  }

  return { from: fromDate.toISOString(), to }
}

export function formatCurrency(val: number | string | undefined | null, currency = '$'): string {
  const num = Number(val) || 0
  return `${currency}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCompactNumber(val: number | string | undefined | null): string {
  const num = Number(val) || 0
  return num.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function analyzeMedicineInventory(allMedicines: MedicineItem[]) {
  const nowMs = Date.now()
  const allBatches: MedicineBatch[] = allMedicines.flatMap((m) =>
    (m.batches ?? []).map((b) => ({ ...b, medicineName: m.name, unit: m.unit }))
  )

  const expiredBatches = allBatches.filter((b) => new Date(b.expiryDate).getTime() < nowMs && b.quantity > 0)
  const expiring7Batches = allBatches.filter((b) => {
    const diffDays = (new Date(b.expiryDate).getTime() - nowMs) / 86400000
    return diffDays >= 0 && diffDays <= 7 && b.quantity > 0
  })
  const expiring30Batches = allBatches.filter((b) => {
    const diffDays = (new Date(b.expiryDate).getTime() - nowMs) / 86400000
    return diffDays > 7 && diffDays <= 30 && b.quantity > 0
  })

  const expiredValue = expiredBatches.reduce((sum, b) => sum + b.quantity * (b.costPerUnit || 0), 0)
  const expiring7Value = expiring7Batches.reduce((sum, b) => sum + b.quantity * (b.costPerUnit || 0), 0)
  const expiring30Value = expiring30Batches.reduce((sum, b) => sum + b.quantity * (b.costPerUnit || 0), 0)
  const totalExpiryValue = expiredValue + expiring7Value + expiring30Value

  const topExpired = [...expiredBatches]
    .sort((a, b) => (b.quantity * (b.costPerUnit || 0)) - (a.quantity * (a.costPerUnit || 0)))
    .slice(0, 5)

  const lowStock: MedicineItem[] = []
  const outOfStock: MedicineItem[] = []

  for (const m of allMedicines) {
    const stock = Number(m.totalStock) || 0
    if (stock <= 0) {
      outOfStock.push(m)
    } else if (m.isLowStock) {
      lowStock.push(m)
    }
  }

  return {
    expiredBatches,
    expiring7Batches,
    expiring30Batches,
    expiredValue,
    expiring7Value,
    expiring30Value,
    totalExpiryValue,
    topExpired,
    lowStock,
    outOfStock
  }
}