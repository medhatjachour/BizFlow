import { ipcMain } from 'electron'

export function registerStatsHandlers(prisma: any) {
  // ─── Overview Stats ───────────────────────────────────────────────────
  ipcMain.handle('clinic:stats:overview', async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const [totalPatients, sessionsThisMonth, newPatientsThisMonth, followUpsDue, todaySessions, financeSummary] =
      await Promise.all([
        prisma.clinicPatient.count(),
        prisma.clinicSession.count({ where: { visitDate: { gte: monthStart } } }),
        prisma.clinicPatient.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.clinicSession.count({
          where: {
            followUpDate: { gte: todayStart, lt: todayEnd },
            status: 'completed'
          }
        }),
        prisma.clinicSession.count({ where: { visitDate: { gte: todayStart, lt: todayEnd } } }),
        prisma.clinicSession.aggregate({
          _sum: { amountCharged: true, amountPaid: true },
          where: { visitDate: { gte: monthStart } }
        })
      ])

    const revenueThisMonth = financeSummary._sum.amountPaid ?? 0
    const outstandingThisMonth = (financeSummary._sum.amountCharged ?? 0) - revenueThisMonth

    return { totalPatients, sessionsThisMonth, newPatientsThisMonth, followUpsDue, todaySessions, revenueThisMonth, outstandingThisMonth }
  })

  // ─── Top Diagnoses ────────────────────────────────────────────────────
  ipcMain.handle('clinic:stats:topDiagnoses', async (_e, limit = 10) => {
    const groups = await prisma.clinicSession.groupBy({
      by: ['diagnosis'],
      where: { diagnosis: { not: null } },
      _count: { diagnosis: true },
      orderBy: { _count: { diagnosis: 'desc' } },
      take: limit
    })
    return groups.map((g) => ({ diagnosis: g.diagnosis as string, count: g._count.diagnosis }))
  })

  // ─── Visit Trend (last N days) ────────────────────────────────────────
  ipcMain.handle('clinic:stats:visitTrend', async (_e, days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    from.setHours(0, 0, 0, 0)

    const sessions = await prisma.clinicSession.findMany({
      where: { visitDate: { gte: from } },
      select: { visitDate: true }
    })

    // Build a map date → count (full range, zeros included)
    const map: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      map[d.toISOString().slice(0, 10)] = 0
    }
    for (const s of sessions) {
      const key = new Date(s.visitDate).toISOString().slice(0, 10)
      if (key in map) map[key]++
    }

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  })

  // ─── Per-patient Stats ────────────────────────────────────────────────
  ipcMain.handle('clinic:stats:patientStats', async (_e, patientId: string) => {
    const sessions = await prisma.clinicSession.findMany({
      where: { patientId },
      select: { visitDate: true, diagnosis: true, followUpDate: true, status: true, amountCharged: true, amountPaid: true, paymentStatus: true, visitType: true },
      orderBy: { visitDate: 'asc' }
    })

    if (sessions.length === 0) {
      return { totalSessions: 0, firstVisit: null, lastVisit: null, topDiagnosis: null, nextFollowUp: null, totalCharged: 0, totalPaid: 0, outstanding: 0 }
    }

    const counts: Record<string, number> = {}
    for (const s of sessions) {
      if (s.diagnosis) counts[s.diagnosis] = (counts[s.diagnosis] ?? 0) + 1
    }
    const topDiagnosis = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    const future = sessions
      .filter((s) => s.followUpDate && new Date(s.followUpDate) >= new Date())
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())

    const totalCharged = sessions.reduce((sum, s) => sum + (s.amountCharged ?? 0), 0)
    const totalPaid = sessions.reduce((sum, s) => sum + (s.amountPaid ?? 0), 0)

    return {
      totalSessions: sessions.length,
      firstVisit: sessions[0].visitDate,
      lastVisit: sessions[sessions.length - 1].visitDate,
      topDiagnosis,
      nextFollowUp: future[0]?.followUpDate ?? null,
      totalCharged,
      totalPaid,
      outstanding: totalCharged - totalPaid
    }
  })
}
