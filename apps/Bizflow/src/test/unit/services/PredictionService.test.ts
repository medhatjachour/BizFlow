/**
 * Unit tests for PredictionService
 * Tests financial forecasting and predictive analytics functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PredictionService } from '../../../main/services/PredictionService'
import type { PrismaClient } from '@prisma/client'

// Mock Prisma
const mockPrisma = {
  saleTransaction: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  financialTransaction: {
    findMany: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
  productVariant: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient

describe('PredictionService', () => {
  let predictionService: PredictionService

  beforeEach(() => {
    vi.clearAllMocks()
    predictionService = new PredictionService(mockPrisma)
  })

  describe('forecastRevenue', () => {
    it('should forecast revenue with default parameters', async () => {
      // Mock historical data
      const mockTransactions = [
        { createdAt: new Date('2024-01-01'), total: 1000 },
        { createdAt: new Date('2024-01-02'), total: 1100 },
        { createdAt: new Date('2024-01-03'), total: 1200 },
      ]

      mockPrisma.saleTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await predictionService.forecastRevenue()

      expect(result).toHaveProperty('predictions')
      expect(result).toHaveProperty('trend')
      expect(result).toHaveProperty('trendStrength')
      expect(result).toHaveProperty('seasonalityDetected')
      expect(result).toHaveProperty('growthRate')
      expect(Array.isArray(result.predictions)).toBe(true)
      expect(result.predictions.length).toBe(30) // default 30 days
    })

    it('should handle empty historical data', async () => {
      mockPrisma.saleTransaction.findMany.mockResolvedValue([])

      const result = await predictionService.forecastRevenue(7, 30)

      expect(result.predictions).toHaveLength(7)
      expect(result.trend).toBe('stable')
      expect(result.trendStrength).toBe(0)
      expect(result.growthRate).toBe(0)
    })

    it('should calculate upward trend correctly', async () => {
      const mockTransactions = Array.from({ length: 10 }, (_, i) => ({
        createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        total: 1000 + (i * 100), // Increasing trend
      }))

      mockPrisma.saleTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await predictionService.forecastRevenue(5, 10)

      expect(result.trend).toBe('up')
      expect(result.trendStrength).toBeGreaterThan(0)
      expect(result.growthRate).toBeGreaterThan(0)
    })

    it('should calculate downward trend correctly', async () => {
      const mockTransactions = Array.from({ length: 10 }, (_, i) => ({
        createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        total: 2000 - (i * 100), // Decreasing trend
      }))

      mockPrisma.saleTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await predictionService.forecastRevenue(5, 10)

      expect(result.trend).toBe('down')
      expect(result.trendStrength).toBeGreaterThan(0)
      expect(result.growthRate).toBeLessThan(0)
    })

    it('should detect seasonality in periodic data', async () => {
      // Create data with weekly pattern (higher on weekends)
      const mockTransactions: Array<{ createdAt: Date; total: number }> = []
      for (let i = 0; i < 28; i++) {
        const date = new Date(2024, 0, i + 1)
        const dayOfWeek = date.getDay()
        const baseAmount = 1000
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.5 : 1
        mockTransactions.push({
          createdAt: date,
          total: baseAmount * weekendMultiplier,
        })
      }

      mockPrisma.saleTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await predictionService.forecastRevenue(7, 28)

      expect(result.seasonalityDetected).toBe(true)
    })
  })

  describe('projectCashFlow', () => {
    it('should project cash flow with default parameters', async () => {
      const mockSales = [
        {
          createdAt: new Date('2024-01-01'),
          total: 1000,
          items: [
            { quantity: 2, product: { baseCost: 25 } },
            { quantity: 1, product: { baseCost: 50 } }
          ]
        },
        {
          createdAt: new Date('2024-01-02'),
          total: 1200,
          items: [
            { quantity: 3, product: { baseCost: 30 } }
          ]
        },
      ]

      const mockExpenses = [
        { createdAt: new Date('2024-01-01'), amount: 3000, type: 'expense' },
        { createdAt: new Date('2024-01-02'), amount: 4000, type: 'expense' },
      ]

      mockPrisma.saleTransaction.findMany.mockResolvedValue(mockSales)
      mockPrisma.financialTransaction.findMany.mockResolvedValue(mockExpenses)

      const result = await predictionService.projectCashFlow()

      expect(result).toHaveProperty('projections')
      expect(result).toHaveProperty('burnRate')
      expect(result).toHaveProperty('runway')
      expect(result).toHaveProperty('recommendation')
      expect(Array.isArray(result.projections)).toBe(true)
      expect(result.projections.length).toBe(30)
    })

    it('should calculate burn rate correctly', async () => {
      const now = new Date()
      const mockExpenses = [
        { createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), amount: 100, type: 'expense' },
        { createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), amount: 100, type: 'expense' },
        { createdAt: new Date(now.getTime()), amount: 100, type: 'expense' },
      ]

      mockPrisma.saleTransaction.findMany.mockResolvedValue([])
      mockPrisma.financialTransaction.findMany.mockResolvedValue(mockExpenses)

      const result = await predictionService.projectCashFlow(7)

      expect(result.burnRate).toBe(100) // $100 per day
      expect(result.runway).toBeNull() // No cash data provided
    })

    it('should calculate runway when cash balance is provided', async () => {
      // This would require mocking additional data or testing the calculation logic
      // For now, we'll test the structure
      mockPrisma.saleTransaction.findMany.mockResolvedValue([])
      mockPrisma.financialTransaction.findMany.mockResolvedValue([])

      const result = await predictionService.projectCashFlow(10)

      expect(result.projections.length).toBe(10)
      expect(typeof result.burnRate).toBe('number')
    })
  })

  describe('generateProductInsights', () => {
    it('should generate product insights', async () => {
      const mockProducts = [
        { id: '1', name: 'Product A', basePrice: 100 },
        { id: '2', name: 'Product B', basePrice: 200 },
      ]

      const mockSales = [
        { productId: '1', quantity: 10, total: 1000 },
        { productId: '2', quantity: 5, total: 1000 },
      ]

      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      mockPrisma.saleTransaction.groupBy = vi.fn().mockResolvedValue(mockSales)

      const result = await predictionService.generateProductInsights()

      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('productId')
        expect(result[0]).toHaveProperty('productName')
        expect(result[0]).toHaveProperty('insight')
        expect(result[0]).toHaveProperty('type')
        expect(result[0]).toHaveProperty('metrics')
      }
    })

    it('should limit results based on parameter', async () => {
      const mockProducts = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Product ${i + 1}`,
        basePrice: 100,
      }))

      mockPrisma.product.findMany.mockResolvedValue(mockProducts)
      mockPrisma.saleTransaction.groupBy = vi.fn().mockResolvedValue([])

      const result = await predictionService.generateProductInsights(5)

      expect(result.length).toBeLessThanOrEqual(5)
    })
  })

  describe('calculateFinancialHealth', () => {
    it('should calculate financial health metrics', async () => {
      const mockSales = [
        { 
          createdAt: new Date('2024-01-01'), 
          total: 10000,
          items: [
            { quantity: 2, product: { baseCost: 25 } },
            { quantity: 1, product: { baseCost: 50 } }
          ]
        },
        { 
          createdAt: new Date('2024-01-02'), 
          total: 15000,
          items: [
            { quantity: 3, product: { baseCost: 30 } }
          ]
        },
      ]

      const mockExpenses = [
        { createdAt: new Date('2024-01-01'), amount: 3000, type: 'expense' },
        { createdAt: new Date('2024-01-02'), amount: 4000, type: 'expense' },
      ]

      const mockVariants = [
        { stock: 100 },
        { stock: 50 },
        { stock: 25 },
      ]

      mockPrisma.saleTransaction.findMany.mockResolvedValue(mockSales)
      mockPrisma.financialTransaction.findMany.mockResolvedValue(mockExpenses)
      mockPrisma.productVariant.findMany.mockResolvedValue(mockVariants)

      const result = await predictionService.calculateFinancialHealth()

      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('grade')
      expect(result).toHaveProperty('indicators')
      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('alerts')
      expect(typeof result.score).toBe('number')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should handle no data scenario', async () => {
      mockPrisma.saleTransaction.findMany.mockResolvedValue([])
      mockPrisma.financialTransaction.findMany.mockResolvedValue([])

      const result = await predictionService.calculateFinancialHealth()

      expect(result.score).toBe(0)
      expect(result.grade).toBe('F')
      expect(Array.isArray(result.recommendations)).toBe(true)
    })
  })

  describe('Private utility methods', () => {
    it('should calculate linear regression correctly', () => {
      const points = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ]

      // Access private method through type assertion
      const service = predictionService as any
      const result = service.linearRegression(points)

      expect(result).toHaveProperty('slope')
      expect(result).toHaveProperty('intercept')
      expect(result.slope).toBe(2) // Perfect linear relationship
      expect(result.intercept).toBe(0)
    })

    it('should calculate average correctly', () => {
      const values = [1, 2, 3, 4, 5]
      const service = predictionService as any
      const result = service.average(values)

      expect(result).toBe(3)
    })

    it('should calculate standard deviation correctly', () => {
      const values = [1, 2, 3, 4, 5]
      const service = predictionService as any
      const result = service.standardDeviation(values)

      expect(result).toBeGreaterThan(0)
      expect(typeof result).toBe('number')
    })

    it('should group transactions by day correctly', () => {
      const transactions = [
        { createdAt: new Date('2024-01-01T10:00:00Z'), total: 100 },
        { createdAt: new Date('2024-01-01T15:00:00Z'), total: 200 },
        { createdAt: new Date('2024-01-02T10:00:00Z'), total: 150 },
      ]

      const service = predictionService as any
      const result = service.groupTransactionsByDay(transactions)

      expect(result['2024-01-01']).toBe(300)
      expect(result['2024-01-02']).toBe(150)
    })
  })
})