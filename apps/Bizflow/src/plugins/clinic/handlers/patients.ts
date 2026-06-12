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

  // ─── Get Debtor Patients (optimized for finance page) ─────────────────
  // Returns only patients with outstanding balance, sorted by highest debt.
  ipcMain.handle('clinic:patients:getDebtors', async (_e, params?: { search?: string; skip?: number; take?: number }) => {
    const skip = params?.skip ?? 0
    const take = params?.take ?? 200
    const search = (params?.search ?? '').trim()

    const whereSql = search
      ? 'WHERE (p.name LIKE ? OR p.phone LIKE ? OR p.nationalId LIKE ? OR p.folderNumber LIKE ?)'
      : ''
    const searchArgs = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []

    const countRows = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total
      FROM (
        SELECT p.id
        FROM ClinicPatient p
        LEFT JOIN ClinicSession s ON s.patientId = p.id
        ${whereSql}
        GROUP BY p.id
        HAVING (COALESCE(SUM(s.amountCharged), 0) - COALESCE(SUM(s.amountPaid), 0)) > 0
      ) debtors
    `, ...searchArgs) as Array<{ total: number | string }>

    const totalOutstandingRows = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(outstanding), 0) AS totalOutstanding
      FROM (
        SELECT (COALESCE(SUM(s.amountCharged), 0) - COALESCE(SUM(s.amountPaid), 0)) AS outstanding
        FROM ClinicPatient p
        LEFT JOIN ClinicSession s ON s.patientId = p.id
        ${whereSql}
        GROUP BY p.id
        HAVING (COALESCE(SUM(s.amountCharged), 0) - COALESCE(SUM(s.amountPaid), 0)) > 0
      ) t
    `, ...searchArgs) as Array<{ totalOutstanding: number | string }>

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        p.id,
        p.name,
        p.phone,
        COALESCE(SUM(s.amountCharged), 0) AS totalCharged,
        COALESCE(SUM(s.amountPaid), 0) AS totalPaid,
        (COALESCE(SUM(s.amountCharged), 0) - COALESCE(SUM(s.amountPaid), 0)) AS outstanding
      FROM ClinicPatient p
      LEFT JOIN ClinicSession s ON s.patientId = p.id
      ${whereSql}
      GROUP BY p.id
      HAVING (COALESCE(SUM(s.amountCharged), 0) - COALESCE(SUM(s.amountPaid), 0)) > 0
      ORDER BY outstanding DESC, p.name ASC
      LIMIT ? OFFSET ?
    `, ...searchArgs, take, skip) as Array<{
      id: string
      name: string
      phone: string | null
      totalCharged: number | string
      totalPaid: number | string
      outstanding: number | string
    }>

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone ?? '',
      finance: {
        totalCharged: Number(r.totalCharged) || 0,
        totalPaid: Number(r.totalPaid) || 0,
        outstanding: Number(r.outstanding) || 0
      }
    }))

    const total = Number(countRows?.[0]?.total ?? 0)
    const totalOutstanding = Number(totalOutstandingRows?.[0]?.totalOutstanding ?? 0)

    return {
      data,
      total,
      totalOutstanding,
      hasMore: skip + data.length < total
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
