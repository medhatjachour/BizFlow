import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { SQL_COGS, SQL_NET_REVENUE } from './saleMath'

const log = createLogger('Vet:Stats:Overview')

export function registerVetStatsOverviewHandlers(prisma: any) {
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
            COALESCE(SUM(${SQL_NET_REVENUE}), 0)                      as medicineRevenue,
            COALESCE(SUM(${SQL_COGS}), 0)                             as medicineCost
          FROM VetMedicineSale s
          JOIN VetMedicineBatch b ON s.batchId = b.id
          JOIN VetMedicine m      ON s.medicineId = m.id
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
}
