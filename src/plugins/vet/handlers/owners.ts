import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Owners')

export function registerOwnerHandlers(prisma: any) {
  // ─── Get All ─────────────────────────────────────────────────────────────
  ipcMain.handle('vet:owners:getAll', async (_e, params?: { search?: string; skip?: number; take?: number }) => {
    try {
      const where = params?.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { phone: { contains: params.search } },
              { email: { contains: params.search } }
            ]
          }
        : undefined

      const skip = params?.skip ?? 0
      const take = params?.take ?? 40
      const total = await prisma.vetOwner.count({ where })
      const data  = await prisma.vetOwner.findMany({
        where,
        include: {
          patients: {
            select: { id: true, name: true, species: true, breed: true },
            orderBy: { createdAt: 'asc' }
          },
          _count: { select: { patients: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Search Lite (for autocomplete) ──────────────────────────────────────
  ipcMain.handle('vet:owners:searchLite', async (_e, query: string) => {
    if (!query?.trim()) return []
    return prisma.vetOwner.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } }
        ]
      },
      select: { id: true, name: true, phone: true },
      take: 20
    })
  })

  // ─── Get by ID ────────────────────────────────────────────────────────────
  ipcMain.handle('vet:owners:getById', async (_e, id: string) => {
    try {
      return await prisma.vetOwner.findUnique({
        where: { id },
        include: {
          patients: {
            include: { _count: { select: { sessions: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    } catch (err) { log.error('getById', err); throw err }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:owners:create', async (_e, data: any) => {
    try {
      return await prisma.vetOwner.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Update ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:owners:update', async (_e, id: string, data: any) => {
    try {
      return await prisma.vetOwner.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:owners:delete', async (_e, id: string) => {
    try {
      return await prisma.vetOwner.delete({ where: { id } })
    } catch (err) { log.error('delete', err); throw err }
  })

  // ─── Get Finance Summary ──────────────────────────────────────────────────
  ipcMain.handle('vet:owners:getFinance', async (_e, ownerId: string) => {
    try {
      const patients = await prisma.vetPatient.findMany({
        where: { ownerId },
        select: { id: true }
      })
      const patientIds = patients.map((p: any) => p.id)
      if (!patientIds.length) return { totalCharged: 0, totalPaid: 0, outstanding: 0 }
      const sessions = await prisma.vetSession.findMany({
        where: { patientId: { in: patientIds } },
        select: { amountCharged: true, amountPaid: true }
      })
      const totalCharged = sessions.reduce((s: number, r: any) => s + (r.amountCharged ?? 0), 0)
      const totalPaid    = sessions.reduce((s: number, r: any) => s + (r.amountPaid    ?? 0), 0)
      return { totalCharged, totalPaid, outstanding: totalCharged - totalPaid }
    } catch (err) { log.error('getFinance', err); throw err }
  })
}
