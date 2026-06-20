/**
 * Warehouse operations IPC handlers — barrel.
 *
 * Grouped by responsibility into sibling modules; this barrel keeps the public
 * entry point `registerWarehouseOperationsHandlers(prisma)` unchanged.
 *
 *   operations.shared.ts    – stage helpers + order-number generator
 *   operations.queries.ts   – getOrders / getJourneyBoard
 *   operations.lifecycle.ts – createOrder / updateOrderStatus / advanceOrderStage / processOrder
 */
import { registerWarehouseOrderQueryHandlers } from './operations.queries'
import { registerWarehouseOrderLifecycleHandlers } from './operations.lifecycle'

export function registerWarehouseOperationsHandlers(prisma: any) {
  // Order queries
  registerWarehouseOrderQueryHandlers(prisma)

  // Order lifecycle
  registerWarehouseOrderLifecycleHandlers(prisma)
}

