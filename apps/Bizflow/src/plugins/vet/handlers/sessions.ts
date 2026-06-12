import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Sessions')

export function registerVetSessionHandlers(prisma: any) {
  // ─── Get Recent Sessions ──────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:getRecent', async (_e, params?: {
    patientId?: string; filter?: 'today' | 'week' | 'month' | 'all'
    startDate?: string; endDate?: string; skip?: number; take?: number
    vetName?: string
  }) => {
    try {
      const now = new Date()
      let dateFrom: Date | undefined
      let dateTo:   Date | undefined

      if (params?.startDate) {
        dateFrom = new Date(params.startDate)
      } else if (params?.filter === 'today') {
        const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate()
        dateFrom = new Date(y, mo, d, 0, 0, 0, 0)
        dateTo   = new Date(y, mo, d, 23, 59, 59, 999)
      } else if (params?.filter === 'week') {
        dateFrom = new Date(now)
        dateFrom.setDate(now.getDate() - 7)
      } else if (params?.filter === 'month') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      }
      if (params?.endDate) dateTo = new Date(params.endDate)

      const where: any = {}
      if (params?.patientId) where.patientId = params.patientId
      if (params?.vetName)   where.vetName   = params.vetName
      if (dateFrom || dateTo) {
        where.visitDate = {}
        if (dateFrom) where.visitDate.gte = dateFrom
        if (dateTo)   where.visitDate.lte = dateTo
      }

      const skip  = params?.skip  ?? 0
      const take  = params?.take  ?? 50
      const total = await prisma.vetSession.count({ where })
      const data  = await prisma.vetSession.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true, name: true, species: true,
              owner: { select: { id: true, name: true, phone: true } }
            }
          },
          prescriptions: { orderBy: { createdAt: 'asc' } }
        },
        orderBy: { visitDate: 'desc' },
        skip,
        take
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getRecent', err); throw err }
  })

  // ─── Create (with nested prescriptions) ──────────────────────────────────
  ipcMain.handle('vet:sessions:create', async (_e, data: any) => {
    try {
      const { prescriptions, ...sessionData } = data
      return await prisma.vetSession.create({
        data: {
          ...sessionData,
          prescriptions: prescriptions?.length ? { create: prescriptions } : undefined
        },
        include: {
          prescriptions: true,
          patient: { select: { id: true, name: true, species: true } }
        }
      })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Update Session ───────────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:update', async (_e, id: string, data: any) => {
    try {
      const { prescriptions: _p, ...sessionData } = data
      return await prisma.vetSession.update({
        where: { id },
        data: sessionData,
        include: {
          prescriptions: true,
          patient: { select: { id: true, name: true, species: true } }
        }
      })
    } catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:delete', async (_e, id: string) => {
    try {
      return await prisma.vetSession.delete({ where: { id } })
    } catch (err) { log.error('delete', err); throw err }
  })

  // ─── Prescription: Add ────────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:addPrescription', async (_e, sessionId: string, data: any) => {
    try {
      return await prisma.vetPrescription.create({ data: { ...data, sessionId } })
    } catch (err) { log.error('addPrescription', err); throw err }
  })

  // ─── Prescription: Update ─────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:updatePrescription', async (_e, id: string, data: any) => {
    try {
      return await prisma.vetPrescription.update({ where: { id }, data })
    } catch (err) { log.error('updatePrescription', err); throw err }
  })

  // ─── Prescription: Stop ───────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:stopPrescription', async (_e, id: string, reason: string) => {
    try {
      return await prisma.vetPrescription.update({
        where: { id },
        data: { isActive: false, stoppedAt: new Date(), stopReason: reason }
      })
    } catch (err) { log.error('stopPrescription', err); throw err }
  })

  // ─── Prescription: Delete ─────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:deletePrescription', async (_e, id: string) => {
    try {
      return await prisma.vetPrescription.delete({ where: { id } })
    } catch (err) { log.error('deletePrescription', err); throw err }
  })

  // ─── Get Follow-Ups ───────────────────────────────────────────────────────
  ipcMain.handle('vet:sessions:getFollowUps', async (_e, params?: {
    from?: string; to?: string; skip?: number; take?: number
  }) => {
    try {
      const now  = new Date()
      const from = params?.from ? new Date(params.from) : now
      const to   = params?.to   ? new Date(params.to)   : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

      const where: any = {
        followUpDate: { gte: from, lte: to },
        status: 'completed'
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetSession.count({ where })
      const data  = await prisma.vetSession.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true, name: true, species: true,
              owner: { select: { name: true, phone: true } }
            }
          }
        },
        orderBy: { followUpDate: 'asc' },
        skip,
        take
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getFollowUps', err); throw err }
  })
}
