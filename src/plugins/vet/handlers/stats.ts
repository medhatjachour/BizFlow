import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Stats')

export function registerVetStatsHandlers(prisma: any) {
  // ─── Overview KPIs ────────────────────────────────────────────────────────
  ipcMain.handle('vet:stats:overview', async (_e, period?: 'today' | 'week' | 'month' | 'year') => {
    try {
      const now   = new Date()
      const start = new Date(now)
      switch (period ?? 'month') {
        case 'today':
          start.setHours(0, 0, 0, 0)
          break
        case 'week':
          start.setDate(now.getDate() - 7)
          start.setHours(0, 0, 0, 0)
          break
        case 'month':
          start.setDate(1)
          start.setHours(0, 0, 0, 0)
          break
        case 'year':
          start.setMonth(0, 1)
          start.setHours(0, 0, 0, 0)
          break
      }

      const [totalPatients, newPatients, sessionRows, outstandingRows, upcomingAppts, medSaleRows] = await Promise.all([
        prisma.vetPatient.count(),
        prisma.vetPatient.count({ where: { createdAt: { gte: start } } }),
        prisma.$queryRawUnsafe(`
          SELECT
            COUNT(*) as sessionCount,
            COALESCE(SUM(amountCharged),0) as revenue,
            COALESCE(SUM(amountPaid),0) as collected
          FROM VetSession
          WHERE visitDate >= ?
        `, start) as Promise<any[]>,
        prisma.$queryRawUnsafe(`
          SELECT COALESCE(SUM(amountCharged),0) - COALESCE(SUM(amountPaid),0) as outstanding
          FROM VetSession WHERE paymentStatus NOT IN ('paid','waived')
        `) as Promise<any[]>,
        prisma.vetAppointment.count({
          where: {
            appointmentDate: { gte: now },
            status: { in: ['scheduled', 'confirmed'] }
          }
        }),
        prisma.$queryRawUnsafe(`
          SELECT
            COUNT(*)                                                  as saleCount,
            COALESCE(SUM(s.totalPrice), 0)                           as medicineRevenue,
            COALESCE(SUM(s.quantity * b.costPerUnit), 0)             as medicineCost
          FROM VetMedicineSale s
          JOIN VetMedicineBatch b ON s.batchId = b.id
          WHERE s.saleDate >= ?
        `, start) as Promise<any[]>,
      ])

      const medicineRevenue = Number(medSaleRows[0]?.medicineRevenue) || 0
      const medicineCost    = Number(medSaleRows[0]?.medicineCost)    || 0

      return {
        totalPatients,
        newPatients,
        sessionCount:    Number(sessionRows[0]?.sessionCount)      || 0,
        revenue:         Number(sessionRows[0]?.revenue)            || 0,
        collected:       Number(sessionRows[0]?.collected)          || 0,
        outstanding:     Number(outstandingRows[0]?.outstanding)    || 0,
        upcomingAppts,
        medicineRevenue,
        medicineCost,
        medicineProfit:  medicineRevenue - medicineCost,
        medicineSales:   Number(medSaleRows[0]?.saleCount)         || 0,
      }
    } catch (err) { log.error('overview', err); throw err }
  })

  // ─── Top Diagnoses ────────────────────────────────────────────────────────
  ipcMain.handle('vet:stats:topDiagnoses', async (_e, params?: { limit?: number; from?: string }) => {
    try {
      const limit = params?.limit ?? 10
      const from  = params?.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)

      const rows = await prisma.$queryRawUnsafe(`
        SELECT diagnosis, COUNT(*) as cnt
        FROM VetSession
        WHERE diagnosis IS NOT NULL AND diagnosis != '' AND visitDate >= ?
        GROUP BY diagnosis
        ORDER BY cnt DESC
        LIMIT ?
      `, from, limit) as any[]

      return rows.map((r: any) => ({ diagnosis: r.diagnosis, count: Number(r.cnt) }))
    } catch (err) { log.error('topDiagnoses', err); throw err }
  })

  // ─── Visit Type Breakdown ─────────────────────────────────────────────────
  ipcMain.handle('vet:stats:visitTrend', async (_e, params?: { from?: string; to?: string }) => {
    try {
      const now  = new Date()
      const from = params?.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const to   = params?.to   ? new Date(params.to)   : now

      const rows = await prisma.$queryRawUnsafe(`
        SELECT visitType, COUNT(*) as cnt
        FROM VetSession WHERE visitDate >= ? AND visitDate <= ?
        GROUP BY visitType
        ORDER BY cnt DESC
      `, from, to) as any[]

      return rows.map((r: any) => ({ visitType: r.visitType, count: Number(r.cnt) }))
    } catch (err) { log.error('visitTrend', err); throw err }
  })

  // ─── Species Breakdown ────────────────────────────────────────────────────
  ipcMain.handle('vet:stats:speciesBreakdown', async () => {
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT species, COUNT(*) as cnt FROM VetPatient GROUP BY species ORDER BY cnt DESC
      `) as any[]
      return rows.map((r: any) => ({ species: r.species, count: Number(r.cnt) }))
    } catch (err) { log.error('speciesBreakdown', err); throw err }
  })

  // ─── Monthly Revenue Trend ────────────────────────────────────────────────
  ipcMain.handle('vet:stats:monthlyTrend', async (_e, params?: { months?: number }) => {
    try {
      const months = params?.months ?? 6
      const rows   = await prisma.$queryRawUnsafe(`
        SELECT
          strftime('%Y-%m', visitDate) as ym,
          COALESCE(SUM(amountCharged),0) as revenue,
          COALESCE(SUM(amountPaid),0) as collected,
          COUNT(*) as sessions
        FROM VetSession
        WHERE visitDate >= date('now', '-' || ? || ' months')
        GROUP BY ym
        ORDER BY ym ASC
      `, months) as any[]

      return rows.map((r: any) => ({
        month:     r.ym,
        revenue:   Number(r.revenue)   || 0,
        collected: Number(r.collected) || 0,
        sessions:  Number(r.sessions)  || 0
      }))
    } catch (err) { log.error('monthlyTrend', err); throw err }
  })
}
