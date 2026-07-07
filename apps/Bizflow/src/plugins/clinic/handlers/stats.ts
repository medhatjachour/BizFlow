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

  // ─── Full Trend (sessions + revenue per day) ──────────────────────────
  ipcMain.handle('clinic:stats:fullTrend', async (_e, days = 30) => {
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    from.setHours(0, 0, 0, 0)

    const sessions = await prisma.clinicSession.findMany({
      where: { visitDate: { gte: from } },
      select: { visitDate: true, amountCharged: true, amountPaid: true }
    })

    const map: Record<string, { sessions: number; charged: number; paid: number }> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      map[d.toISOString().slice(0, 10)] = { sessions: 0, charged: 0, paid: 0 }
    }
    for (const s of sessions) {
      const key = new Date(s.visitDate).toISOString().slice(0, 10)
      if (key in map) {
        map[key].sessions++
        map[key].charged += s.amountCharged ?? 0
        map[key].paid += s.amountPaid ?? 0
      }
    }

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))
  })

  // ─── Monthly Trend (last N months) ───────────────────────────────────
  ipcMain.handle('clinic:stats:monthlyTrend', async (_e, months = 6) => {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

    const sessions = await prisma.clinicSession.findMany({
      where: { visitDate: { gte: from } },
      select: { visitDate: true, amountPaid: true }
    })

    const map: Record<string, { sessions: number; revenue: number }> = {}
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map[key] = { sessions: 0, revenue: 0 }
    }
    for (const s of sessions) {
      const d = new Date(s.visitDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in map) {
        map[key].sessions++
        map[key].revenue += s.amountPaid ?? 0
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: monthNames[parseInt(month.split('-')[1]) - 1],
        ...v
      }))
  })

  // ─── Breakdowns (visit types + payment statuses) ──────────────────────
  ipcMain.handle('clinic:stats:breakdowns', async () => {
    const [vtGroups, psGroups] = await Promise.all([
      prisma.clinicSession.groupBy({
        by: ['visitType'],
        _count: { visitType: true }
      }),
      prisma.clinicSession.groupBy({
        by: ['paymentStatus'],
        _count: { paymentStatus: true }
      })
    ])

    return {
      visitTypes: vtGroups.map((g: any) => ({ type: g.visitType as string, count: g._count.visitType })),
      paymentStatuses: psGroups.map((g: any) => ({ status: g.paymentStatus as string, count: g._count.paymentStatus }))
    }
  })

  // ─── Per-doctor breakdown (revenue, patient load, no-shows) ───────────────
  ipcMain.handle('clinic:stats:byDoctor', async (_e, params?: { from?: string; to?: string }) => {
    const now = new Date()
    const from = params?.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to = params?.to ? new Date(params.to) : now

    const doctors = await prisma.clinicStaff.findMany({
      where: { role: 'doctor' },
      select: { id: true, name: true, title: true, specialty: true, avatarColor: true, isDefault: true, commissionPct: true }
    })
    if (doctors.length === 0) return []
    const ids = doctors.map((d: any) => d.id)

    const [sessions, appts] = await Promise.all([
      prisma.clinicSession.findMany({
        where: { doctorId: { in: ids }, visitDate: { gte: from, lte: to } },
        select: { doctorId: true, patientId: true, amountCharged: true, amountPaid: true }
      }),
      prisma.clinicAppointment.findMany({
        where: { doctorId: { in: ids }, appointmentDate: { gte: from, lte: to } },
        select: { doctorId: true, status: true }
      })
    ])

    return doctors.map((d: any) => {
      const mySessions = sessions.filter((s: any) => s.doctorId === d.id)
      const myAppts = appts.filter((a: any) => a.doctorId === d.id)
      const revenue = mySessions.reduce((sum: number, s: any) => sum + (s.amountPaid ?? 0), 0)
      const charged = mySessions.reduce((sum: number, s: any) => sum + (s.amountCharged ?? 0), 0)
      const patients = new Set(mySessions.map((s: any) => s.patientId)).size
      const noShows = myAppts.filter((a: any) => a.status === 'no_show').length
      return {
        id: d.id,
        name: d.name,
        title: d.title,
        specialty: d.specialty,
        avatarColor: d.avatarColor,
        isDefault: d.isDefault,
        sessions: mySessions.length,
        patients,
        revenue: Math.round(revenue * 100) / 100,
        outstanding: Math.round((charged - revenue) * 100) / 100,
        commission: Math.round(revenue * ((d.commissionPct ?? 0) / 100) * 100) / 100,
        appointments: myAppts.length,
        noShows,
        noShowRate: myAppts.length ? Math.round((noShows / myAppts.length) * 1000) / 10 : 0
      }
    }).sort((a: any, b: any) => b.revenue - a.revenue)
  })
}
