import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Patients')

export function registerVetPatientHandlers(prisma: any) {
  // ─── Get All Patients ────────────────────────────────────────────────────
  ipcMain.handle('vet:patients:getAll', async (_e, params?: {
    search?: string; species?: string; skip?: number; take?: number
  }) => {
    try {
      const conditions: any[] = []
      if (params?.search) {
        conditions.push({
          OR: [
            { name: { contains: params.search } },
            { microchipId: { contains: params.search } },
            { owner: { name: { contains: params.search } } },
            { owner: { phone: { contains: params.search } } }
          ]
        })
      }
      if (params?.species) conditions.push({ species: params.species })
      const where = conditions.length ? { AND: conditions } : undefined

      const skip = params?.skip ?? 0
      const take = params?.take ?? 40
      const total = await prisma.vetPatient.count({ where })

      const patients = await prisma.vetPatient.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, phone: true } },
          _count: { select: { sessions: true } },
          sessions: {
            orderBy: { visitDate: 'desc' },
            take: 1,
            select: { visitDate: true, paymentStatus: true, visitType: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })

      if (patients.length === 0) return { data: [], total, hasMore: false }

      // Finance summary via raw SQL (minimise round-trips)
      const patientIds = patients.map((p: any) => p.id)
      const financeSummaries = await prisma.$queryRawUnsafe(`
        SELECT
          patientId,
          COALESCE(SUM(amountCharged), 0) as totalCharged,
          COALESCE(SUM(amountPaid),    0) as totalPaid
        FROM VetSession
        WHERE patientId IN (${patientIds.map(() => '?').join(',')})
        GROUP BY patientId
      `, ...patientIds) as any[]

      const financeMap: Record<string, { totalCharged: number; totalPaid: number; outstanding: number }> = {}
      for (const f of financeSummaries) {
        financeMap[f.patientId] = {
          totalCharged: Number(f.totalCharged) || 0,
          totalPaid:    Number(f.totalPaid)    || 0,
          outstanding:  (Number(f.totalCharged) || 0) - (Number(f.totalPaid) || 0)
        }
      }

      const data = patients.map((p: any) => ({
        ...p,
        finance: financeMap[p.id] ?? { totalCharged: 0, totalPaid: 0, outstanding: 0 }
      }))

      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Get Debtors ──────────────────────────────────────────────────────────
  ipcMain.handle('vet:patients:getDebtors', async (_e, params?: { skip?: number; take?: number }) => {
    try {
      const skip = params?.skip ?? 0
      const take = params?.take ?? 40

      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          p.id, p.name, p.species, p.breed, p.microchipId,
          o.name as ownerName, o.phone as ownerPhone,
          COALESCE(SUM(s.amountCharged), 0) - COALESCE(SUM(s.amountPaid), 0) as outstanding
        FROM VetPatient p
        JOIN VetOwner o ON o.id = p.ownerId
        JOIN VetSession s ON s.patientId = p.id
        GROUP BY p.id
        HAVING outstanding > 0
        ORDER BY outstanding DESC
        LIMIT ? OFFSET ?
      `, take, skip) as any[]

      const countRows = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as cnt FROM (
          SELECT p.id
          FROM VetPatient p
          JOIN VetSession s ON s.patientId = p.id
          GROUP BY p.id
          HAVING COALESCE(SUM(s.amountCharged), 0) - COALESCE(SUM(s.amountPaid), 0) > 0
        )
      `) as any[]

      const total = Number(countRows[0]?.cnt) || 0
      const data  = rows.map((r: any) => ({
        ...r,
        outstanding: Number(r.outstanding) || 0
      }))
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getDebtors', err); throw err }
  })

  // ─── Get by ID ────────────────────────────────────────────────────────────
  ipcMain.handle('vet:patients:getById', async (_e, id: string) => {
    try {
      const patient = await prisma.vetPatient.findUnique({
        where: { id },
        include: {
          owner: true,
          sessions: {
            include: { prescriptions: true },
            orderBy: { visitDate: 'desc' }
          },
          appointments: { orderBy: { appointmentDate: 'desc' }, take: 20 },
          checkResults: { orderBy: { resultDate: 'desc' } }
        }
      })
      if (!patient) return null

      // Finance totals
      const rows = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(amountCharged),0) as tc, COALESCE(SUM(amountPaid),0) as tp
        FROM VetSession WHERE patientId = ?
      `, id) as any[]

      const totalCharged = Number(rows[0]?.tc) || 0
      const totalPaid    = Number(rows[0]?.tp) || 0
      return { ...patient, finance: { totalCharged, totalPaid, outstanding: totalCharged - totalPaid } }
    } catch (err) { log.error('getById', err); throw err }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:patients:create', async (_e, data: any) => {
    try {
      return await prisma.vetPatient.create({ data, include: { owner: { select: { id: true, name: true } } } })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Update ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:patients:update', async (_e, id: string, data: any) => {
    try {
      return await prisma.vetPatient.update({ where: { id }, data, include: { owner: { select: { id: true, name: true } } } })
    } catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:patients:delete', async (_e, id: string) => {
    try {
      return await prisma.vetPatient.delete({ where: { id } })
    } catch (err) { log.error('delete', err); throw err }
  })
}
