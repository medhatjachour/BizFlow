/**
 * Deposit Service
 * Handles business logic for deposits
 */
// The generated Prisma client is module-specific, so commerce models may be
// absent in single-module builds (e.g. vet). Typing it as `any` keeps this
// cross-module code compiling everywhere (matches the plugin-handler convention).
type PrismaClient = any
import { createLogger } from '../utils/logger'

const log = createLogger('Deposit')

export class DepositService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createDeposit(data: {
    amount: number
    date?: Date
    method: string
    status?: string
    note?: string
    customerId?: string
    saleId?: string
  }) {
    log.info(`Creating deposit: amount=${data.amount} method=${data.method} customerId=${data.customerId ?? 'none'}`)
    try {
      const deposit = await this.prisma.deposit.create({
        data: {
          amount: data.amount,
          date: data.date ?? new Date(),
          method: data.method,
          status: data.status ?? 'paid',
          note: data.note,
          customerId: data.customerId ?? null,
          saleId: data.saleId ?? null,
        }
      })
      log.debug(`Deposit created: id=${deposit.id}`)
      return deposit
    } catch (error) {
      log.error('Failed to create deposit:', error)
      throw error
    }
  }

  async getDepositsByCustomer(customerId: string) {
    return this.prisma.deposit.findMany({
      where: { customerId },
      orderBy: { date: 'desc' }
    })
  }

  async getDepositsBySale(saleId: string) {
    return this.prisma.deposit.findMany({
      where: { saleId },
      orderBy: { date: 'desc' }
    })
  }

  async listDeposits() {
    return this.prisma.deposit.findMany({ orderBy: { date: 'desc' } })
  }

  async linkDepositsToSale(depositIds: string[], saleId: string) {
    log.info(`Linking ${depositIds.length} deposit(s) to saleId=${saleId}`)
    try {
      const result = await this.prisma.deposit.updateMany({
        where: {
          id: { in: depositIds },
          saleId: null // Only update deposits that aren't already linked to a sale
        },
        data: { saleId }
      })
      log.debug(`Linked ${result.count} deposit(s) to saleId=${saleId}`)
      return result
    } catch (error) {
      log.error(`Failed to link deposits to saleId=${saleId}:`, error)
      throw error
    }
  }
}
