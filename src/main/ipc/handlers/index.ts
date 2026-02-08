/**
 * IPC Handlers Index - better-sqlite3 Version
 * Centralizes registration of all domain-specific handlers
 */

import { registerAuthHandlers } from './auth.handlers'
import { registerDashboardHandlers } from './dashboard.handlers'
import { registerSalesHandlers } from './sales.handlers'
import { registerSaleTransactionHandlers } from './sale-transactions.handlers'
import { registerInventoryHandlers } from './inventory.handlers'
import { registerFinanceHandlers } from './finance.handlers'
import { registerProductsHandlers } from './products.handlers'
import { registerCategoriesHandlers } from './categories.handlers'
import { registerStoresHandlers } from './stores.handlers'
import { registerEmployeesHandlers } from './employees.handlers'
import { registerCustomersHandlers } from './customers.handlers'
import { registerSearchHandlers } from './search.handlers'
import { registerUserHandlers } from './user.handlers'
import { registerReportsHandlers } from './reports.handlers'
import { registerAnalyticsHandlers } from './analytics.handlers'
import { registerDeleteHandlers } from './delete.handlers'
import { registerStockMovementHandlers } from './stock-movements.handlers'
import { registerInstallmentsHandlers } from './installments.handlers'
import { registerReceiptHandlers } from './receipts.handlers'
import { registerEmailHandlers } from './email.handlers'
import './backup.handlers' // Import backup handlers (self-contained, no registration needed)
import { setupReorderHandlers } from './reorder.handlers'
import { registerSupplierHandlers } from './suppliers.handlers'
import { setupPurchaseOrderHandlers } from './purchase-orders.handlers'
import { registerReceiptHandlers as registerThermalReceiptHandlers } from './receipt.handlers'
import { registerBarcodePrintHandlers } from './barcode.handlers'

/**
 * Register all IPC handlers
 * Call this function once during Electron app initialization
 */
export function registerAllHandlers() {
  console.log('[Handlers] Registering all IPC handlers with better-sqlite3...')
  
  registerAuthHandlers()
  registerDashboardHandlers()
  registerSalesHandlers()
  registerSaleTransactionHandlers()
  registerInventoryHandlers()
  registerFinanceHandlers()
  registerProductsHandlers()
  registerCategoriesHandlers()
  registerStoresHandlers()
  registerEmployeesHandlers()
  registerCustomersHandlers()
  registerSearchHandlers()
  registerUserHandlers()
  registerReportsHandlers()
  registerInstallmentsHandlers() // Includes deposits handlers
  registerReceiptHandlers()
  registerAnalyticsHandlers()
  registerEmailHandlers()
  setupReorderHandlers()
  registerSupplierHandlers()
  registerThermalReceiptHandlers()
  registerBarcodePrintHandlers()
  setupPurchaseOrderHandlers()
  registerDeleteHandlers()
  registerStockMovementHandlers()
  
  console.log('✅ All IPC handlers registered successfully with better-sqlite3')
}
