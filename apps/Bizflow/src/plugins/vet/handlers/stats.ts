/**
 * Vet stats IPC handlers — barrel.
 *
 * Grouped by responsibility into sibling modules; this barrel keeps the public
 * entry point `registerVetStatsHandlers(prisma)` unchanged.
 *
 *   stats.overview.ts  – overview KPIs
 *   stats.clinical.ts  – topDiagnoses / visitTrend / speciesBreakdown / monthlyTrend
 *   stats.sales.ts     – profitAnalysis / salesBreakdown
 */
import { registerVetStatsOverviewHandlers } from './stats.overview'
import { registerVetStatsClinicalHandlers } from './stats.clinical'
import { registerVetStatsSalesHandlers } from './stats.sales'
import { registerVetStatsInventoryHandlers } from './stats.inventory'

export function registerVetStatsHandlers(prisma: any) {
  registerVetStatsOverviewHandlers(prisma)
  registerVetStatsClinicalHandlers(prisma)
  registerVetStatsSalesHandlers(prisma)
  registerVetStatsInventoryHandlers(prisma)
}
