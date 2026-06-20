import { registerRecipeHandlers } from './recipes'
import { registerProductionHandlers } from './production'
import { registerPantryHandlers } from './pantry'
import { registerWasteHandlers } from './waste'
import { registerScheduleHandlers } from './schedule'
import { registerAnalyticsHandlers } from './analytics'
import { registerSalesHandlers } from './sales'
import { registerBakeryExpenseHandlers } from './expenses'

export function registerBakeryHandlers(prisma: any) {
  registerRecipeHandlers(prisma)
  registerProductionHandlers(prisma)
  registerPantryHandlers(prisma)
  registerWasteHandlers(prisma)
  registerScheduleHandlers(prisma)
  registerAnalyticsHandlers(prisma)
  registerSalesHandlers(prisma)
  registerBakeryExpenseHandlers(prisma)
}
