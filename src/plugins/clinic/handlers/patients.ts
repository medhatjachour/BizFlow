import { ipcMain } from 'electron'

export function registerPatientHandlers(prisma: any) {
  // ─── Get All Patients ─────────────────────────────────────────────────
  // Supports pagination: skip and take parameters
  // Returns: { data: Patient[], total: number, hasMore: boolean }
  // OPTIMIZED: Combines patient fetch + finance aggregation into single query
  ipcMain.handle('clinic:patients:getAll', async (_e, params?: { search?: string; skip?: number; take?: number }) => {
    const where = params?.search
      ? {
          OR: [
            { name: { contains: params.search } },
            { phone: { contains: params.search } },
            { nationalId: { contains: params.search } },
            { folderNumber: { contains: params.search } }
          ]
        }
      : undefined

    // Default pagination: first page with 40 patients
    const skip = params?.skip ?? 0
    const take = params?.take ?? 40

    // Get total count for pagination info
    const total = await prisma.clinicPatient.count({ where })

    // Fetch paginated results
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
      orderBy: [
        { createdAt: 'desc' },
        { name: 'asc' }
      ],
      skip,
      take
    })

    if (patients.length === 0) {
      return { data: [], total, hasMore: false }
    }

    // OPTIMIZATION: Use raw SQL to get finance summaries in single query
    // This eliminates the separate groupBy query and reduces DB round-trips
    const patientIds = patients.map((p: any) => p.id)
    const financeSummaries = await prisma.$queryRawUnsafe(`
      SELECT 
        patientId,
        COALESCE(SUM(amountCharged), 0) as totalCharged,
        COALESCE(SUM(amountPaid), 0) as totalPaid
      FROM ClinicSession
      WHERE patientId IN (${patientIds.map(() => '?').join(',')})
      GROUP BY patientId
    `, ...patientIds) as any[]

    const financeMap: Record<string, { totalCharged: number; totalPaid: number; outstanding: number }> = {}
    for (const f of financeSummaries) {
      financeMap[f.patientId] = {
        totalCharged: Number(f.totalCharged) || 0,
        totalPaid: Number(f.totalPaid) || 0,
        outstanding: (Number(f.totalCharged) || 0) - (Number(f.totalPaid) || 0)
      }
    }

    const data = patients.map((p: any) => ({
      ...p,
      finance: financeMap[p.id] ?? { totalCharged: 0, totalPaid: 0, outstanding: 0 }
    }))

    return {
      data,
      total,
      hasMore: skip + take < total
    }
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
          { nationalId: { contains: trimmed } },
          { folderNumber: { contains: trimmed } }
        ]
      },
      select: { id: true, name: true, phone: true, dateOfBirth: true, folderNumber: true },
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
    // Guard against duplicate phone numbers
    if (data.phone) {
      const existing = await prisma.clinicPatient.findFirst({ where: { phone: data.phone } })
      if (existing) {
        throw new Error(`A patient with phone ${data.phone} already exists (${existing.name}).`)
      }
    }
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
