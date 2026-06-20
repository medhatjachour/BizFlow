import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Stats:Clinical')

export function registerVetStatsClinicalHandlers(prisma: any) {
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
        SELECT visitType,
               COUNT(*) as cnt,
               COALESCE(SUM(amountCharged), 0) as revenue,
               COALESCE(SUM(amountPaid), 0)    as collected
        FROM VetSession WHERE visitDate >= ? AND visitDate <= ?
        GROUP BY visitType
        ORDER BY cnt DESC
      `, from, to) as any[]

      return rows.map((r: any) => {
        const count = Number(r.cnt)
        const revenue = Number(r.revenue)
        return {
          visitType: r.visitType,
          count,
          revenue,
          collected: Number(r.collected),
          avg: count > 0 ? revenue / count : 0,
        }
      })
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
