/**
 * Commerce Plugin – Handler Registration
 *
 * Thin wrapper that calls every commerce-domain IPC handler registration
 * function from src/main/ipc/handlers/.
 *
 * Handlers live in the main handlers directory because:
 *   a) They were originally kernel-level code before commerce became a plugin.
 *   b) They are large individual files (products, sales, inventory, etc.) which
 *      are easier to maintain in-place than duplicated inside the plugin folder.
 *
 * This file is the single wiring point — adding a new commerce handler means
 * adding one import + one call here.
 */

import { registerSalesHandlers }              from '../../../main/ipc/handlers/sales.handlers'
import { registerSaleTransactionHandlers }     from '../../../main/ipc/handlers/sale-transactions.handlers'
import { registerInventoryHandlers }           from '../../../main/ipc/handlers/inventory.handlers'
import { registerProductsHandlers }            from '../../../main/ipc/handlers/products.handlers'
import { registerCategoriesHandlers }          from '../../../main/ipc/handlers/categories.handlers'
import { registerStoresHandlers }              from '../../../main/ipc/handlers/stores.handlers'
import { registerDepositsHandlers }            from '../../../main/ipc/handlers/deposits.handlers'
import { registerInstallmentsHandlers }        from '../../../main/ipc/handlers/installments.handlers'
import { registerReceiptHandlers }             from '../../../main/ipc/handlers/receipts.handlers'
import { setupReorderHandlers }                from '../../../main/ipc/handlers/reorder.handlers'
import { registerSupplierHandlers }            from '../../../main/ipc/handlers/suppliers.handlers'
import { setupPurchaseOrderHandlers }          from '../../../main/ipc/handlers/purchase-orders.handlers'
import { registerReceiptHandlers as registerThermalReceiptHandlers } from '../../../main/ipc/handlers/receipt.handlers'
import { registerBarcodePrintHandlers }        from '../../../main/ipc/handlers/barcode.handlers'
import { registerStockMovementHandlers }       from '../../../main/ipc/handlers/stock-movements.handlers'
import { registerDeleteHandlers }              from '../../../main/ipc/handlers/delete.handlers'
import { registerCommerceExpenseHandlers }     from '../../../main/ipc/handlers/commerce-expenses.handlers'

export function registerCommerceHandlers(prisma: any): void {
  registerProductsHandlers(prisma)
  registerCategoriesHandlers(prisma)
  registerInventoryHandlers(prisma)
  registerStockMovementHandlers(prisma)
  registerSalesHandlers(prisma)
  registerSaleTransactionHandlers(prisma)
  registerStoresHandlers(prisma)
  registerDepositsHandlers(prisma)
  registerInstallmentsHandlers(prisma)
  registerReceiptHandlers(prisma)
  setupReorderHandlers(prisma)
  registerSupplierHandlers(prisma)
  setupPurchaseOrderHandlers(prisma)
  registerThermalReceiptHandlers()
  registerBarcodePrintHandlers()
  registerDeleteHandlers(prisma)
  registerCommerceExpenseHandlers(prisma)
}
