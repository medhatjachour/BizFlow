import { ipcMain } from 'electron'

export function registerSessionHandlers(prisma: any) {
  // ─── Get Recent Sessions (with optional patient + date filter) ─────────
  // PAGINATION: Returns { data: Session[], total: number, hasMore: boolean }
  ipcMain.handle(
    'clinic:sessions:getRecent',
    async (_e, params?: { patientId?: string; filter?: 'today' | 'week' | 'month' | 'all'; startDate?: string; endDate?: string; skip?: number; take?: number }) => {
      const now = new Date()
      let dateFrom: Date | undefined
      let dateTo: Date | undefined

      if (params?.startDate) {
        dateFrom = new Date(params.startDate)
      } else if (params?.filter === 'today') {
        // Explicit start AND end of today (local time) so no timezone edge cases
        const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate()
        dateFrom = new Date(y, mo, d, 0, 0, 0, 0)
        dateTo   = new Date(y, mo, d, 23, 59, 59, 999)
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

      // Pagination defaults
      const skip = params?.skip ?? 0
      const take = params?.take ?? 50

      // Get total count
      const total = await prisma.clinicSession.count({ where })

      const data = await prisma.clinicSession.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, phone: true, bloodType: true } },
          prescriptions: { orderBy: { createdAt: 'asc' } }
        },
        orderBy: { visitDate: 'desc' },
        skip,
        take
      })

      return {
        data,
        total,
        hasMore: skip + take < total
      }
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

  // ─── Prescription row actions (Patient Profile table) ─────────────────
  ipcMain.handle('clinic:prescriptions:update', async (_e, { id, data }: { id: string; data: any }) => {
    return prisma.clinicPrescription.update({
      where: { id },
      data
    })
  })

  ipcMain.handle('clinic:prescriptions:setActive', async (_e, { id, isActive }: { id: string; isActive: boolean }) => {
    return prisma.clinicPrescription.update({
      where: { id },
      data: isActive
        ? { isActive: true, stoppedAt: null, stopReason: null }
        : { isActive: false, stoppedAt: new Date(), stopReason: 'other' }
    })
  })
}
