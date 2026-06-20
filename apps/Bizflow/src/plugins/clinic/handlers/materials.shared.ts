/**
 * Shared helpers for the clinic materials handlers.
 * Extracted from materials.ts so each resource module can import them.
 */

// ─── Period helpers ────────────────────────────────────────────────────────────
export function matGetPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0); break
    case 'week': {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      start.setDate(now.getDate() - dow); start.setHours(0, 0, 0, 0); break
    }
    case 'month':
      start.setDate(1); start.setHours(0, 0, 0, 0); break
    case 'year':
      start.setMonth(0, 1); start.setHours(0, 0, 0, 0); break
    default:
      start.setDate(1); start.setHours(0, 0, 0, 0)
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

/** Sync material.expiryDate to the nearest active-batch expiry. */
export async function syncMaterialExpiry(tx: any, materialId: string) {
  const batches = await tx.clinicMaterialBatch.findMany({
    where: { materialId, isActive: true, expiryDate: { not: null } },
    orderBy: { expiryDate: 'asc' },
  })
  const nearestExpiry: Date | null = batches[0]?.expiryDate ?? null
  await tx.clinicMaterial.update({
    where: { id: materialId },
    data: { expiryDate: nearestExpiry },
  })
}
