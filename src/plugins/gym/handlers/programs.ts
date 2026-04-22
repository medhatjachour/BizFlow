import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Programs')

const DAY_INCLUDE = { exercises: { orderBy: { order: 'asc' as const } } }
const FULL_INCLUDE = {
  coach: { select: { id: true, name: true } },
  days: { include: DAY_INCLUDE, orderBy: [{ weekNumber: 'asc' as const }, { dayNumber: 'asc' as const }] },
  assignments: {
    where: { isActive: true },
    include: { trainee: { select: { id: true, name: true, phone: true } } }
  }
}

export function registerGymProgramHandlers(prisma: any) {
  ipcMain.handle('gym:programs:getAll', async (_e, params?: { coachId?: string; isActive?: boolean }) => {
    try {
      const where: any = {}
      if (params?.coachId) where.coachId = params.coachId
      if (params?.isActive !== undefined) where.isActive = params.isActive
      return prisma.gymProgram.findMany({
        where,
        include: {
          coach: { select: { id: true, name: true } },
          _count: { select: { assignments: true, days: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:programs:getById', async (_e, id: string) => {
    try {
      return prisma.gymProgram.findUnique({ where: { id }, include: FULL_INCLUDE })
    } catch (err) { log.error('getById', err); throw err }
  })

  ipcMain.handle('gym:programs:create', async (_e, data: any) => {
    try {
      const { days: _d, assignments: _a, ...rest } = data
      return prisma.gymProgram.create({ data: rest, include: FULL_INCLUDE })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:programs:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      const { days: _d, assignments: _a, coach: _c, ...rest } = data
      return prisma.gymProgram.update({ where: { id }, data: rest, include: FULL_INCLUDE })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:programs:delete', async (_e, id: string) => {
    try {
      await prisma.gymProgram.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })

  // Day management
  ipcMain.handle('gym:programs:addDay', async (_e, { programId, data }: { programId: string; data: any }) => {
    try {
      return prisma.gymProgramDay.create({ data: { ...data, programId }, include: DAY_INCLUDE })
    } catch (err) { log.error('addDay', err); throw err }
  })

  ipcMain.handle('gym:programs:updateDay', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      const { exercises: _e, ...rest } = data
      return prisma.gymProgramDay.update({ where: { id }, data: rest, include: DAY_INCLUDE })
    } catch (err) { log.error('updateDay', err); throw err }
  })

  ipcMain.handle('gym:programs:deleteDay', async (_e, id: string) => {
    try {
      await prisma.gymProgramDay.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('deleteDay', err); throw err }
  })

  // Exercise management
  ipcMain.handle('gym:programs:addExercise', async (_e, { dayId, data }: { dayId: string; data: any }) => {
    try {
      return prisma.gymProgramExercise.create({ data: { ...data, dayId } })
    } catch (err) { log.error('addExercise', err); throw err }
  })

  ipcMain.handle('gym:programs:updateExercise', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      return prisma.gymProgramExercise.update({ where: { id }, data })
    } catch (err) { log.error('updateExercise', err); throw err }
  })

  ipcMain.handle('gym:programs:deleteExercise', async (_e, id: string) => {
    try {
      await prisma.gymProgramExercise.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('deleteExercise', err); throw err }
  })

  // Assignment management
  ipcMain.handle('gym:programs:assign', async (_e, { programId, traineeId, startDate, notes }: any) => {
    try {
      await prisma.gymProgramAssignment.updateMany({
        where: { traineeId, programId, isActive: true },
        data: { isActive: false }
      })
      return prisma.gymProgramAssignment.create({
        data: {
          programId, traineeId, notes,
          startDate: startDate ? new Date(startDate) : new Date(),
          isActive: true
        },
        include: { trainee: { select: { id: true, name: true } }, program: { select: { id: true, name: true } } }
      })
    } catch (err) { log.error('assign', err); throw err }
  })

  ipcMain.handle('gym:programs:unassign', async (_e, assignmentId: string) => {
    try {
      await prisma.gymProgramAssignment.update({
        where: { id: assignmentId },
        data: { isActive: false }
      })
      return { success: true }
    } catch (err) { log.error('unassign', err); throw err }
  })

  ipcMain.handle('gym:programs:getAssignments', async (_e, traineeId: string) => {
    try {
      return prisma.gymProgramAssignment.findMany({
        where: { traineeId },
        include: { program: { select: { id: true, name: true, goal: true, weeksTotal: true, daysPerWeek: true } } },
        orderBy: { createdAt: 'desc' }
      })
    } catch (err) { log.error('getAssignments', err); throw err }
  })
}
