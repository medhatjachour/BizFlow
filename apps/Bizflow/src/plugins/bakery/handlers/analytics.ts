/**
 * Bakery analytics IPC handlers — barrel.
 *
 * Grouped by responsibility into sibling modules; this barrel keeps the public
 * entry point `registerAnalyticsHandlers(prisma)` unchanged.
 *
 *   analytics.profitLoss.ts  – getProfitLoss / getProfitLossTrend
 *   analytics.production.ts  – getExpiringBatches / getProductionRequirements / getEndOfDaySuggestion
 *   analytics.overview.ts    – getDailyOverview
 */
import { registerBakeryProfitLossHandlers } from './analytics.profitLoss'
import { registerBakeryProductionHandlers } from './analytics.production'
import { registerBakeryOverviewHandlers } from './analytics.overview'

export function registerAnalyticsHandlers(prisma: any) {
  // Profit & loss reporting
  registerBakeryProfitLossHandlers(prisma)

  // Production planning
  registerBakeryProductionHandlers(prisma)

  // Daily overview
  registerBakeryOverviewHandlers(prisma)
}
