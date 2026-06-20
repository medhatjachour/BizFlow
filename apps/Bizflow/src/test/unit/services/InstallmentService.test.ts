import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InstallmentService } from '../../../main/services/InstallmentService'
import type { PrismaClient } from '@prisma/client'

// Mock Prisma client
const mockPrisma = {
  installment: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  }
} as unknown as PrismaClient

describe('InstallmentService', () => {
  let installmentService: InstallmentService

  beforeEach(() => {
    vi.clearAllMocks()
    installmentService = new InstallmentService(mockPrisma)
  })

  describe('createInstallment', () => {
    it('should create an installment with required fields', async () => {
      const installmentData = {
        amount: 1000,
        dueDate: new Date('2024-12-31')
      }

      const mockInstallment = {
        id: 'inst-1',
        ...installmentData,
        paidDate: null,
        status: 'pending',
        note: undefined,
        customerId: null,
        saleId: null
      }

      mockPrisma.installment.create.mockResolvedValue(mockInstallment)

      const result = await installmentService.createInstallment(installmentData)

      expect(mockPrisma.installment.create).toHaveBeenCalledWith({
        data: {
          amount: 1000,
          dueDate: new Date('2024-12-31'),
          paidDate: null,
          status: 'pending',
          note: undefined,
          customerId: null,
          saleId: null
        }
      })
      expect(result).toEqual(mockInstallment)
    })

    it('should create an installment with all optional fields', async () => {
      const installmentData = {
        amount: 500,
        dueDate: new Date('2024-12-31'),
        paidDate: new Date('2024-12-25'),
        status: 'paid',
        note: 'Early payment',
        customerId: 'cust-1',
        saleId: 'sale-1'
      }

      mockPrisma.installment.create.mockResolvedValue({
        id: 'inst-1',
        ...installmentData
      })

      const result = await installmentService.createInstallment(installmentData)

      expect(mockPrisma.installment.create).toHaveBeenCalledWith({
        data: {
          amount: 500,
          dueDate: new Date('2024-12-31'),
          paidDate: new Date('2024-12-25'),
          status: 'paid',
          note: 'Early payment',
          customerId: 'cust-1',
          saleId: 'sale-1'
        }
      })
      expect(result).toEqual({
        id: 'inst-1',
        ...installmentData
      })
    })
  })

  describe('getInstallmentsByCustomer', () => {
    it('should return installments for a customer ordered by due date', async () => {
      const mockInstallments = [
        {
          id: 'inst-1',
          amount: 500,
          dueDate: new Date('2024-12-01'),
          customerId: 'cust-1'
        },
        {
          id: 'inst-2',
          amount: 500,
          dueDate: new Date('2024-12-15'),
          customerId: 'cust-1'
        }
      ]

      mockPrisma.installment.findMany.mockResolvedValue(mockInstallments)

      const result = await installmentService.getInstallmentsByCustomer('cust-1')

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        orderBy: { dueDate: 'asc' }
      })
      expect(result).toEqual(mockInstallments)
    })
  })

  describe('getInstallmentsBySale', () => {
    it('should return installments for a sale ordered by due date', async () => {
      const mockInstallments = [
        {
          id: 'inst-1',
          amount: 300,
          dueDate: new Date('2024-12-01'),
          saleId: 'sale-1'
        }
      ]

      mockPrisma.installment.findMany.mockResolvedValue(mockInstallments)

      const result = await installmentService.getInstallmentsBySale('sale-1')

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith({
        where: { saleId: 'sale-1' },
        orderBy: { dueDate: 'asc' }
      })
      expect(result).toEqual(mockInstallments)
    })
  })

  describe('listInstallments', () => {
    const mockInstallments = [
      {
        id: 'inst-1',
        amount: 500,
        dueDate: new Date('2024-12-01'),
        status: 'pending',
        customer: { id: 'cust-1', name: 'John Doe' }
      }
    ]

    beforeEach(() => {
      mockPrisma.installment.findMany.mockResolvedValue(mockInstallments)
      mockPrisma.installment.count.mockResolvedValue(1)
    })

    it('should return paginated installments with default options', async () => {
      const result = await installmentService.listInstallments()

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith({
        where: {},
        include: { customer: true },
        orderBy: { dueDate: 'asc' },
        skip: 0,
        take: 50
      })
      expect(result).toEqual({
        installments: mockInstallments,
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1
      })
    })

    it('should filter by status', async () => {
      await installmentService.listInstallments({ status: 'paid' })

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'paid' }
        })
      )
    })

    it('should filter by search term', async () => {
      await installmentService.listInstallments({ search: 'John' })

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { customer: { name: { contains: 'John' } } },
              { saleId: { contains: 'John' } }
            ]
          }
        })
      )
    })

    it('should filter by date - today', async () => {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      await installmentService.listInstallments({ dateFilter: 'today' })

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: {
              gte: startOfDay,
              lt: endOfDay
            }
          }
        })
      )
    })

    it('should filter by date - week', async () => {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      await installmentService.listInstallments({ dateFilter: 'week' })

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: {
              gte: startOfWeek,
              lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          }
        })
      )
    })

    it('should filter by date - month', async () => {
      const now = new Date()

      await installmentService.listInstallments({ dateFilter: 'month' })

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1),
              lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
            }
          }
        })
      )
    })

    it('should filter by date - overdue', async () => {
      const now = new Date()

      await installmentService.listInstallments({ dateFilter: 'overdue' })

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: { lt: now },
            status: { not: 'paid' }
          }
        })
      )
    })

    it('should handle pagination', async () => {
      await installmentService.listInstallments({ page: 2, limit: 10 })

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      )
    })
  })

  describe('getUpcomingReminders', () => {
    it('should return upcoming installments within specified days', async () => {
      const mockInstallments = [
        {
          id: 'inst-1',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          status: 'pending',
          customer: { id: 'cust-1', name: 'John Doe' }
        }
      ]

      mockPrisma.installment.findMany.mockResolvedValue(mockInstallments)

      const result = await installmentService.getUpcomingReminders(7)

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          dueDate: {
            lte: expect.any(Date),
            gte: expect.any(Date)
          }
        },
        include: { customer: true },
        orderBy: { dueDate: 'asc' }
      })
      expect(result).toEqual(mockInstallments)
    })

    it('should use default 7 days ahead', async () => {
      mockPrisma.installment.findMany.mockResolvedValue([])

      await installmentService.getUpcomingReminders()

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'pending',
            dueDate: {
              lte: expect.any(Date),
              gte: expect.any(Date)
            }
          }
        })
      )
    })
  })

  describe('getOverdueInstallments', () => {
    it('should return overdue installments', async () => {
      const mockInstallments = [
        {
          id: 'inst-1',
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          status: 'pending',
          customer: { id: 'cust-1', name: 'John Doe' }
        }
      ]

      mockPrisma.installment.findMany.mockResolvedValue(mockInstallments)

      const result = await installmentService.getOverdueInstallments()

      expect(mockPrisma.installment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          dueDate: {
            lt: expect.any(Date)
          }
        },
        include: { customer: true },
        orderBy: { dueDate: 'asc' }
      })
      expect(result).toEqual(mockInstallments)
    })
  })

  describe('markAsPaid', () => {
    it('should mark installment as paid with current date', async () => {
      const mockUpdatedInstallment = {
        id: 'inst-1',
        status: 'paid',
        paidDate: new Date()
      }

      mockPrisma.installment.update.mockResolvedValue(mockUpdatedInstallment)

      const result = await installmentService.markAsPaid('inst-1')

      expect(mockPrisma.installment.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          status: 'paid',
          paidDate: expect.any(Date)
        }
      })
      expect(result).toEqual(mockUpdatedInstallment)
    })

    it('should mark installment as paid with specified date', async () => {
      const paidDate = new Date('2024-12-25')

      await installmentService.markAsPaid('inst-1', paidDate)

      expect(mockPrisma.installment.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          status: 'paid',
          paidDate
        }
      })
    })
  })

  describe('markAsOverdue', () => {
    it('should mark installment as overdue', async () => {
      const mockUpdatedInstallment = {
        id: 'inst-1',
        status: 'overdue'
      }

      mockPrisma.installment.update.mockResolvedValue(mockUpdatedInstallment)

      const result = await installmentService.markAsOverdue('inst-1')

      expect(mockPrisma.installment.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: { status: 'overdue' }
      })
      expect(result).toEqual(mockUpdatedInstallment)
    })
  })

  describe('linkInstallmentsToSale', () => {
    it('should link installments to a sale', async () => {
      const installmentIds = ['inst-1', 'inst-2']
      const saleId = 'sale-1'

      const mockResult = { count: 2 }

      mockPrisma.installment.updateMany.mockResolvedValue(mockResult)

      const result = await installmentService.linkInstallmentsToSale(installmentIds, saleId)

      expect(mockPrisma.installment.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: installmentIds },
          saleId: null
        },
        data: { saleId }
      })
      expect(result).toEqual(mockResult)
    })
  })
})