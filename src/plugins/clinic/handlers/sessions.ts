import { ipcMain } from 'electron'

export function registerSessionHandlers(prisma: any) {
  // ─── Get Recent Sessions (with optional patient + date filter) ─────────
  ipcMain.handle(
    'clinic:sessions:getRecent',
    async (_e, params?: { patientId?: string; filter?: 'today' | 'week' | 'month' | 'all'; startDate?: string; endDate?: string }) => {
      const now = new Date()
      let dateFrom: Date | undefined
      let dateTo: Date | undefined

      if (params?.startDate) {
        dateFrom = new Date(params.startDate)
      } else if (params?.filter === 'today') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (params?.filter === 'week') {
        dateFrom = new Date(now)
        dateFrom.setDate(now.getDate() - 7)
      } else if (params?.filter === 'month') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      }

      if (params?.endDate) dateTo = new Date(params.endDate)

      const where: any = {}
      if (params?.patientId) where.patientId = params.patientId
      if (dateFrom || dateTo) {
        where.visitDate = {}
        if (dateFrom) where.visitDate.gte = dateFrom
        if (dateTo) where.visitDate.lte = dateTo
      }

      return prisma.clinicSession.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, phone: true, bloodType: true } },
          prescriptions: { orderBy: { createdAt: 'asc' } }
        },
        orderBy: { visitDate: 'desc' },
        take: 200
      })
    }
  )

  // ─── Create Session (with nested prescriptions) ────────────────────────
  ipcMain.handle('clinic:sessions:create', async (_e, data: any) => {
    const { prescriptions, ...sessionData } = data
    return prisma.clinicSession.create({
      data: {
        ...sessionData,
        prescriptions: prescriptions?.length
          ? { create: prescriptions }
          : undefined
      },
      include: {
        prescriptions: true,
        patient: { select: { id: true, name: true } }
      }
    })
  })

  // ─── Update Session ───────────────────────────────────────────────────
  ipcMain.handle('clinic:sessions:update', async (_e, { id, data }: { id: string; data: any }) => {
    const { prescriptions, ...sessionData } = data

    // Replace prescriptions atomically: delete old inside same transaction
    return prisma.$transaction(async (tx) => {
      await tx.clinicPrescription.deleteMany({ where: { sessionId: id } })

      return tx.clinicSession.update({
        where: { id },
        data: {
          ...sessionData,
          prescriptions: prescriptions?.length
            ? { create: prescriptions }
            : undefined
        },
        include: {
          prescriptions: true,
          patient: { select: { id: true, name: true } }
        }
      })
    })
  })

  // ─── Delete Session ───────────────────────────────────────────────────
  ipcMain.handle('clinic:sessions:delete', async (_e, id: string) => {
    await prisma.clinicSession.delete({ where: { id } })
    return { success: true }
  })
}
