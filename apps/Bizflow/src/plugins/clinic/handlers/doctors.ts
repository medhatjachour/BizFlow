/**
 * Clinic Doctors IPC Handlers
 *
 * A "doctor" is a ClinicStaff row with role='doctor'. This module adds the
 * doctor-centric read models the UI needs on top of the generic staff CRUD
 * (create/update/delete live in staff.ts):
 *
 *   clinic:doctors:list          – doctors + live status + today's load + next appt
 *   clinic:doctors:setDefault    – mark one doctor as the clinic default (unsets others)
 *   clinic:doctors:getProfile    – full profile: KPIs, schedule, recent activity, finance
 *   clinic:doctors:availability:set – persist a doctor's weekly working hours (JSON)
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Clinic:Doctors')

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function parseWorkingHours(raw: string | null | undefined): Record<string, { start?: string; end?: string; off?: boolean }> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : null
  } catch {
    return null
  }
}

/** Derive a live presence status for a doctor from schedule + current appointments. */
function computeLiveStatus(
  staff: any,
  currentAppt: any | undefined,
  now: Date
): 'inactive' | 'on_leave' | 'off' | 'busy' | 'available' {
  if (staff.status === 'inactive') return 'inactive'
  if (staff.status === 'on_leave') return 'on_leave'
  const wh = parseWorkingHours(staff.workingHours)
  if (wh) {
    const dayKey = DAY_KEYS[now.getDay()]
    const today = wh[dayKey]
    if (today?.off) return 'off'
  }
  if (currentAppt) return 'busy'
  return 'available'
}

export function registerClinicDoctorHandlers(prisma: any) {
  // ─── List doctors with live status + today's load ──────────────────────────
  ipcMain.handle('clinic:doctors:list', async () => {
    try {
      if (!prisma) return []
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1)

      const doctors = await prisma.clinicStaff.findMany({
        where: { role: 'doctor' },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
      })
      if (doctors.length === 0) return []

      const ids = doctors.map((d: any) => d.id)

      // Today's appointments for all doctors in one query
      const todaysAppts = await prisma.clinicAppointment.findMany({
        where: {
          doctorId: { in: ids },
          appointmentDate: { gte: todayStart, lt: todayEnd }
        },
        select: { id: true, doctorId: true, appointmentDate: true, duration: true, status: true, patient: { select: { name: true } } }
      })

      // Next upcoming appointment per doctor
      const upcoming = await prisma.clinicAppointment.findMany({
        where: {
          doctorId: { in: ids },
          appointmentDate: { gte: now },
          status: { in: ['scheduled', 'confirmed'] }
        },
        select: { doctorId: true, appointmentDate: true, patient: { select: { name: true } } },
        orderBy: { appointmentDate: 'asc' }
      })

      // Patient-panel size (patients whose primary doctor is this one)
      const panelGroups = await prisma.clinicPatient.groupBy({
        by: ['primaryDoctorId'],
        where: { primaryDoctorId: { in: ids } },
        _count: { primaryDoctorId: true }
      }).catch(() => [] as any[])
      const panelMap = new Map<string, number>()
      for (const g of panelGroups) panelMap.set(g.primaryDoctorId, g._count.primaryDoctorId)

      const nextByDoctor = new Map<string, any>()
      for (const a of upcoming) {
        if (!nextByDoctor.has(a.doctorId)) nextByDoctor.set(a.doctorId, a)
      }

      return doctors.map((d: any) => {
        const mine = todaysAppts.filter((a: any) => a.doctorId === d.id)
        const current = mine.find((a: any) => {
          if (!['scheduled', 'confirmed', 'completed'].includes(a.status)) return false
          const start = new Date(a.appointmentDate).getTime()
          const end = start + (Number(a.duration) || 30) * 60000
          return start <= now.getTime() && now.getTime() <= end
        })
        const next = nextByDoctor.get(d.id)
        return {
          ...d,
          liveStatus: computeLiveStatus(d, current, now),
          todayCount: mine.length,
          currentPatient: current?.patient?.name ?? null,
          nextAppointment: next
            ? { date: next.appointmentDate, patient: next.patient?.name ?? null }
            : null,
          panelSize: panelMap.get(d.id) ?? 0
        }
      })
    } catch (err) {
      log.error('list error', err); throw err
    }
  })

  // ─── Set the clinic's default doctor (only one may be default) ─────────────
  ipcMain.handle('clinic:doctors:setDefault', async (_e, id: string) => {
    try {
      if (!prisma) throw new Error('Database not available')
      await prisma.$transaction([
        prisma.clinicStaff.updateMany({ where: { role: 'doctor', isDefault: true }, data: { isDefault: false } }),
        prisma.clinicStaff.update({ where: { id }, data: { isDefault: true } })
      ])
      return { success: true }
    } catch (err) {
      log.error('setDefault error', err); throw err
    }
  })

  // ─── Persist a doctor's weekly working hours ───────────────────────────────
  ipcMain.handle('clinic:doctors:availability:set', async (_e, { id, workingHours }: { id: string; workingHours: any }) => {
    try {
      if (!prisma) throw new Error('Database not available')
      const value = workingHours == null ? null : typeof workingHours === 'string' ? workingHours : JSON.stringify(workingHours)
      return await prisma.clinicStaff.update({ where: { id }, data: { workingHours: value } })
    } catch (err) {
      log.error('availability:set error', err); throw err
    }
  })

  // ─── Full doctor profile (KPIs + schedule + recent activity + finance) ─────
  ipcMain.handle('clinic:doctors:getProfile', async (_e, params: { id: string; from?: string; to?: string }) => {
    try {
      if (!prisma) throw new Error('Database not available')
      const { id } = params
      const now = new Date()
      const from = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1)
      const to = params.to ? new Date(params.to) : now

      const doctor = await prisma.clinicStaff.findUnique({ where: { id } })
      if (!doctor) throw new Error('Doctor not found')

      const [periodSessions, periodAppts, upcomingAppts, recentSessions, panelSize] = await Promise.all([
        prisma.clinicSession.findMany({
          where: { doctorId: id, visitDate: { gte: from, lte: to } },
          select: { id: true, patientId: true, amountCharged: true, amountPaid: true, visitDate: true }
        }),
        prisma.clinicAppointment.findMany({
          where: { doctorId: id, appointmentDate: { gte: from, lte: to } },
          select: { id: true, status: true }
        }),
        prisma.clinicAppointment.findMany({
          where: { doctorId: id, appointmentDate: { gte: now }, status: { in: ['scheduled', 'confirmed'] } },
          include: { patient: { select: { id: true, name: true, phone: true } } },
          orderBy: { appointmentDate: 'asc' },
          take: 10
        }),
        prisma.clinicSession.findMany({
          where: { doctorId: id },
          include: { patient: { select: { id: true, name: true } } },
          orderBy: { visitDate: 'desc' },
          take: 10
        }),
        prisma.clinicPatient.count({ where: { primaryDoctorId: id } })
      ])

      const revenue = periodSessions.reduce((s: number, x: any) => s + (x.amountPaid ?? 0), 0)
      const charged = periodSessions.reduce((s: number, x: any) => s + (x.amountCharged ?? 0), 0)
      const uniquePatients = new Set(periodSessions.map((x: any) => x.patientId)).size
      const totalAppts = periodAppts.length
      const noShows = periodAppts.filter((a: any) => a.status === 'no_show').length
      const completedAppts = periodAppts.filter((a: any) => a.status === 'completed').length
      const commissionPct = doctor.commissionPct ?? 0
      const commission = Math.round(revenue * (commissionPct / 100) * 100) / 100

      return {
        doctor,
        period: { from: from.toISOString(), to: to.toISOString() },
        kpis: {
          sessions: periodSessions.length,
          patientsSeen: uniquePatients,
          revenue: Math.round(revenue * 100) / 100,
          charged: Math.round(charged * 100) / 100,
          outstanding: Math.round((charged - revenue) * 100) / 100,
          commission,
          avgFee: periodSessions.length ? Math.round((charged / periodSessions.length) * 100) / 100 : 0,
          appointments: totalAppts,
          completedAppts,
          noShows,
          noShowRate: totalAppts ? Math.round((noShows / totalAppts) * 1000) / 10 : 0,
          panelSize
        },
        upcomingAppts,
        recentSessions
      }
    } catch (err) {
      log.error('getProfile error', err); throw err
    }
  })
}
