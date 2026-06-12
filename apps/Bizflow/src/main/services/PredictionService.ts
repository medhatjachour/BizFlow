/**
 * PredictionService
 * 
 * Provides financial forecasting and predictive analytics
 * Features:
 * - Revenue forecasting (linear regression)
 * - Demand prediction
 * - Seasonal trend analysis
 * - Growth rate projections
 * - Anomaly detection
 * - Cash flow predictions
 */

import type { PrismaClient } from '@prisma/client'
import { createLogger } from '../utils/logger'
const log = createLogger('Predictions')

export interface ForecastResult {
  predictions: Array<{
    date: string
    predictedRevenue: number
    confidence: number
    lowerBound: number
    upperBound: number
  }>
  trend: 'up' | 'down' | 'stable'
  trendStrength: number // 0-100
  seasonalityDetected: boolean
  growthRate: number // percentage
}

export interface CashFlowProjection {
  projections: Array<{
    date: string
    expectedInflow: number
    expectedOutflow: number
    netCashFlow: number
    cumulativeCash: number
  }>
  burnRate: number // $ per day
  runway: number | null // days until cash depletes
  recommendation: string
}

export interface ProductInsight {
  productId: string
  productName: string
  insight: string
  type: 'opportunity' | 'warning' | 'success'
  metrics: {
    sales: number
    revenue: number
    profitMargin: number
    trend: 'up' | 'down' | 'stable'
    velocityScore: number // 0-100
  }
  recommendations: string[]
}

export interface FinancialHealth {
  score: number // 0-100
  grade: string // A, B, C, D, F
  indicators: {
    profitMargin: { value: number; status: 'good' | 'fair' | 'poor' }
    inventoryTurnover: { value: number; status: 'good' | 'fair' | 'poor' }
    growthRate: { value: number; status: 'good' | 'fair' | 'poor' }
    cashPosition: { value: number; status: 'good' | 'fair' | 'poor' }
  }
  alerts: string[]
  recommendations: string[]
}

export class PredictionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Forecast revenue for next N days using linear regression
   */
  async forecastRevenue(days: number = 30, historicalDays: number = 90): Promise<ForecastResult> {
    try {
      // Get historical sales data from SaleTransaction
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - historicalDays)

      const transactions = await this.prisma.saleTransaction.findMany({
        where: {
          createdAt: {
            gte: startDate
          },
          status: 'completed'
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      // Group by day
      const dailySales = this.groupTransactionsByDay(transactions)
      const dataPoints = Object.entries(dailySales).map(([date, revenue], index) => ({
        x: index,
        y: revenue,
        date
      }))

   

      if (dataPoints.length < 3) {
        // Not enough data - return simple prediction based on any available data
        const avgRevenue = dataPoints.length > 0 
          ? this.average(dataPoints.map(p => p.y))
          : 0 // No data available
        
        const simplePredictions: Array<{
          date: string
          predictedRevenue: number
          confidence: number
          lowerBound: number
          upperBound: number
        }> = []
        const today = new Date()
        
        for (let i = 1; i <= days; i++) {
          const futureDate = new Date(today)
          futureDate.setDate(futureDate.getDate() + i)
          
          // Add slight random variation to avoid completely flat line
          const dailyVariation = avgRevenue * (0.95 + Math.random() * 0.1) // ±5% variation
          
          simplePredictions.push({
            date: futureDate.toISOString().split('T')[0],
            predictedRevenue: Math.max(100, dailyVariation),
            confidence: Math.max(30, 70 - i), // Low confidence
            lowerBound: Math.max(50, dailyVariation * 0.7),
            upperBound: dailyVariation * 1.3
          })
        }
        
        return {
          predictions: simplePredictions,
          trend: 'stable' as const,
          trendStrength: 0,
          seasonalityDetected: false,
          growthRate: 0
        }
      }

      // Calculate linear regression
      const { slope, intercept } = this.linearRegression(dataPoints)
      
      // Detect seasonality
      const seasonalityDetected = this.detectSeasonality(dataPoints)
      
      // Calculate growth rate with improved logic and safeguards
      let growthRate = 0
      const minRevenueThreshold = 100 // Need at least $100 avg revenue for meaningful growth calc
      
      if (dataPoints.length >= 14) {
        // Compare last 7 days to previous 7 days
        const recentAvg = this.average(dataPoints.slice(-7).map(p => p.y))
        const oldAvg = this.average(dataPoints.slice(-14, -7).map(p => p.y))
        
        // Only calculate if both periods have meaningful revenue
        if (oldAvg >= minRevenueThreshold && recentAvg >= minRevenueThreshold) {
          const rawGrowth = ((recentAvg - oldAvg) / oldAvg) * 100
          growthRate = Math.max(-200, Math.min(200, rawGrowth))
          if (rawGrowth !== growthRate) {
          }
        }
      } else if (dataPoints.length >= 7) {
        // Compare last half to first half
        const midpoint = Math.floor(dataPoints.length / 2)
        const recentAvg = this.average(dataPoints.slice(midpoint).map(p => p.y))
        const oldAvg = this.average(dataPoints.slice(0, midpoint).map(p => p.y))
        
        // Only calculate if both periods have meaningful revenue
        if (oldAvg >= minRevenueThreshold && recentAvg >= minRevenueThreshold) {
          growthRate = ((recentAvg - oldAvg) / oldAvg) * 100
          // Cap extreme values at ±200%
          growthRate = Math.max(-200, Math.min(200, growthRate))
        }
      } else {
        // Not enough data - use slope to estimate growth
        const avgRevenue = this.average(dataPoints.map(p => p.y))
        if (avgRevenue >= minRevenueThreshold) {
          growthRate = (slope * 7 / avgRevenue) * 100 // Weekly growth as percentage
          // Cap extreme values
          growthRate = Math.max(-200, Math.min(200, growthRate))
        }
      }

      // Determine trend
      const trend = slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable'
      const trendStrength = Math.min(100, Math.abs(slope) * 20)

      // Calculate standard deviation for confidence intervals
      const predictions = dataPoints.map(p => slope * p.x + intercept)
      const stdDev = this.standardDeviation(
        dataPoints.map((p, i) => p.y - predictions[i])
      )

      // Generate predictions
      const forecastPredictions: Array<{
        date: string
        predictedRevenue: number
        confidence: number
        lowerBound: number
        upperBound: number
      }> = []
      const lastX = dataPoints.length - 1
      const today = new Date()

      // Use recent average as baseline for more realistic predictions
      const avgRevenue = this.average(dataPoints.slice(-Math.min(7, dataPoints.length)).map(p => p.y))
      const isVeryFlatTrend = Math.abs(slope) < 0.5
      
      
      for (let i = 1; i <= days; i++) {
        const x = lastX + i
        let predictedRevenue = slope * x + intercept
        
        // If trend is very flat or prediction is unrealistic, use enhanced average
        if (isVeryFlatTrend || predictedRevenue < avgRevenue * 0.5 || predictedRevenue > avgRevenue * 2) {
          // Use average with realistic daily variance based on historical volatility
          const historicalStdDev = stdDev > 0 ? stdDev : avgRevenue * 0.1
          const weeklyPattern = Math.sin((i - 1) / 7 * Math.PI * 2) * historicalStdDev * 0.3
          const randomNoise = (Math.random() - 0.5) * historicalStdDev * 0.2
          predictedRevenue = avgRevenue + weeklyPattern + randomNoise
        }
        
        // Apply confidence interval (95% = ±1.96 std dev)
        // Increase margin for longer predictions
        const dayFactor = 1 + (i / days) * 0.5 // Grows from 1 to 1.5
        const effectiveStdDev = Math.max(stdDev, avgRevenue * 0.05) // Minimum 5% margin
        const margin = 1.96 * effectiveStdDev * dayFactor
        
        const futureDate = new Date(today)
        futureDate.setDate(futureDate.getDate() + i)

        forecastPredictions.push({
          date: futureDate.toISOString().split('T')[0],
          predictedRevenue: Math.max(0, predictedRevenue),
          confidence: Math.max(20, 100 - (i * 1.2)), // Minimum 20% confidence
          lowerBound: Math.max(0, predictedRevenue - margin),
          upperBound: Math.max(0, predictedRevenue + margin)
        })
      }

      return {
        predictions: forecastPredictions,
        trend,
        trendStrength,
        seasonalityDetected,
        growthRate
      }
    } catch (error) {
      log.error('Error forecasting revenue:', error)
      throw error
    }
  }

  /**
   * Project cash flow for next N days
   */
  async projectCashFlow(days: number = 30): Promise<CashFlowProjection> {
    try {
      // Get forecast
      const forecast = await this.forecastRevenue(days)
      
      // Get historical sales to calculate COGS percentage and expenses
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const transactions = await this.prisma.saleTransaction.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          },
          status: 'completed'
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Get operational expenses from FinancialTransaction table
      const expenses = await this.prisma.financialTransaction.findMany({
        where: {
          type: 'expense',
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      })

      // Calculate COGS as percentage of revenue (more accurate than fixed average)
      const totalRevenue = transactions.reduce((sum, txn) => sum + txn.total, 0)
      let totalCOGS = 0
      transactions.forEach(txn => {
        txn.items.forEach(item => {
          totalCOGS += item.quantity * item.product.baseCost
        })
      })
      const cogsPercentage = totalRevenue > 0 ? totalCOGS / totalRevenue : 0.5 // Default to 50% if no data
      
      // Calculate average daily operational expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const expenseDays = expenses.length > 0 ? expenses.length : 30
      const avgDailyExpenses = totalExpenses / expenseDays


      // Calculate current cash position from recent revenue minus all costs
      let cumulativeCash = totalRevenue - totalCOGS - totalExpenses

      // Project cash flow with variable COGS based on forecasted revenue
      const projections = forecast.predictions.map(pred => {
        const expectedInflow = pred.predictedRevenue
        // COGS scales with revenue + fixed operational expenses
        const expectedCOGS = expectedInflow * cogsPercentage
        const expectedOutflow = expectedCOGS + avgDailyExpenses
        const netCashFlow = expectedInflow - expectedOutflow
        cumulativeCash += netCashFlow

        return {
          date: pred.date,
          expectedInflow,
          expectedOutflow,
          netCashFlow,
          cumulativeCash
        }
      })

      // Calculate burn rate (average daily loss)
      const avgNetCashFlow = this.average(projections.map(p => p.netCashFlow))
      const burnRate = avgDailyExpenses

      // Calculate runway
      let runway: number | null = null
      if (burnRate > 0 && cumulativeCash > 0) {
        runway = Math.floor(cumulativeCash / burnRate)
      }

      // Generate recommendation
      let recommendation = ''
      if (runway !== null && runway < 30) {
        recommendation = `⚠️ Cash runway is critically low (${runway} days). Immediate action required.`
      } else if (avgNetCashFlow < 0) {
        recommendation = '⚠️ Negative cash flow detected. Consider cost reduction or revenue increase strategies.'
      } else {
        recommendation = '✅ Cash flow is positive. Consider reinvesting in growth.'
      }

      return {
        projections,
        burnRate,
        runway,
        recommendation
      }
    } catch (error) {
      log.error('Error projecting cash flow:', error)
      throw error
    }
  }

  /**
   * Generate smart insights for products
   */
  async generateProductInsights(limit: number = 10): Promise<ProductInsight[]> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      // Get sales data from SaleTransaction
      const [recentTransactions, olderTransactions] = await Promise.all([
        this.prisma.saleTransaction.findMany({
          where: { 
            createdAt: { gte: thirtyDaysAgo },
            status: 'completed'
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }),
        this.prisma.saleTransaction.findMany({
          where: {
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            status: 'completed'
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        })
      ])

      // Aggregate by product from transaction items
      const productMetrics = new Map<string, {
        productId: string
        productName: string
        recentSales: number
        recentRevenue: number
        olderSales: number
        olderRevenue: number
        totalCost: number
        totalProfit: number
      }>()

      // Process recent transactions
      recentTransactions.forEach(txn => {
        txn.items.forEach(item => {
          const key = item.product.id
          if (!productMetrics.has(key)) {
            productMetrics.set(key, {
              productId: item.product.id,
              productName: item.product.name,
              recentSales: 0,
              recentRevenue: 0,
              olderSales: 0,
              olderRevenue: 0,
              totalCost: 0,
              totalProfit: 0
            })
          }
          const metrics = productMetrics.get(key)!
          const cost = item.quantity * item.product.baseCost
          const profit = item.total - cost
          
          metrics.recentSales += item.quantity
          metrics.recentRevenue += item.total
          metrics.totalCost += cost
          metrics.totalProfit += profit
        })
      })

      // Process older transactions
      olderTransactions.forEach(txn => {
        txn.items.forEach(item => {
          const key = item.product.id
          if (productMetrics.has(key)) {
            const metrics = productMetrics.get(key)!
            metrics.olderSales += item.quantity
            metrics.olderRevenue += item.total
          }
        })
      })

      // Generate comprehensive insights with multi-factor analysis
      const insights: ProductInsight[] = []

      productMetrics.forEach((metrics) => {
        // Calculate key metrics
        const profitMargin = metrics.recentRevenue > 0 
          ? (metrics.totalProfit / metrics.recentRevenue) * 100 
          : 0
          
        const salesChange = metrics.olderSales > 0 
          ? ((metrics.recentSales - metrics.olderSales) / metrics.olderSales) * 100
          : metrics.recentSales > 0 ? 100 : 0

        // Enhanced trend detection
        const trend: 'up' | 'down' | 'stable' = 
          salesChange > 15 ? 'up' : 
          salesChange < -15 ? 'down' : 
          'stable'

        // Velocity score: how fast product sells (units per day as percentage of ideal)
        const unitsPerDay = metrics.recentSales / 30
        const velocityScore = Math.min(100, unitsPerDay * 20) // 5 units/day = 100%

        let insight = ''
        let type: 'opportunity' | 'warning' | 'success' = 'success'
        const recommendations: string[] = []

        // Multi-factor analysis for better insights
        
        // Best Performers
        if (trend === 'up' && profitMargin > 35 && velocityScore > 50) {
          insight = `🏆 Star product! ${salesChange.toFixed(0)}% growth, ${profitMargin.toFixed(0)}% margin, high demand`
          type = 'success'
          recommendations.push(`Stock up: currently selling ${unitsPerDay.toFixed(1)} units/day`)
          recommendations.push('Feature prominently in store/website')
          recommendations.push('Consider premium positioning or slight price increase')
          recommendations.push('Create product bundles to boost related items')
        }
        // High Margin Opportunities
        else if (profitMargin > 40 && velocityScore < 50 && trend !== 'down') {
          insight = `💎 Hidden gem: ${profitMargin.toFixed(0)}% margins but underperforming sales`
          type = 'opportunity'
          recommendations.push('Increase visibility with better placement')
          recommendations.push('Run targeted promotions to boost volume')
          recommendations.push('Improve product photos/descriptions')
          recommendations.push(`Current: ${unitsPerDay.toFixed(1)} units/day - target 3-5/day`)
        }
        // Rapid Growth
        else if (trend === 'up' && salesChange > 50) {
          insight = `🚀 Trending: ${salesChange.toFixed(0)}% growth! Customer demand surging`
          type = 'success'
          recommendations.push(`High demand: ${unitsPerDay.toFixed(1)} units/day and growing`)
          recommendations.push('Ensure adequate stock to avoid stockouts')
          recommendations.push('Consider raising price by 10-15%')
          recommendations.push('Analyze what makes this product successful')
        }
        // Declining Sales
        else if (trend === 'down' && salesChange < -30) {
          insight = `📉 Steep decline: ${Math.abs(salesChange).toFixed(0)}% drop. Urgent action needed`
          type = 'warning'
          recommendations.push('Run clearance promotion (20-30% off)')
          recommendations.push('Review: Has price/quality/competition changed?')
          recommendations.push('Consider discontinuing if no improvement in 2 weeks')
          recommendations.push(`Down from ${(unitsPerDay * (1 + Math.abs(salesChange)/100)).toFixed(1)} to ${unitsPerDay.toFixed(1)} units/day`)
        }
        // Moderate Decline
        else if (trend === 'down') {
          insight = `⚠️ Softening demand: ${Math.abs(salesChange).toFixed(0)}% decline`
          type = 'warning'
          recommendations.push('Test promotional pricing (10-15% off)')
          recommendations.push('Refresh product images and descriptions')
          recommendations.push('Bundle with popular items')
          recommendations.push('Reduce reorder quantity by 30%')
        }
        // Slow Movers
        else if (velocityScore < 15 && metrics.recentSales > 0) {
          insight = `🐌 Slow seller: Only ${unitsPerDay.toFixed(1)} units/day, low turnover`
          type = 'warning'
          recommendations.push('Mark down 25-40% to clear inventory')
          recommendations.push('Stop reordering until stock < 10 units')
          recommendations.push('Consider: Is this product still relevant?')
          recommendations.push('Free up cash/space for better-performing items')
        }
        // Dead Stock
        else if (metrics.recentSales === 0 && metrics.olderSales > 0) {
          insight = `❌ Dead stock: Zero sales this month (had ${metrics.olderSales} last month)`
          type = 'warning'
          recommendations.push('Immediate clearance: 40-50% discount')
          recommendations.push('Consider donating/liquidating if still no sales')
          recommendations.push('Discontinue and remove from inventory')
        }
        // New Products
        else if (metrics.olderSales === 0 && metrics.recentSales > 5) {
          insight = `✨ New arrival performing well: ${metrics.recentSales} sales already!`
          type = 'success'
          recommendations.push('Monitor closely - early signs are positive')
          recommendations.push('Gather customer feedback')
          recommendations.push('Consider expanding similar product line')
        }
        // Stable High Performers
        else if (trend === 'stable' && metrics.recentRevenue > 500 && profitMargin > 25) {
          insight = `⭐ Steady earner: Consistent $${metrics.recentRevenue.toFixed(0)} revenue, ${profitMargin.toFixed(0)}% margin`
          type = 'success'
          recommendations.push('Core product - maintain stock levels')
          recommendations.push('Test slight price increase (5%)')
          recommendations.push(`Reliable ${unitsPerDay.toFixed(1)} units/day`)
        }
        // Low Margin High Volume
        else if (profitMargin < 20 && velocityScore > 40) {
          insight = `⚡ Volume seller but low ${profitMargin.toFixed(0)}% margin - losing money?`
          type = 'warning'
          recommendations.push('Increase price by 10-20% to improve margins')
          recommendations.push('Negotiate better supplier cost')
          recommendations.push('High volume (${unitsPerDay.toFixed(1)}/day) means price increase won\'t hurt much')
        }

        // Only add insights that have actionable recommendations
        if (insight && recommendations.length > 0) {
          insights.push({
            productId: metrics.productId,
            productName: metrics.productName,
            insight,
            type,
            metrics: {
              sales: metrics.recentSales,
              revenue: metrics.recentRevenue,
              profitMargin,
              trend,
              velocityScore
            },
            recommendations
          })
        }
      })

      // Sort by priority: warnings first, then opportunities, then successes
      // Within each type, sort by revenue
      insights.sort((a, b) => {
        const typeOrder = { warning: 0, opportunity: 1, success: 2 }
        if (typeOrder[a.type] !== typeOrder[b.type]) {
          return typeOrder[a.type] - typeOrder[b.type]
        }
        return b.metrics.revenue - a.metrics.revenue
      })

      return insights.slice(0, limit)
    } catch (error) {
      log.error('Error generating product insights:', error)
      throw error
    }
  }

  /**
   * Calculate overall financial health score
   */
  async calculateFinancialHealth(): Promise<FinancialHealth> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [transactions, expenses] = await Promise.all([
        this.prisma.saleTransaction.findMany({
          where: { 
            createdAt: { gte: thirtyDaysAgo },
            status: 'completed'
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }),
        this.prisma.financialTransaction.findMany({
          where: { 
            type: 'expense',
            createdAt: { gte: thirtyDaysAgo } 
          }
        })
      ])

      // Calculate profit metrics including operational expenses from SaleTransaction
      const totalRevenue = transactions.reduce((sum, txn) => sum + txn.total, 0)
      
      // Calculate COGS from transaction items
      let totalCOGS = 0
      let totalUnitsSold = 0
      transactions.forEach(txn => {
        txn.items.forEach(item => {
          const cost = item.quantity * item.product.baseCost
          totalCOGS += cost
          totalUnitsSold += item.quantity
        })
      })
      
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
      const grossProfit = totalRevenue - totalCOGS
      const netProfit = grossProfit - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0


      // Calculate inventory turnover - using product variants stock
      const variants = await this.prisma.productVariant.findMany({
        select: { stock: true }
      })
      
      // Calculate total current inventory across all variants
      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)
      const avgInventory = totalStock > 0 ? totalStock : 1 // Use total stock as "average" inventory level
      
      // Turnover = Units Sold / Total Inventory (annualized from 30 days to yearly)
      // Formula: (Units Sold in 30 days / Current Inventory) × (365 / 30)
      const inventoryTurnover = avgInventory > 0 ? (totalUnitsSold / avgInventory) * (365 / 30) : 0
      

      // Get growth rate from revenue forecast - use same 30 days as other metrics
      const forecast = await this.forecastRevenue(30, 30)
      const growthRate = forecast.growthRate

      // Calculate cash position (net profit represents available cash from operations)
      const cashPosition = netProfit

      // Calculate additional helpful metrics
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
      const cogsRatio = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0


      // Evaluate each indicator with industry-standard thresholds
      const indicators = {
        profitMargin: {
          value: profitMargin,
          status: (profitMargin >= 20 ? 'good' : profitMargin >= 10 ? 'fair' : 'poor') as 'good' | 'fair' | 'poor'
        },
        inventoryTurnover: {
          value: inventoryTurnover,
          status: (inventoryTurnover >= 6 ? 'good' : inventoryTurnover >= 3 ? 'fair' : 'poor') as 'good' | 'fair' | 'poor'
        },
        growthRate: {
          value: growthRate,
          status: (growthRate >= 15 ? 'good' : growthRate >= 5 ? 'fair' : 'poor') as 'good' | 'fair' | 'poor'
        },
        cashPosition: {
          value: cashPosition,
          status: (cashPosition >= totalExpenses * 2 ? 'good' : cashPosition >= totalExpenses ? 'fair' : 'poor') as 'good' | 'fair' | 'poor'
        }
      }

      // Calculate overall score
      const weights = { profitMargin: 30, inventoryTurnover: 25, growthRate: 25, cashPosition: 20 }
      const statusScores = { good: 100, fair: 60, poor: 30 }
      
      // If no data available, score is 0
      const hasData = totalRevenue > 0 || totalExpenses > 0 || totalUnitsSold > 0
      const score = hasData ? Math.round(
        (statusScores[indicators.profitMargin.status] * weights.profitMargin +
         statusScores[indicators.inventoryTurnover.status] * weights.inventoryTurnover +
         statusScores[indicators.growthRate.status] * weights.growthRate +
         statusScores[indicators.cashPosition.status] * weights.cashPosition) / 100
      ) : 0

      // Generate comprehensive alerts and recommendations
      const alerts: string[] = []
      const recommendations: string[] = []

      // Profit Margin Analysis
      if (indicators.profitMargin.status === 'poor') {
        if (profitMargin < 0) {
          alerts.push('🚨 Critical: Operating at a loss! Net profit is negative.')
          recommendations.push('Immediate action required: Review all costs and pricing')
          recommendations.push('Consider pausing low-margin products')
          recommendations.push('Negotiate better supplier rates or find alternatives')
        } else {
          alerts.push('⚠️ Low profit margins detected (below 10%)')
          recommendations.push('Increase prices by 5-10% on high-demand products')
          recommendations.push('Reduce operational expenses where possible')
          recommendations.push('Focus on selling high-margin items')
        }
      } else if (indicators.profitMargin.status === 'fair') {
        recommendations.push('Good progress! Aim for 20%+ margins by optimizing costs')
      }

      // Inventory Turnover Analysis
      if (indicators.inventoryTurnover.status === 'poor') {
        alerts.push('⚠️ Slow inventory turnover (below 3x annually)')
        recommendations.push('Run promotions on slow-moving inventory')
        recommendations.push('Reduce reorder quantities by 30-50%')
        recommendations.push('Consider seasonal clearance sales')
      } else if (indicators.inventoryTurnover.status === 'fair') {
        recommendations.push('Inventory moving steadily. Target 6+ turns per year.')
      } else {
        recommendations.push('Excellent inventory velocity! Monitor for stockouts.')
      }

      // Growth Rate Analysis
      if (indicators.growthRate.status === 'poor') {
        if (growthRate < 0) {
          alerts.push('🚨 Revenue declining! Sales are down vs. previous period.')
          recommendations.push('Launch customer retention campaigns immediately')
          recommendations.push('Analyze why customers are not returning')
          recommendations.push('Review competitor pricing and offerings')
        } else {
          alerts.push('⚠️ Stagnant growth (below 5%)')
          recommendations.push('Invest in marketing and customer acquisition')
          recommendations.push('Introduce new products or services')
          recommendations.push('Explore new sales channels (online, B2B, etc.)')
        }
      } else if (indicators.growthRate.status === 'fair') {
        recommendations.push('Growing steadily. Push for 15%+ growth with marketing.')
      }

      // Cash Position Analysis
      if (indicators.cashPosition.status === 'poor') {
        alerts.push('⚠️ Low cash reserves (less than 1 month expenses)')
        recommendations.push('Prioritize collecting outstanding payments')
        recommendations.push('Consider a line of credit for emergencies')
        recommendations.push('Reduce non-essential expenses immediately')
      } else if (indicators.cashPosition.status === 'fair') {
        recommendations.push('Adequate cash reserves. Build to 2-3 months of expenses.')
      } else {
        recommendations.push('Strong cash position! Consider reinvesting in growth.')
      }

      // Additional context-based recommendations
      if (expenseRatio > 40) {
        alerts.push('⚠️ High expense ratio (operating costs over 40% of revenue)')
        recommendations.push('Audit all expenses and eliminate non-essentials')
      }

      if (cogsRatio > 60) {
        alerts.push('⚠️ High cost of goods (COGS over 60% of revenue)')
        recommendations.push('Negotiate better supplier pricing')
        recommendations.push('Consider alternative suppliers')
      }

      // Determine grade based on score
      const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F'

      return {
        score,
        grade,
        indicators,
        alerts,
        recommendations
      }
    } catch (error) {
      log.error('Error calculating financial health:', error)
      throw error
    }
  }

  // ========== HELPER METHODS ==========

  private groupTransactionsByDay(transactions: any[]): Record<string, number> {
    const grouped: Record<string, number> = {}
    
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0]
      grouped[date] = (grouped[date] || 0) + txn.total
    })

    return grouped
  }

  private linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
    const n = points.length
    const sumX = points.reduce((sum, p) => sum + p.x, 0)
    const sumY = points.reduce((sum, p) => sum + p.y, 0)
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0)
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  private detectSeasonality(points: Array<{ x: number; y: number }>): boolean {
    // Simple seasonality detection using autocorrelation
    // If we have enough data (>= 28 days), check for weekly patterns
    if (points.length < 28) return false

    const values = points.map(p => p.y)
    const weeklyLag = 7
    
    const correlation = this.autocorrelation(values, weeklyLag)
    
    // If correlation > 0.5, we have weekly seasonality
    return Math.abs(correlation) > 0.5
  }

  private autocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0

    const mean = this.average(values)
    const subset = values.slice(lag)
    const originalSubset = values.slice(0, -lag)

    let numerator = 0
    let denominator = 0

    for (let i = 0; i < subset.length; i++) {
      numerator += (subset[i] - mean) * (originalSubset[i] - mean)
      denominator += (originalSubset[i] - mean) ** 2
    }

    return denominator !== 0 ? numerator / denominator : 0
  }

  private average(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
  }

  private standardDeviation(values: number[]): number {
    const avg = this.average(values)
    const squaredDiffs = values.map(v => (v - avg) ** 2)
    const variance = this.average(squaredDiffs)
    return Math.sqrt(variance)
  }
}
