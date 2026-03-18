import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Clinic:Appointments')

export function registerAppointmentHandlers(prisma: any) {
  // ─── Get appointments with optional filters ───────────────────────────────
  ipcMain.handle('clinic:appointments:getAll', async (_e, params?: {
    date?: string; from?: string; to?: string; status?: string; patientId?: string
  }) => {
    try {
      const where: any = {}
      if (params?.patientId) where.patientId = params.patientId
      if (params?.status)    where.status    = params.status
      if (params?.date) {
        const d = new Date(params.date); d.setHours(0, 0, 0, 0)
        const end = new Date(d); end.setDate(d.getDate() + 1)
        where.appointmentDate = { gte: d, lt: end }
      } else if (params?.from || params?.to) {
        where.appointmentDate = {}
        if (params.from) where.appointmentDate.gte = new Date(params.from)
        if (params.to)   where.appointmentDate.lte = new Date(params.to)
      }
      return await prisma.clinicAppointment.findMany({
        where,
        include: { patient: { select: { id: true, name: true, phone: true, bloodType: true } } },
        orderBy: { appointmentDate: 'asc' }
      })
    } catch (err) { log.error('getAll error', err); throw err }
  })

  // ─── Get today's appointments ────────────────────────────────────────────
  ipcMain.handle('clinic:appointments:getToday', async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      return await prisma.clinicAppointment.findMany({
        where: { appointmentDate: { gte: today, lt: tomorrow } },
        include: { patient: { select: { id: true, name: true, phone: true } } },
        orderBy: { appointmentDate: 'asc' }
      })
    } catch (err) { log.error('getToday error', err); throw err }
  })

  // ─── Get upcoming appointments (next N days) ──────────────────────────────
  ipcMain.handle('clinic:appointments:getUpcoming', async (_e, days = 7) => {
    try {
      const now = new Date()
      const end = new Date(now); end.setDate(now.getDate() + days)
      return await prisma.clinicAppointment.findMany({
        where: { appointmentDate: { gte: now, lte: end }, status: { in: ['scheduled', 'confirmed'] } },
        include: { patient: { select: { id: true, name: true, phone: true } } },
        orderBy: { appointmentDate: 'asc' }
      })
    } catch (err) { log.error('getUpcoming error', err); throw err }
  })

  // ─── Get follow-up reminders (sessions with followUpDate = today or overdue) ─
  ipcMain.handle('clinic:appointments:getFollowUpReminders', async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 7)

      const [todayFU, overdueFU] = await Promise.all([
        prisma.clinicSession.findMany({
          where: { followUpDate: { gte: today, lt: tomorrow }, status: 'completed' },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' }
        }),
        prisma.clinicSession.findMany({
          where: { followUpDate: { gte: weekAgo, lt: today }, status: 'completed' },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'desc' },
          take: 15
        })
      ])
      return { today: todayFU, overdue: overdueFU }
    } catch (err) { log.error('getFollowUpReminders error', err); throw err }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:appointments:create', async (_e, data: any) => {
    try {
      return await prisma.clinicAppointment.create({
        data: { ...data, appointmentDate: new Date(data.appointmentDate) },
        include: { patient: { select: { id: true, name: true, phone: true } } }
      })
    } catch (err) { log.error('create error', err); throw err }
  })

  // ─── Update ───────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:appointments:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      const d = { ...data }
      if (d.appointmentDate) d.appointmentDate = new Date(d.appointmentDate)
      return await prisma.clinicAppointment.update({
        where: { id },
        data: d,
        include: { patient: { select: { id: true, name: true, phone: true } } }
      })
    } catch (err) { log.error('update error', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:appointments:delete', async (_e, id: string) => {
    try {
      await prisma.clinicAppointment.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete error', err); throw err }
  })
}
