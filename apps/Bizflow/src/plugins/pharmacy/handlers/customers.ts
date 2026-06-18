import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Pharmacy:Customers')

function outstandingOf(sale: any): number {
  if (sale.status === 'refunded') return 0
  const net = (sale.total ?? 0) - (sale.refundedAmount ?? 0)
  return Math.max(0, net - (sale.amountPaid ?? 0))
}

export function registerPharmacyCustomerHandlers(prisma: any): void {
  // ─── List customers (with computed finance) ───────────────────────────────
  ipcMain.handle('pharmacy:customers:getAll', async (_e, params?: { search?: string }) => {
    try {
      const where: any = {}
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }]
      }
      const customers = await prisma.pharmacyCustomer.findMany({ where, orderBy: { name: 'asc' } })

      const agg = await prisma.$queryRawUnsafe(`
        SELECT customerId,
          COUNT(*) as salesCount,
          CAST(COALESCE(SUM(total),0) AS REAL) as totalSpent,
          CAST(COALESCE(SUM(amountPaid),0) AS REAL) as totalPaid,
          CAST(COALESCE(SUM(MAX(0,(total - COALESCE(refundedAmount,0)) - amountPaid)),0) AS REAL) as outstanding
        FROM PharmacySale
        WHERE customerId IS NOT NULL AND status != 'refunded'
        GROUP BY customerId
      `) as any[]
      const byId: Record<string, any> = {}
      for (const r of agg) byId[r.customerId] = r

      return customers.map((c: any) => {
        const a = byId[c.id] ?? {}
        return {
          ...c,
          salesCount: Number(a.salesCount) || 0,
          totalSpent: Number(a.totalSpent) || 0,
          totalPaid: Number(a.totalPaid) || 0,
          outstanding: Number(a.outstanding) || 0,
        }
      })
    } catch (err) { log.error('customers:getAll', err); throw err }
  })

  // Lightweight search for the POS picker.
  ipcMain.handle('pharmacy:customers:searchLite', async (_e, query: string) => {
    try {
      const q = (query ?? '').trim()
      const where = q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {}
      return await prisma.pharmacyCustomer.findMany({
        where, take: 12, orderBy: { name: 'asc' },
        select: { id: true, name: true, phone: true, defaultDiscount: true },
      })
    } catch (err) { log.error('customers:searchLite', err); throw err }
  })

  // ─── Full profile: contact + finance + sales history ──────────────────────
  ipcMain.handle('pharmacy:customers:profile', async (_e, id: string) => {
    try {
      const customer = await prisma.pharmacyCustomer.findUnique({ where: { id } })
      if (!customer) throw new Error('Customer not found')
      const sales = await prisma.pharmacySale.findMany({
        where: { customerId: id },
        include: { items: true },
        orderBy: { saleDate: 'desc' },
      })
      let totalCharged = 0, totalPaid = 0, outstanding = 0, unitsBought = 0
      for (const s of sales) {
        if (s.status !== 'refunded') { totalCharged += s.total ?? 0; totalPaid += s.amountPaid ?? 0; outstanding += outstandingOf(s) }
        for (const it of s.items) unitsBought += it.quantity ?? 0
      }
      return {
        customer,
        finance: {
          totalCharged: Math.round(totalCharged * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          outstanding: Math.round(outstanding * 100) / 100,
          salesCount: sales.length,
          unitsBought,
        },
        sales,
      }
    } catch (err) { log.error('customers:profile', err); throw err }
  })

  ipcMain.handle('pharmacy:customers:create', async (_e, data: any) => {
    try {
      const name = (data?.name ?? '').trim()
      if (!name) throw new Error('Customer name is required')
      return await prisma.pharmacyCustomer.create({
        data: {
          name,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          address: data.address?.trim() || null,
          notes: data.notes?.trim() || null,
          defaultDiscount: Number(data.defaultDiscount) || 0,
        },
      })
    } catch (err) { log.error('customers:create', err); throw err }
  })

  ipcMain.handle('pharmacy:customers:update', async (_e, id: string, data: any) => {
    try {
      const patch: any = {}
      if (data.name !== undefined) patch.name = String(data.name).trim()
      for (const k of ['phone', 'email', 'address', 'notes']) if (data[k] !== undefined) patch[k] = data[k]?.trim() || null
      if (data.defaultDiscount !== undefined) patch.defaultDiscount = Number(data.defaultDiscount) || 0
      return await prisma.pharmacyCustomer.update({ where: { id }, data: patch })
    } catch (err) { log.error('customers:update', err); throw err }
  })

  ipcMain.handle('pharmacy:customers:delete', async (_e, id: string) => {
    try {
      // Detach sales (keep history), then delete.
      await prisma.pharmacySale.updateMany({ where: { customerId: id }, data: { customerId: null } })
      await prisma.pharmacyCustomer.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('customers:delete', err); throw err }
  })

  // ─── Settle outstanding across the customer's unpaid sales (oldest first) ──
  ipcMain.handle('pharmacy:customers:settle', async (_e, id: string, data?: { amount?: number }) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const sales = await tx.pharmacySale.findMany({
          where: { customerId: id, status: { not: 'refunded' } },
          orderBy: { saleDate: 'asc' },
        })
        const totalOutstanding = sales.reduce((s: number, x: any) => s + outstandingOf(x), 0)
        let budget = data?.amount != null ? Number(data.amount) : totalOutstanding
        if (!Number.isFinite(budget) || budget <= 0) throw new Error('Enter a valid amount')
        budget = Math.min(budget, totalOutstanding)

        let applied = 0, settledCount = 0
        for (const s of sales) {
          if (budget <= 0.005) break
          const out = outstandingOf(s)
          if (out <= 0.005) continue
          const pay = Math.min(out, budget)
          const newPaid = (s.amountPaid ?? 0) + pay
          const net = (s.total ?? 0) - (s.refundedAmount ?? 0)
          const status = newPaid >= net - 0.005 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'
          await tx.pharmacySale.update({ where: { id: s.id }, data: { amountPaid: newPaid, paymentStatus: status } })
          applied += pay; budget -= pay; settledCount++
        }
        return { applied: Math.round(applied * 100) / 100, settledCount }
      })
    } catch (err) { log.error('customers:settle', err); throw err }
  })
}
