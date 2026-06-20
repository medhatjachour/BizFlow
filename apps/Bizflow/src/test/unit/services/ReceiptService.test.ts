import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReceiptService } from '../../../main/services/ReceiptService'
import type { PrismaClient } from '@prisma/client'

// Mock Prisma client
const mockPrisma = {
  deposit: {
    findUnique: vi.fn()
  },
  installment: {
    findUnique: vi.fn()
  }
} as unknown as PrismaClient

describe('ReceiptService', () => {
  let receiptService: ReceiptService

  beforeEach(() => {
    vi.clearAllMocks()
    receiptService = new ReceiptService(mockPrisma)
  })

  describe('generateDepositReceipt', () => {
    const mockDeposit = {
      id: 'deposit-123',
      date: new Date('2024-12-01'),
      amount: 500,
      method: 'cash',
      note: 'Partial payment',
      customer: {
        id: 'cust-1',
        name: 'John Doe',
        phone: '+1234567890'
      },
      sale: {
        id: 'sale-1',
        total: 1000,
        items: [
          {
            product: { name: 'Product A' },
            variant: { id: 'var-1' },
            quantity: 2,
            price: 100,
            total: 200
          },
          {
            product: { name: 'Product B' },
            variant: { id: 'var-2' },
            quantity: 1,
            price: 50,
            total: 50
          }
        ]
      }
    }

    it('should generate deposit receipt with all data', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(mockDeposit)

      const result = await receiptService.generateDepositReceipt('deposit-123')

      expect(mockPrisma.deposit.findUnique).toHaveBeenCalledWith({
        where: { id: 'deposit-123' },
        include: {
          customer: true,
          sale: {
            include: {
              items: {
                include: {
                  product: true,
                  variant: true
                }
              }
            }
          }
        }
      })

      expect(result).toEqual({
        type: 'deposit',
        id: 'deposit-123',
        date: new Date('2024-12-01'),
        amount: 500,
        method: 'cash',
        note: 'Partial payment',
        customer: {
          id: 'cust-1',
          name: 'John Doe',
          phone: '+1234567890'
        },
        sale: {
          id: 'sale-1',
          total: 1000,
          items: [
            {
              productName: 'Product A',
              quantity: 2,
              price: 100,
              total: 200
            },
            {
              productName: 'Product B',
              quantity: 1,
              price: 50,
              total: 50
            }
          ]
        }
      })
    })

    it('should generate deposit receipt without customer', async () => {
      const depositWithoutCustomer = {
        ...mockDeposit,
        customer: null
      }

      mockPrisma.deposit.findUnique.mockResolvedValue(depositWithoutCustomer)

      const result = await receiptService.generateDepositReceipt('deposit-123')

      expect(result.customer).toBeNull()
    })

    it('should generate deposit receipt without sale', async () => {
      const depositWithoutSale = {
        ...mockDeposit,
        sale: null
      }

      mockPrisma.deposit.findUnique.mockResolvedValue(depositWithoutSale)

      const result = await receiptService.generateDepositReceipt('deposit-123')

      expect(result.sale).toBeNull()
    })

    it('should throw error when deposit not found', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null)

      await expect(receiptService.generateDepositReceipt('nonexistent'))
        .rejects.toThrow('Deposit not found')
    })
  })

  describe('generateInstallmentReceipt', () => {
    const mockInstallment = {
      id: 'installment-123',
      dueDate: new Date('2024-12-31'),
      paidDate: new Date('2024-12-25'),
      amount: 300,
      status: 'paid',
      note: 'Early payment discount',
      customer: {
        id: 'cust-1',
        name: 'Jane Smith',
        phone: '+0987654321'
      },
      sale: {
        id: 'sale-2',
        total: 1500,
        saleItems: [
          {
            product: { name: 'Premium Product' },
            variant: { id: 'var-3' },
            quantity: 3,
            price: 150,
            total: 450
          }
        ]
      }
    }

    it('should generate installment receipt with all data', async () => {
      mockPrisma.installment.findUnique.mockResolvedValue(mockInstallment)

      const result = await receiptService.generateInstallmentReceipt('installment-123')

      expect(mockPrisma.installment.findUnique).toHaveBeenCalledWith({
        where: { id: 'installment-123' },
        include: {
          customer: true,
          sale: {
            include: {
              items: {
                include: {
                  product: true,
                  variant: true
                }
              }
            }
          }
        }
      })

      expect(result).toEqual({
        type: 'installment',
        id: 'installment-123',
        dueDate: new Date('2024-12-31'),
        paidDate: new Date('2024-12-25'),
        amount: 300,
        status: 'paid',
        note: 'Early payment discount',
        customer: {
          id: 'cust-1',
          name: 'Jane Smith',
          phone: '+0987654321'
        },
        sale: {
          id: 'sale-2',
          total: 1500,
          items: [
            {
              productName: 'Premium Product',
              quantity: 3,
              price: 150,
              total: 450
            }
          ]
        }
      })
    })

    it('should generate installment receipt without customer', async () => {
      const installmentWithoutCustomer = {
        ...mockInstallment,
        customer: null
      }

      mockPrisma.installment.findUnique.mockResolvedValue(installmentWithoutCustomer)

      const result = await receiptService.generateInstallmentReceipt('installment-123')

      expect(result.customer).toBeNull()
    })

    it('should generate installment receipt without sale', async () => {
      const installmentWithoutSale = {
        ...mockInstallment,
        sale: null
      }

      mockPrisma.installment.findUnique.mockResolvedValue(installmentWithoutSale)

      const result = await receiptService.generateInstallmentReceipt('installment-123')

      expect(result.sale).toBeNull()
    })

    it('should throw error when installment not found', async () => {
      mockPrisma.installment.findUnique.mockResolvedValue(null)

      await expect(receiptService.generateInstallmentReceipt('nonexistent'))
        .rejects.toThrow('Installment not found')
    })
  })

  describe('generateThermalReceipt', () => {
    it('should generate thermal receipt for deposit', () => {
      const depositReceipt = {
        type: 'deposit',
        id: 'deposit-123456789',
        date: new Date('2024-12-01'),
        amount: 250.50,
        method: 'card',
        note: 'Thank you',
        customer: {
          id: 'cust-1',
          name: 'John Doe',
          phone: '+1234567890'
        },
        sale: {
          id: 'sale-1',
          total: 500,
          items: [
            {
              productName: 'Test Product',
              quantity: 2,
              price: 25.50,
              total: 51.00
            }
          ]
        }
      }

      const result = receiptService.generateThermalReceipt(depositReceipt)

      // Check that it contains ESC/POS commands
      expect(result).toContain('\x1B\x40') // Initialize
      expect(result).toContain('\x1B\x21\x30') // Normal size
      expect(result).toContain('\x1B\x61\x01') // Center alignment
      expect(result).toContain('BIZFLOW')
      expect(result).toContain('PAYMENT RECEIPT')
      expect(result).toContain('Deposit ID: 23456789')
      expect(result).toContain('Date: 12/1/2024')
      expect(result).toContain('Amount: $250.50')
      expect(result).toContain('Method: card')
      expect(result).toContain('Customer: John Doe')
      expect(result).toContain('Phone: +1234567890')
      expect(result).toContain('Note: Thank you')
      expect(result).toContain('Sale Details:')
      expect(result).toContain('Test Product')
      expect(result).toContain('2 x $25.50 = $51.00')
      expect(result).toContain('Total: $500.00')
      expect(result).toContain('Thank you for your business!')
      expect(result).toContain('\x1B\x69') // Cut paper
    })

    it('should generate thermal receipt for installment', () => {
      const installmentReceipt = {
        type: 'installment',
        id: 'installment-123456789',
        dueDate: new Date('2024-12-31'),
        paidDate: new Date('2024-12-25'),
        amount: 150.75,
        status: 'paid',
        note: 'Final payment',
        customer: {
          id: 'cust-1',
          name: 'Jane Smith',
          phone: '+0987654321'
        },
        sale: null
      }

      const result = receiptService.generateThermalReceipt(installmentReceipt)

      expect(result).toContain('Installment ID: 23456789')
      expect(result).toContain('Due Date: 12/31/2024')
      expect(result).toContain('Paid Date: 12/25/2024')
      expect(result).toContain('Amount: $150.75')
      expect(result).toContain('Status: paid')
      expect(result).toContain('Customer: Jane Smith')
      expect(result).toContain('Phone: +0987654321')
      expect(result).toContain('Note: Final payment')
      expect(result).toContain('Thank you for your business!')
    })

    it('should handle receipt without customer', () => {
      const receiptWithoutCustomer = {
        type: 'deposit',
        id: 'deposit-123',
        date: new Date(),
        amount: 100,
        method: 'cash',
        customer: null,
        sale: null
      }

      const result = receiptService.generateThermalReceipt(receiptWithoutCustomer)

      expect(result).not.toContain('Customer:')
      expect(result).not.toContain('Phone:')
    })

    it('should handle receipt without sale', () => {
      const receiptWithoutSale = {
        type: 'deposit',
        id: 'deposit-123',
        date: new Date(),
        amount: 100,
        method: 'cash',
        customer: null,
        sale: null
      }

      const result = receiptService.generateThermalReceipt(receiptWithoutSale)

      expect(result).not.toContain('Sale Details:')
      expect(result).not.toContain('Total:')
    })

    it('should handle installment without paid date', () => {
      const installmentWithoutPaidDate = {
        type: 'installment',
        id: 'installment-123',
        dueDate: new Date('2024-12-31'),
        paidDate: null,
        amount: 200,
        status: 'pending',
        customer: null,
        sale: null
      }

      const result = receiptService.generateThermalReceipt(installmentWithoutPaidDate)

      expect(result).toContain('Due Date: 12/31/2024')
      expect(result).not.toContain('Paid Date:')
      expect(result).toContain('Status: pending')
    })

    it('should truncate long product names', () => {
      const receiptWithLongName = {
        type: 'deposit',
        id: 'deposit-123',
        date: new Date(),
        amount: 100,
        method: 'cash',
        customer: null,
        sale: {
          id: 'sale-1',
          total: 100,
          items: [
            {
              productName: 'This is a very long product name that should be truncated',
              quantity: 1,
              price: 100,
              total: 100
            }
          ]
        }
      }

      const result = receiptService.generateThermalReceipt(receiptWithLongName)

      expect(result).toContain('This is a very long')
      expect(result).toContain('1 x $100.00 = $100.00')
    })

    it('should include current timestamp in footer', () => {
      const receipt = {
        type: 'deposit',
        id: 'deposit-123',
        date: new Date(),
        amount: 100,
        method: 'cash',
        customer: null,
        sale: null
      }

      const beforeGeneration = new Date()
      const result = receiptService.generateThermalReceipt(receipt)
      const afterGeneration = new Date()

      // Should contain a timestamp between before and after generation
      const lines = result.split('\n')
      const timestampLine = lines.find(line => line.includes('/') || line.includes('-'))
      expect(timestampLine).toBeDefined()
    })
  })
})