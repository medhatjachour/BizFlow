import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Lockers')

const INCLUDE = {
  assignments: {
    where: { isActive: true },
    include: { trainee: { select: { id: true, name: true, phone: true } } }
  }
}

export function registerGymLockerHandlers(prisma: any) {
  ipcMain.handle('gym:lockers:getAll', async (_e, params?: { zone?: string }) => {
    try {
      const where: any = {}
      if (params?.zone) where.zone = params.zone
      return prisma.gymLocker.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ zone: 'asc' }, { number: 'asc' }]
      })
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:lockers:create', async (_e, data: any) => {
    try {
      return prisma.gymLocker.create({ data, include: INCLUDE })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:lockers:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      return prisma.gymLocker.update({ where: { id }, data, include: INCLUDE })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:lockers:delete', async (_e, id: string) => {
    try {
      await prisma.gymLocker.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })

  ipcMain.handle('gym:lockers:assign', async (_e, { lockerId, traineeId, endDate, notes }: any) => {
    try {
      // Deactivate any existing active assignment for this locker
      await prisma.gymLockerAssignment.updateMany({
        where: { lockerId, isActive: true },
        data: { isActive: false }
      })
      const assignment = await prisma.gymLockerAssignment.create({
        data: {
          lockerId,
          traineeId,
          endDate: endDate ? new Date(endDate) : undefined,
          isActive: true,
          notes
        },
        include: { trainee: { select: { id: true, name: true, phone: true } } }
      })
      return prisma.gymLocker.findUnique({ where: { id: lockerId }, include: INCLUDE })
    } catch (err) { log.error('assign', err); throw err }
  })

  ipcMain.handle('gym:lockers:unassign', async (_e, lockerId: string) => {
    try {
      await prisma.gymLockerAssignment.updateMany({
        where: { lockerId, isActive: true },
        data: { isActive: false, endDate: new Date() }
      })
      return prisma.gymLocker.findUnique({ where: { id: lockerId }, include: INCLUDE })
    } catch (err) { log.error('unassign', err); throw err }
  })
}
