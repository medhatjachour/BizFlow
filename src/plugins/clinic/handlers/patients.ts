import { ipcMain } from 'electron'

export function registerPatientHandlers(prisma: any) {
  // ─── Get All Patients ─────────────────────────────────────────────────
  ipcMain.handle('clinic:patients:getAll', async (_e, params?: { search?: string; limit?: number }) => {
    const where = params?.search
      ? {
          OR: [
            { name: { contains: params.search } },
            { phone: { contains: params.search } },
            { nationalId: { contains: params.search } }
          ]
        }
      : undefined

    const patients = await prisma.clinicPatient.findMany({
      where,
      include: {
        _count: { select: { sessions: true } },
        sessions: {
          orderBy: { visitDate: 'desc' },
          take: 1,
          select: { visitDate: true, paymentStatus: true, visitType: true }
        }
      },
      orderBy: { name: 'asc' },
      take: params?.limit ?? undefined
    })

    if (patients.length === 0) return patients

    const patientIds = patients.map((p: any) => p.id)
    const financeSummaries = await prisma.clinicSession.groupBy({
      by: ['patientId'],
      _sum: { amountCharged: true, amountPaid: true },
      where: { patientId: { in: patientIds } }
    })

    const financeMap: Record<string, { totalCharged: number; totalPaid: number; outstanding: number }> = {}
    for (const f of financeSummaries) {
      financeMap[f.patientId] = {
        totalCharged: f._sum.amountCharged ?? 0,
        totalPaid: f._sum.amountPaid ?? 0,
        outstanding: (f._sum.amountCharged ?? 0) - (f._sum.amountPaid ?? 0)
      }
    }

    return patients.map((p: any) => ({
      ...p,
      finance: financeMap[p.id] ?? { totalCharged: 0, totalPaid: 0, outstanding: 0 }
    }))
  })

  // ─── Search Patients (lightweight – for autocomplete) ─────────────────
  ipcMain.handle('clinic:patients:searchLite', async (_e, query: string) => {
    const trimmed = (query ?? '').trim()
    if (!trimmed) return []
    return prisma.clinicPatient.findMany({
      where: {
        OR: [
          { name: { contains: trimmed } },
          { phone: { contains: trimmed } },
          { nationalId: { contains: trimmed } }
        ]
      },
      select: { id: true, name: true, phone: true, dateOfBirth: true },
      orderBy: { name: 'asc' },
      take: 10
    })
  })

  // ─── Get Patient By ID (with full session history) ────────────────────
  ipcMain.handle('clinic:patients:getById', async (_e, id: string) => {
    return prisma.clinicPatient.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { visitDate: 'desc' },
          include: {
            prescriptions: { orderBy: { createdAt: 'asc' } }
          }
        }
      }
    })
  })

  // ─── Create Patient ───────────────────────────────────────────────────
  ipcMain.handle('clinic:patients:create', async (_e, data: any) => {
    return prisma.clinicPatient.create({ data })
  })

  // ─── Update Patient ───────────────────────────────────────────────────
  ipcMain.handle('clinic:patients:update', async (_e, { id, data }: { id: string; data: any }) => {
    return prisma.clinicPatient.update({ where: { id }, data })
  })

  // ─── Delete Patient ───────────────────────────────────────────────────
  ipcMain.handle('clinic:patients:delete', async (_e, id: string) => {
    await prisma.clinicPatient.delete({ where: { id } })
    return { success: true }
  })
}
