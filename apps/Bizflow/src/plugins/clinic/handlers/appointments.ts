import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Clinic:Appointments')

function parseWorkingHours(raw: string | null | undefined): Record<string, { start?: string; end?: string; off?: boolean }> | null {
  if (!raw) return null
  try { const p = JSON.parse(raw); return typeof p === 'object' && p ? p : null } catch { return null }
}

export function registerAppointmentHandlers(prisma: any) {
  // ─── Get appointments with optional filters ───────────────────────────────
  // PAGINATION: Returns { data: Appointment[], total: number, hasMore: boolean }
  ipcMain.handle('clinic:appointments:getAll', async (_e, params?: {
    date?: string; from?: string; to?: string; status?: string; patientId?: string; type?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.patientId) where.patientId = params.patientId
      if (params?.status)    where.status    = params.status
      if (params?.type)      where.type      = params.type
      if ((params as any)?.doctorId) where.doctorId = (params as any).doctorId
      if (params?.date) {
        // Use T00:00:00 suffix to force local-time parsing (avoids UTC-midnight shift)
        const d   = new Date(params.date + 'T00:00:00')
        const end = new Date(params.date + 'T23:59:59.999')
        where.appointmentDate = { gte: d, lte: end }
      } else if (params?.from || params?.to) {
        where.appointmentDate = {}
        if (params.from) where.appointmentDate.gte = new Date(params.from)
        if (params.to)   where.appointmentDate.lte = new Date(params.to)
      }

      // Pagination defaults
      const skip = params?.skip ?? 0
      const take = params?.take ?? 50

      // Get total count
      const total = await prisma.clinicAppointment.count({ where })

      const data = await prisma.clinicAppointment.findMany({
        where,
        include: { patient: { select: { id: true, name: true, phone: true, bloodType: true } } },
        orderBy: { appointmentDate: 'asc' },
        skip,
        take
      })

      return {
        data,
        total,
        hasMore: skip + take < total
      }
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
          where: { followUpDate: { gte: today, lt: tomorrow }, status: { not: 'completed' } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' }
        }),
        prisma.clinicSession.findMany({
          where: { followUpDate: { gte: weekAgo, lt: today }, status: { not: 'completed' } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'desc' },
          take: 15
        })
      ])
      return { today: todayFU, overdue: overdueFU }
    } catch (err) { log.error('getFollowUpReminders error', err); throw err }
  })

  // ─── Get ALL follow-up reminders (with filter) ─────────────────────────────
  ipcMain.handle('clinic:appointments:getAllFollowUps', async (_e, params?: {
    filter?: 'all' | 'today' | 'overdue' | 'upcoming'
  }) => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      // followUpDate != null means the doctor set a follow-up; cleared reminders
      // have followUpDate set to null. Session status is irrelevant here — a
      // "completed" session can still have an outstanding follow-up date.
      const base = { followUpDate: { not: null } } as const

      if (params?.filter === 'today') {
        return await prisma.clinicSession.findMany({
          where: { ...base, followUpDate: { gte: today, lt: tomorrow } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' },
        })
      }
      if (params?.filter === 'overdue') {
        return await prisma.clinicSession.findMany({
          where: { ...base, followUpDate: { lt: today } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' },
          take: 500,
        })
      }
      if (params?.filter === 'upcoming') {
        return await prisma.clinicSession.findMany({
          where: { ...base, followUpDate: { gte: tomorrow } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' },
          take: 500,
        })
      }

      // 'all' — fetch each bucket separately so the per-bucket take limits work
      // correctly, then merge and sort by followUpDate for consistent display.
      const [overdue, dueToday, upcoming] = await Promise.all([
        prisma.clinicSession.findMany({
          where: { ...base, followUpDate: { lt: today } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' },
          take: 200,
        }),
        prisma.clinicSession.findMany({
          where: { ...base, followUpDate: { gte: today, lt: tomorrow } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' },
        }),
        prisma.clinicSession.findMany({
          where: { ...base, followUpDate: { gte: tomorrow } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { followUpDate: 'asc' },
          take: 300,
        }),
      ])
      return [...overdue, ...dueToday, ...upcoming]
    } catch (err) { log.error('getAllFollowUps error', err); throw err }
  })

  // ─── Clear follow-up (mark done) ─────────────────────────────────────────
  ipcMain.handle('clinic:sessions:clearFollowUp', async (_e, sessionId: string) => {
    try {
      return await prisma.clinicSession.update({
        where: { id: sessionId },
        data: { followUpDate: null }
      })
    } catch (err) { log.error('clearFollowUp error', err); throw err }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:appointments:create', async (_e, data: any) => {
    try {
      const start = new Date(data.appointmentDate)
      const dur = Number(data.duration) || 30
      const end = new Date(start.getTime() + dur * 60000)

      // Working-hours check: block booking on a day the doctor marked as off.
      if (data.doctorId) {
        const doc = await prisma.clinicStaff.findUnique({
          where: { id: data.doctorId },
          select: { name: true, workingHours: true }
        })
        const wh = parseWorkingHours(doc?.workingHours)
        if (wh) {
          const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][start.getDay()]
          if (wh[dayKey]?.off) {
            throw new Error(`${doc?.name ?? 'This doctor'} is not available on that day`)
          }
        }
      }

      // Guard: block a double-booking for the SAME doctor at an overlapping time.
      // Prefer the linked doctorId; fall back to the legacy free-text doctorName.
      const doctorWhere = data.doctorId
        ? { doctorId: data.doctorId }
        : data.doctorName ? { doctorName: data.doctorName } : null
      if (doctorWhere) {
        const sameDoc = await prisma.clinicAppointment.findMany({
          where: {
            ...doctorWhere,
            status: { in: ['scheduled', 'confirmed'] },
            appointmentDate: { gte: new Date(start.getTime() - 12 * 3600000), lte: new Date(end.getTime() + 12 * 3600000) }
          },
          select: { appointmentDate: true, duration: true }
        })
        const clash = sameDoc.some(a => {
          const aStart = new Date(a.appointmentDate).getTime()
          const aEnd = aStart + (Number(a.duration) || 30) * 60000
          return aStart < end.getTime() && aEnd > start.getTime()
        })
        if (clash) {
          const who = data.doctorName || 'That doctor'
          throw new Error(`${who} already has an appointment during that time`)
        }
      }
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
