// ─── Personal Work: Capacity heatmap & blackout dates ───────────────────────
// Planned vs. available minutes per day, amber/red overload detection, and the
// vacation shield that keeps deadlines off days you are not working.
//
// IPC channels:
//   personal:capacity:getHeatmap / getWorkloads / setWorkload / deleteWorkload
//   personal:capacity:getBlackouts / createBlackout / updateBlackout / deleteBlackout
//   personal:capacity:checkConflict / suggestStart / getStatus
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { addDays, dayKey, dayKeysBetween, num, round2, startOfDay, toDate } from './utils'
import { capacityReading, isBlackoutDay, suggestStartDate } from './domain'

const log = createLogger('Personal:Capacity')

export function registerCapacityHandlers(prisma: any) {
  /** Availability of the working day, derived from the saved rate profile. */
  const dailyCapacityMinutes = async () => {
    const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
    const weeklyHours = num(profile?.weeklyCapacityHours, 40)
    return Math.max(0, round2((weeklyHours / 5) * 60))
  }

  ipcMain.handle('personal:capacity:getHeatmap', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const from = startOfDay(opts?.from ?? addDays(new Date(), -7))
      const to = new Date(new Date(opts?.to ?? addDays(new Date(), 21)).setHours(23, 59, 59, 999))
      const perDay = await dailyCapacityMinutes()

      const [workloads, blackouts, profile] = await Promise.all([
        prisma.personalWorkload.findMany({
          where: { day: { gte: from, lte: to } },
          include: { project: { select: { id: true, code: true, title: true } } }
        }),
        prisma.personalBlackout.findMany({ where: { endDate: { gte: from }, startDate: { lte: to } } }),
        prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      ])

      const byDay = new Map<string, any>()
      for (const w of workloads) {
        const key = dayKey(w.day)
        const row = byDay.get(key) ?? {
          day: key,
          plannedMinutes: 0,
          actualMinutes: 0,
          projects: [] as Array<{ id: string; code: string | null; title: string; plannedMinutes: number; actualMinutes: number }>
        }
        row.plannedMinutes += num(w.plannedMinutes)
        row.actualMinutes += num(w.actualMinutes)
        row.projects.push({
          id: w.project?.id ?? 'unassigned',
          code: w.project?.code ?? null,
          title: w.project?.title ?? 'Unassigned',
          plannedMinutes: num(w.plannedMinutes),
          actualMinutes: num(w.actualMinutes)
        })
        byDay.set(key, row)
      }

      const days = dayKeysBetween(from, to).map((key) => {
        const row = byDay.get(key) ?? { day: key, plannedMinutes: 0, actualMinutes: 0, projects: [] }
        const date = new Date(`${key}T12:00:00`)
        const blackout = blackouts.find((b: any) =>
          new Date(key) >= startOfDay(b.startDate) && new Date(key) <= new Date(new Date(b.endDate).setHours(23, 59, 59, 999))
        )
        const weekend = date.getDay() === 0 || date.getDay() === 6
        const available = blackout || weekend ? 0 : perDay
        const reading = capacityReading(row.plannedMinutes, available)
        return {
          ...row,
          date,
          isWeekend: weekend,
          blackout: blackout
            ? { id: blackout.id, title: blackout.title, kind: blackout.kind, blocksDelivery: blackout.blocksDelivery }
            : null,
          availableMinutes: available,
          usedPercent: blackout || weekend ? 0 : reading.usedPercent,
          level: blackout ? 'blocked' : weekend ? 'off' : reading.level,
          overbookedMinutes: reading.overbookedMinutes
        }
      })

      const working = days.filter((d) => d.availableMinutes > 0)
      const overloaded = working.filter((d) => d.level === 'red')

      return {
        range: { from, to },
        dailyCapacityMinutes: perDay,
        weeklyCapacityHours: num(profile?.weeklyCapacityHours, 40),
        maxClientHoursPerWeek: num(profile?.maxClientHoursPerWeek, 30),
        days,
        totals: {
          workingDays: working.length,
          plannedMinutes: working.reduce((sum, d) => sum + d.plannedMinutes, 0),
          actualMinutes: working.reduce((sum, d) => sum + d.actualMinutes, 0),
          amberDays: working.filter((d) => d.level === 'amber').length,
          redDays: overloaded.length,
          blackoutDays: days.filter((d) => d.blackout).length,
          averageUsedPercent: working.length
            ? round2(working.reduce((sum, d) => sum + d.usedPercent, 0) / working.length)
            : 0
        },
        overloadedDays: overloaded.map((d) => ({
          day: d.day,
          usedPercent: d.usedPercent,
          overbookedMinutes: d.overbookedMinutes
        }))
      }
    } catch (err) { log.error('capacity:getHeatmap', err); throw err }
  })

  ipcMain.handle('personal:capacity:getWorkloads', async (_e, opts?: {
    from?: string; to?: string; projectId?: string
  }) => {
    try {
      const where: any = {}
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.from || opts?.to) {
        where.day = {}
        if (opts?.from) where.day.gte = startOfDay(opts.from)
        if (opts?.to) where.day.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      return await prisma.personalWorkload.findMany({
        where,
        include: { project: { select: { id: true, code: true, title: true } } },
        orderBy: { day: 'asc' }
      })
    } catch (err) { log.error('capacity:getWorkloads', err); throw err }
  })

  /** Upserts the planned minutes for one project/day and reports the overload. */
  ipcMain.handle('personal:capacity:setWorkload', async (_e, data: any) => {
    try {
      const bucket = startOfDay(data?.day ?? new Date())
      const plannedMinutes = Math.max(0, Math.round(num(data?.plannedMinutes)))
      const projectId = data?.projectId || null

      const existing = await prisma.personalWorkload.findFirst({ where: { projectId, day: bucket } })
      const saved = existing
        ? await prisma.personalWorkload.update({
            where: { id: existing.id },
            data: { plannedMinutes, isCommitted: data?.isCommitted ?? existing.isCommitted, note: data?.note ?? existing.note }
          })
        : await prisma.personalWorkload.create({
            data: {
              projectId,
              day: bucket,
              plannedMinutes,
              isCommitted: data?.isCommitted ?? true,
              note: data?.note || null
            }
          })

      const perDay = await dailyCapacityMinutes()
      const dayTotals = await prisma.personalWorkload.aggregate({
        where: { day: bucket },
        _sum: { plannedMinutes: true }
      })
      const reading = capacityReading(num(dayTotals._sum.plannedMinutes), perDay)
      return {
        workload: saved,
        day: dayKey(bucket),
        plannedMinutes: reading.plannedMinutes,
        availableMinutes: perDay,
        level: reading.level,
        overbookedMinutes: reading.overbookedMinutes
      }
    } catch (err) { log.error('capacity:setWorkload', err); throw err }
  })

  ipcMain.handle('personal:capacity:deleteWorkload', async (_e, id: string) => {
    try {
      return await prisma.personalWorkload.delete({ where: { id } })
    } catch (err) { log.error('capacity:deleteWorkload', err); throw err }
  })

  // ── Blackout dates / vacation shield ─────────────────────────────────────
  ipcMain.handle('personal:capacity:getBlackouts', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const where: any = {}
      if (opts?.from || opts?.to) {
        where.endDate = { gte: startOfDay(opts.from ?? new Date(0)) }
        if (opts?.to) where.startDate = { lte: new Date(new Date(opts.to).setHours(23, 59, 59, 999)) }
      }
      return await prisma.personalBlackout.findMany({ where, orderBy: { startDate: 'asc' } })
    } catch (err) { log.error('capacity:getBlackouts', err); throw err }
  })

  ipcMain.handle('personal:capacity:createBlackout', async (_e, data: any) => {
    try {
      const startDate = toDate(data?.startDate) ?? new Date()
      const endDate = toDate(data?.endDate) ?? startDate
      return await prisma.personalBlackout.create({
        data: {
          title: String(data?.title ?? '').trim(),
          kind: data?.kind || 'vacation',
          startDate,
          endDate: endDate < startDate ? startDate : endDate,
          blocksDelivery: data?.blocksDelivery ?? true,
          note: data?.note || null
        }
      })
    } catch (err) { log.error('capacity:createBlackout', err); throw err }
  })

  ipcMain.handle('personal:capacity:updateBlackout', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('startDate' in patch) patch.startDate = toDate(patch.startDate)
      if ('endDate' in patch) patch.endDate = toDate(patch.endDate)
      return await prisma.personalBlackout.update({ where: { id }, data: patch })
    } catch (err) { log.error('capacity:updateBlackout', err); throw err }
  })

  /** Deleting a blackout re-plans nothing; deadlines keep their shifted dates. */
  ipcMain.handle('personal:capacity:deleteBlackout', async (_e, id: string) => {
    try {
      return await prisma.personalBlackout.delete({ where: { id } })
    } catch (err) { log.error('capacity:deleteBlackout', err); throw err }
  })

  /**
   * Can this new work fit? Returns the conflicting days, the overloaded totals
   * and a suggested start date that respects blackouts and existing bookings.
   */
  ipcMain.handle('personal:capacity:checkConflict', async (_e, data: {
    from?: string; to?: string; minutesPerDay?: number; totalMinutes?: number; projectId?: string
  }) => {
    try {
      const from = startOfDay(data?.from ?? new Date())
      const minutesPerDay = Math.max(0, num(data?.minutesPerDay, 240))
      const perDay = await dailyCapacityMinutes()
      const totalMinutes = Math.max(0, num(data?.totalMinutes, minutesPerDay * 5))
      const daysNeeded = minutesPerDay > 0 ? Math.ceil(totalMinutes / minutesPerDay) : 0
      const to = new Date(new Date(data?.to ?? addDays(from, Math.max(7, daysNeeded * 2))).setHours(23, 59, 59, 999))

      const [workloads, blackouts] = await Promise.all([
        prisma.personalWorkload.findMany({ where: { day: { gte: from, lte: to } } }),
        prisma.personalBlackout.findMany({ where: { endDate: { gte: from }, startDate: { lte: to } } })
      ])

      const bookedByDay: Record<string, number> = {}
      for (const w of workloads) {
        const key = dayKey(w.day)
        bookedByDay[key] = num(bookedByDay[key]) + num(w.plannedMinutes)
      }

      const conflicts: Array<{ day: string; level: string; plannedMinutes: number; availableMinutes: number; reason: string }> = []
      for (const key of dayKeysBetween(from, to)) {
        const date = new Date(`${key}T12:00:00`)
        if (date.getDay() === 0 || date.getDay() === 6) continue
        const blackout = blackouts.find((b: any) =>
          new Date(key) >= startOfDay(b.startDate) && new Date(key) <= new Date(new Date(b.endDate).setHours(23, 59, 59, 999))
        )
        if (blackout) {
          conflicts.push({
            day: key, level: 'blocked', plannedMinutes: num(bookedByDay[key]), availableMinutes: 0,
            reason: blackout.title || blackout.kind
          })
          continue
        }
        const projected = num(bookedByDay[key]) + (daysNeeded > 0 ? minutesPerDay : 0)
        const reading = capacityReading(projected, perDay)
        if (reading.level !== 'clear') {
          conflicts.push({
            day: key, level: reading.level, plannedMinutes: projected, availableMinutes: perDay,
            reason: reading.level === 'red' ? 'Over capacity' : 'Near capacity'
          })
        }
      }

      const suggestion = suggestStartDate(from, blackouts, bookedByDay, perDay, minutesPerDay)
      return {
        from,
        to,
        dailyCapacityMinutes: perDay,
        minutesPerDay,
        totalMinutes,
        daysNeeded,
        conflictingDays: conflicts.length,
        conflicts,
        blockedDays: conflicts.filter((c) => c.level === 'blocked').length,
        redDays: conflicts.filter((c) => c.level === 'red').length,
        suggestedStartDate: suggestion || null,
        fits: conflicts.length === 0
      }
    } catch (err) { log.error('capacity:checkConflict', err); throw err }
  })

  ipcMain.handle('personal:capacity:suggestStart', async (_e, data: { from?: string; neededMinutes?: number }) => {
    try {
      const from = startOfDay(data?.from ?? new Date())
      const neededMinutes = Math.max(0, num(data?.neededMinutes, 240))
      const perDay = await dailyCapacityMinutes()
      const horizon = addDays(from, 120)
      const [workloads, blackouts] = await Promise.all([
        prisma.personalWorkload.findMany({ where: { day: { gte: from, lte: horizon } } }),
        prisma.personalBlackout.findMany({ where: { endDate: { gte: from } } })
      ])
      const bookedByDay: Record<string, number> = {}
      for (const w of workloads) {
        const key = dayKey(w.day)
        bookedByDay[key] = num(bookedByDay[key]) + num(w.plannedMinutes)
      }
      const suggestion = suggestStartDate(from, blackouts, bookedByDay, perDay, neededMinutes)
      const firstBlackout = blackouts
        .filter((b: any) => new Date(b.startDate) >= from)
        .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

      return {
        suggestedStartDate: suggestion || null,
        dailyCapacityMinutes: perDay,
        nextBlackout: firstBlackout
          ? {
              id: firstBlackout.id,
              title: firstBlackout.title,
              kind: firstBlackout.kind,
              startDate: firstBlackout.startDate,
              endDate: firstBlackout.endDate,
              daysUntil: Math.max(0, Math.round((startOfDay(firstBlackout.startDate).getTime() - Date.now()) / 86_400_000))
            }
          : null,
        isBlackoutToday: isBlackoutDay(from, blackouts)
      }
    } catch (err) { log.error('capacity:suggestStart', err); throw err }
  })

  /** Current-week commitment versus the personal maximum you set. */
  ipcMain.handle('personal:capacity:getStatus', async () => {
    try {
      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      const maxClientHours = num(profile?.maxClientHoursPerWeek, 30)
      const monday = startOfDay(new Date())
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      const [workloads, projects, blackouts] = await Promise.all([
        prisma.personalWorkload.findMany({ where: { day: { gte: monday, lte: sunday } } }),
        prisma.personalProject.findMany({
          where: { status: 'active' },
          select: { id: true, code: true, title: true, maxHoursPerWeek: true }
        }),
        prisma.personalBlackout.findMany({ where: { endDate: { gte: monday }, startDate: { lte: sunday } } })
      ])

      const plannedMinutes = workloads.reduce((sum: number, w: any) => sum + num(w.plannedMinutes), 0)
      const actualMinutes = workloads.reduce((sum: number, w: any) => sum + num(w.actualMinutes), 0)
      const bookedHours = round2(plannedMinutes / 60)
      const readonly = capacityReading(plannedMinutes, maxClientHours * 60)

      return {
        weekStart: monday,
        weekEnd: sunday,
        maxClientHoursPerWeek: maxClientHours,
        bookedHours,
        trackedHours: round2(actualMinutes / 60),
        usedPercent: readonly.usedPercent,
        level: readonly.level,
        overbookedHours: round2(readonly.overbookedMinutes / 60),
        activeProjects: projects.length,
        projectsOverOwnLimit: projects
          .filter((p: any) => num(p.maxHoursPerWeek) > 0)
          .map((p: any) => ({
            id: p.id,
            code: p.code,
            title: p.title,
            maxHoursPerWeek: num(p.maxHoursPerWeek),
            bookedHours: round2(
              workloads
                .filter((w: any) => w.projectId === p.id)
                .reduce((sum: number, w: any) => sum + num(w.plannedMinutes), 0) / 60
            )
          }))
          .filter((p: any) => p.bookedHours > p.maxHoursPerWeek),
        blackoutDaysThisWeek: blackouts.length
      }
    } catch (err) { log.error('capacity:getStatus', err); throw err }
  })
}
