/**
 * Installment Service
 * Handles business logic for installments
 */
import type { PrismaClient } from '@prisma/client'
import { createLogger } from '../utils/logger'

const log = createLogger('Installment')

export class InstallmentService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createInstallment(data: {
    amount: number
    dueDate: Date | string
    paidDate?: Date | string | null
    status?: string
    note?: string
    customerId?: string
    saleId?: string
  }) {
    // IPC passes dates as strings — normalise to Date objects before use
    const dueDate = data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate)
    const paidDate = data.paidDate ? (data.paidDate instanceof Date ? data.paidDate : new Date(data.paidDate)) : null

    log.info(`Creating installment: amount=${data.amount} dueDate=${dueDate.toISOString()} customerId=${data.customerId ?? 'none'}`)
    try {
      const result = await this.prisma.installment.create({
        data: {
          amount: data.amount,
          dueDate,
          paidDate: paidDate ?? null,
          status: data.status ?? 'pending',
          note: data.note,
          customerId: data.customerId ?? null,
          saleId: data.saleId ?? null,
        }
      })
      log.debug(`Installment created: id=${result.id}`)
      return result
    } catch (error) {
      log.error('Failed to create installment:', error)
      throw error
    }
  }

  async getInstallmentsByCustomer(customerId: string) {
    return this.prisma.installment.findMany({
      where: { customerId },
      orderBy: { dueDate: 'asc' }
    })
  }

  async getInstallmentsBySale(saleId: string) {
    return this.prisma.installment.findMany({
      where: { saleId },
      orderBy: { dueDate: 'asc' }
    })
  }

  async listInstallments(options?: {
    page?: number
    limit?: number
    status?: string
    search?: string
    dateFilter?: string
  }) {
    const { page = 1, limit = 50, status, search, dateFilter } = options || {}

    let where: any = {}

    // Status filter
    if (status && status !== 'all') {
      where.status = status
    }

    // Date filter
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      switch (dateFilter) {
        case 'today':
          where.dueDate = {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
          break
        case 'week':
          const startOfWeek = new Date(now)
          startOfWeek.setDate(now.getDate() - now.getDay())
          startOfWeek.setHours(0, 0, 0, 0)
          where.dueDate = {
            gte: startOfWeek,
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
          break
        case 'month':
          where.dueDate = {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          }
          break
        case 'overdue':
          where.dueDate = { lt: now }
          where.status = { not: 'paid' }
          break
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { customer: { name: { contains: search } } },
        { saleId: { contains: search } }
      ]
    }

    const [installments, total] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        include: {
          customer: true
        },
        orderBy: { dueDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.installment.count({ where })
    ])

    return {
      installments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async getUpcomingReminders(daysAhead: number = 7) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    return this.prisma.installment.findMany({
      where: {
        status: 'pending',
        dueDate: {
          lte: futureDate,
          gte: new Date()
        }
      },
      include: {
        customer: true
      },
      orderBy: { dueDate: 'asc' }
    })
  }

  async getOverdueInstallments() {
    return this.prisma.installment.findMany({
      where: {
        status: 'pending',
        dueDate: {
          lt: new Date()
        }
      },
      include: {
        customer: true
      },
      orderBy: { dueDate: 'asc' }
    })
  }

  async markAsPaid(installmentId: string, paidDate?: Date) {
    log.info(`Marking installment as paid: id=${installmentId}`)
    try {
      const result = await this.prisma.installment.update({
        where: { id: installmentId },
        data: {
          status: 'paid',
          paidDate: paidDate ?? new Date()
        }
      })
      log.debug(`Installment marked paid: id=${installmentId}`)
      return result
    } catch (error) {
      log.error(`Failed to mark installment as paid: id=${installmentId}:`, error)
      throw error
    }
  }

  async markAsOverdue(installmentId: string) {
    log.info(`Marking installment as overdue: id=${installmentId}`)
    try {
      const result = await this.prisma.installment.update({
        where: { id: installmentId },
        data: { status: 'overdue' }
      })
      return result
    } catch (error) {
      log.error(`Failed to mark installment as overdue: id=${installmentId}:`, error)
      throw error
    }
  }

  async linkInstallmentsToSale(installmentIds: string[], saleId: string) {
    log.info(`Linking ${installmentIds.length} installment(s) to saleId=${saleId}`)
    try {
      const result = await this.prisma.installment.updateMany({
        where: {
          id: { in: installmentIds },
          saleId: null // Only update installments that aren't already linked to a sale
        },
        data: { saleId }
      })
      log.debug(`Linked ${result.count} installment(s) to saleId=${saleId}`)
      return result
    } catch (error) {
      log.error(`Failed to link installments to saleId=${saleId}:`, error)
      throw error
    }
  }
}
