import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Appointments')

export function registerVetAppointmentHandlers(prisma: any) {
  // ─── Get All ──────────────────────────────────────────────────────────────
  ipcMain.handle('vet:appointments:getAll', async (_e, params?: {
    date?: string; from?: string; to?: string; status?: string
    patientId?: string; type?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.patientId) where.patientId = params.patientId
      if (params?.status)    where.status    = params.status
      if (params?.type)      where.type      = params.type
      if (params?.date) {
        const d   = new Date(params.date + 'T00:00:00')
        const end = new Date(params.date + 'T23:59:59.999')
        where.appointmentDate = { gte: d, lte: end }
      } else if (params?.from || params?.to) {
        where.appointmentDate = {}
        if (params.from) where.appointmentDate.gte = new Date(params.from)
        if (params.to)   where.appointmentDate.lte = new Date(params.to)
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetAppointment.count({ where })
      const data  = await prisma.vetAppointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true, name: true, species: true,
              owner: { select: { id: true, name: true, phone: true } }
            }
          }
        },
        orderBy: { appointmentDate: 'asc' },
        skip,
        take
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Check Slot Availability ──────────────────────────────────────────────
  ipcMain.handle('vet:appointments:checkSlot', async (_e, params: {
    appointmentDate: string; duration?: number; excludeId?: string
  }) => {
    try {
      const start    = new Date(params.appointmentDate)
      const duration = params.duration ?? 30
      const end      = new Date(start.getTime() + duration * 60_000)

      const conflicts = await prisma.vetAppointment.findMany({
        where: {
          id:     params.excludeId ? { not: params.excludeId } : undefined,
          status: { notIn: ['cancelled', 'no_show'] },
          AND: [
            { appointmentDate: { lt: end } },
            {
              appointmentDate: {
                gt: new Date(start.getTime() - 30 * 60_000)
              }
            }
          ]
        },
        select: { id: true, appointmentDate: true, duration: true, patient: { select: { name: true } } }
      })
      return { available: conflicts.length === 0, conflicts }
    } catch (err) { log.error('checkSlot', err); throw err }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:appointments:create', async (_e, data: any) => {
    try {
      return await prisma.vetAppointment.create({
        data,
        include: { patient: { select: { id: true, name: true, species: true } } }
      })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Update ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:appointments:update', async (_e, id: string, data: any) => {
    try {
      return await prisma.vetAppointment.update({
        where: { id },
        data,
        include: { patient: { select: { id: true, name: true, species: true } } }
      })
    } catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:appointments:delete', async (_e, id: string) => {
    try {
      return await prisma.vetAppointment.delete({ where: { id } })
    } catch (err) { log.error('delete', err); throw err }
  })
}
