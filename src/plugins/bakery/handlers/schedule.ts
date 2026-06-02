import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { convertQuantity } from '../utils/unitConversion'

const log = createLogger('Bakery:Schedule')

export function registerScheduleHandlers(prisma: any) {
  ipcMain.handle('bakery:getSchedule', async (_e, options: {
    startDate?: string
    endDate?: string
    status?: string
    recipeId?: string
    page?: number
    pageSize?: number
  } = {}) => {
    try {
      const page     = Math.max(1, options.page ?? 1)
      const pageSize = Math.min(5000, Math.max(1, options.pageSize ?? 20))
      const skip     = (page - 1) * pageSize

      const where: any = {}
      if (options.recipeId) where.recipeId = options.recipeId
      if (options.status) where.status = options.status
      if (options.startDate || options.endDate) {
        where.scheduledDate = {}
        if (options.startDate) where.scheduledDate.gte = new Date(options.startDate)
        if (options.endDate) where.scheduledDate.lte = new Date(options.endDate)
      }

      const [data, total] = await Promise.all([
        prisma.productionSchedule.findMany({
          where,
          include: { recipe: { select: { id: true, name: true, yieldQty: true, yieldUnit: true } } },
          // Newest first so recently added schedules are visible on first page.
          orderBy: { scheduledDate: 'desc' },
          skip,
          take: pageSize
        }),
        prisma.productionSchedule.count({ where })
      ])

      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
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
        include: { recipe: { select: { id: true, name: true, yieldQty: true, yieldUnit: true } } }
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

  ipcMain.handle('bakery:completeScheduleAndCreateBatch', async (_e, data: {
    id: string
    actualQuantity: number
    notes?: string
  }) => {
    try {
      const qty = Number(data.actualQuantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('actualQuantity must be greater than 0')
      }

      return await prisma.$transaction(async (tx: any) => {
        const schedule = await tx.productionSchedule.findUnique({
          where: { id: data.id },
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: { pantryIngredient: { select: { id: true, unit: true } } }
                }
              }
            }
          }
        })

        if (!schedule) throw new Error('Schedule item not found')
        if (schedule.status === 'cancelled') throw new Error('Cannot complete a cancelled schedule item')
        if (schedule.status === 'completed') throw new Error('Schedule item is already completed')

        const recipe = schedule.recipe
        const ingredientCostPerBatch = recipe.ingredients.reduce(
          (sum: number, ing: any) => sum + ing.quantity * ing.costPerUnit,
          0
        )
        const unitsProduced = qty * recipe.yieldQty
        const totalCost = ingredientCostPerBatch * qty
        const batchDate = new Date(schedule.scheduledDate)
        const expiresAt = recipe.expiryDays
          ? new Date(batchDate.getTime() + recipe.expiryDays * 86400000)
          : null

        for (const ing of recipe.ingredients) {
          if (ing.pantryIngredientId && ing.pantryIngredient) {
            const pantryUnit = ing.pantryIngredient.unit
            const deductQty = convertQuantity(ing.quantity * qty, ing.unit, pantryUnit)
              ?? (ing.quantity * qty)
            await tx.pantryIngredient.update({
              where: { id: ing.pantryIngredientId },
              data: { currentStock: { decrement: deductQty } }
            })
          }
        }

        const updatedSchedule = await tx.productionSchedule.update({
          where: { id: data.id },
          data: {
            status: 'completed',
            actualQuantity: qty,
            ...(data.notes !== undefined ? { notes: data.notes } : {})
          },
          include: { recipe: { select: { id: true, name: true, yieldQty: true, yieldUnit: true } } }
        })

        const batch = await tx.productionBatch.create({
          data: {
            recipeId: schedule.recipeId,
            quantity: qty,
            unitsProduced,
            totalCost,
            batchDate,
            expiresAt,
            notes: `From schedule ${schedule.id}${schedule.notes ? ` | ${schedule.notes}` : ''}`
          },
          include: {
            recipe: { select: { id: true, name: true, yieldUnit: true, expiryDays: true } }
          }
        })

        return { schedule: updatedSchedule, batch }
      })
    } catch (err) {
      log.error('bakery:completeScheduleAndCreateBatch error', err)
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
