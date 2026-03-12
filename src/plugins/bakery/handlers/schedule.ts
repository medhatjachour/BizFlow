import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Schedule')

export function registerScheduleHandlers(prisma: any) {
  ipcMain.handle('bakery:getSchedule', async (_e, options: {
    startDate?: string
    endDate?: string
    status?: string
    recipeId?: string
  } = {}) => {
    try {
      const where: any = {}
      if (options.recipeId) where.recipeId = options.recipeId
      if (options.status) where.status = options.status
      if (options.startDate || options.endDate) {
        where.scheduledDate = {}
        if (options.startDate) where.scheduledDate.gte = new Date(options.startDate)
        if (options.endDate) where.scheduledDate.lte = new Date(options.endDate)
      }
      return await prisma.productionSchedule.findMany({
        where,
        include: { recipe: { select: { id: true, name: true, yieldQty: true, yieldUnit: true } } },
        orderBy: { scheduledDate: 'asc' }
      })
    } catch (err) {
      log.error('bakery:getSchedule error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:createScheduleItem', async (_e, data: {
    recipeId: string
    scheduledDate: string
    plannedQuantity: number
    notes?: string
  }) => {
    try {
      return await prisma.productionSchedule.create({
        data: {
          recipeId: data.recipeId,
          scheduledDate: new Date(data.scheduledDate),
          plannedQuantity: data.plannedQuantity,
          notes: data.notes ?? null,
          status: 'planned'
        },
        include: { recipe: { select: { id: true, name: true } } }
      })
    } catch (err) {
      log.error('bakery:createScheduleItem error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:updateScheduleItem', async (_e, data: {
    id: string
    status?: 'planned' | 'in-progress' | 'completed' | 'cancelled'
    actualQuantity?: number
    plannedQuantity?: number
    scheduledDate?: string
    notes?: string
  }) => {
    try {
      const { id, scheduledDate, ...fields } = data
      return await prisma.productionSchedule.update({
        where: { id },
        data: {
          ...fields,
          ...(scheduledDate && { scheduledDate: new Date(scheduledDate) })
        },
        include: { recipe: { select: { id: true, name: true } } }
      })
    } catch (err) {
      log.error('bakery:updateScheduleItem error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:deleteScheduleItem', async (_e, id: string) => {
    try {
      return await prisma.productionSchedule.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:deleteScheduleItem error', err)
      throw err
    }
  })
}
