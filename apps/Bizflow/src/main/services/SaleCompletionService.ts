import { cacheService } from './CacheService'
import { createLogger } from '../utils/logger'

const log = createLogger('SaleCompletion')
const COMPLETION_SWEEP_INTERVAL_MS = 15 * 60 * 1000
let completionTimer: NodeJS.Timeout | null = null

export const DEFAULT_SALE_COMPLETION_DELAY_DAYS = 7

export function normalizeCompletionDelayDays(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_SALE_COMPLETION_DELAY_DAYS
  return Math.min(Math.max(Math.trunc(parsed), 0), 365)
}

export function buildCompletionSchedule(delayDays: number, from = new Date()): Date {
  const scheduledFor = new Date(from)
  scheduledFor.setDate(scheduledFor.getDate() + delayDays)
  return scheduledFor
}

export async function completeDueSales(prisma: any, now = new Date()): Promise<number> {
  const dueSales = await prisma.saleTransaction.findMany({
    where: {
      status: 'pending',
      completionScheduledFor: { lte: now }
    },
    select: { customerId: true }
  })

  const result = await prisma.saleTransaction.updateMany({
    where: {
      status: 'pending',
      completionScheduledFor: { lte: now }
    },
    data: {
      status: 'completed',
      completedAt: now
    }
  })

  if (result.count > 0) {
    await refreshCustomerTotals(
      prisma,
      dueSales.map((sale: { customerId: string | null }) => sale.customerId)
    )
    log.info(`Automatically completed ${result.count} pending sale(s)`)
    cacheService.invalidatePattern('dashboard:*')
  }

  return result.count
}

export async function completeSale(prisma: any, transactionId: string): Promise<any> {
  const sale = await prisma.saleTransaction.findUnique({ where: { id: transactionId } })
  if (!sale) throw new Error('Sale transaction not found')
  if (sale.status !== 'pending') throw new Error('Only pending sales can be completed')

  const completed = await prisma.saleTransaction.update({
    where: { id: transactionId },
    data: { status: 'completed', completedAt: new Date() }
  })

  await refreshCustomerTotals(prisma, [sale.customerId])
  cacheService.invalidatePattern('dashboard:*')
  return completed
}

export async function rescheduleSale(
  prisma: any,
  transactionId: string,
  delayDaysValue: unknown
): Promise<any> {
  const sale = await prisma.saleTransaction.findUnique({ where: { id: transactionId } })
  if (!sale) throw new Error('Sale transaction not found')
  if (sale.status !== 'pending') throw new Error('Only pending sales can be rescheduled')

  const delayDays = normalizeCompletionDelayDays(delayDaysValue)
  return prisma.saleTransaction.update({
    where: { id: transactionId },
    data: {
      completionDelayDays: delayDays,
      completionScheduledFor: buildCompletionSchedule(delayDays)
    }
  })
}

async function refreshCustomerTotals(
  prisma: any,
  customerIds: Array<string | null>
): Promise<void> {
  const uniqueCustomerIds = [...new Set(customerIds.filter((id): id is string => Boolean(id)))]

  await Promise.all(
    uniqueCustomerIds.map(async (customerId) => {
      const aggregate = await prisma.saleTransaction.aggregate({
        where: { customerId, status: 'completed' },
        _sum: { total: true }
      })
      await prisma.customer.update({
        where: { id: customerId },
        data: { totalSpent: aggregate._sum.total || 0 }
      })
    })
  )
}

export function startSaleCompletionScheduler(prisma: any): void {
  if (completionTimer) return

  const sweep = () => {
    completeDueSales(prisma).catch((error) => {
      log.error('Scheduled sale completion sweep failed:', error)
    })
  }

  sweep()
  completionTimer = setInterval(sweep, COMPLETION_SWEEP_INTERVAL_MS)
  completionTimer.unref()
}