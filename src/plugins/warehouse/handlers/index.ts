import { registerLocationHandlers } from './locations'
import { registerStockHandlers } from './stock'
import { registerTransferHandlers } from './transfers'
import { registerWarehouseOverviewHandlers } from './overview'
import { registerWarehouseOperationsHandlers } from './operations'

export function registerWarehouseHandlers(prisma: any) {
  registerLocationHandlers(prisma)
  registerStockHandlers(prisma)
  registerTransferHandlers(prisma)
  registerWarehouseOverviewHandlers(prisma)
  registerWarehouseOperationsHandlers(prisma)
}
