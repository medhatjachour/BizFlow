/**
 * IPC Handlers Index
 * Centralizes registration of all domain-specific handlers
 */

import path from 'node:path'
import { getDatabasePath } from '../../database/init'
import { seedProductionDatabase } from '../../database/seed-production'
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
import { registerDepositsHandlers } from './deposits.handlers'
import { registerInstallmentsHandlers } from './installments.handlers'
import { registerReceiptHandlers } from './receipts.handlers'
import { registerEmailHandlers } from './email.handlers'
import './backup.handlers' // Import backup handlers (self-contained, no registration needed)
import { setupReorderHandlers } from './reorder.handlers'
import { registerSupplierHandlers } from './suppliers.handlers'
import { setupPurchaseOrderHandlers } from './purchase-orders.handlers'
import { registerReceiptHandlers as registerThermalReceiptHandlers } from './receipt.handlers'
import { registerBarcodePrintHandlers } from './barcode.handlers'
import { registerLogHandlers } from './log.handlers'
import { registerModuleHandlers } from './module.handlers'
import type { IPlugin } from '../../../shared/interfaces/IPlugin'
import BakeryPlugin from '../../../plugins/bakery/index'
import RestaurantPlugin from '../../../plugins/restaurant/index'
import WarehousePlugin from '../../../plugins/warehouse/index'
import ClinicPlugin from '../../../plugins/clinic/index'
import { createLogger } from '../../utils/logger'

const log = createLogger('Database')

/**
 * Plugins that were compiled into this build (controlled by ENABLED_MODULES
 * at build time via electron.vite.config.ts define flags).
 * Dead-code elimination removes entries for disabled plugins.
 */
const ALL_PLUGINS: IPlugin[] = [
  ...(__PLUGIN_BAKERY__     ? [BakeryPlugin]     : []),
  ...(__PLUGIN_RESTAURANT__ ? [RestaurantPlugin] : []),
  ...(__PLUGIN_WAREHOUSE__  ? [WarehousePlugin]  : []),
  ...(__PLUGIN_CLINIC__     ? [ClinicPlugin]     : []),
]

// Initialize Prisma client
let isSeeded = false
export let prisma: any = null
try {
  // In dev mode, use generated Prisma from src/generated/prisma
  // In production, use the packed src/generated/prisma (unpacked by electron-builder)
  const isDev = process.env.NODE_ENV === 'development'
  let PrismaClient
  
  if (isDev) {
    const prismaPath = path.resolve(process.cwd(), 'src', 'generated', 'prisma')
    PrismaClient = require(prismaPath).PrismaClient
  } else {
    // In production, use the unpacked src/generated/prisma
    // __dirname in production is: /opt/BizFlow/resources/app.asar/out/main
    const prismaPath = path.resolve(__dirname, '..', '..', '..', 'app.asar.unpacked', 'src', 'generated', 'prisma')
    log.info('[Database] [PROD] Loading Prisma from:', prismaPath)
    PrismaClient = require(prismaPath).PrismaClient
  }
  if (PrismaClient) {
    // Use centralized database path function
    const dbPath = getDatabasePath()
    
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          // SQLite optimization: WAL mode for better concurrency, increased timeout
          url: `file:${dbPath}?connection_limit=1&timeout=60000&journal_mode=WAL`
        }
      },
      log: ['error'], // Only log errors, disable query logging
      // Increase transaction timeout from default 5s to 30s
      // This prevents "Transaction already closed" errors for complex operations
      transactionOptions: {
        maxWait: 30000, // Max time to wait for a transaction slot (30s)
        timeout: 30000, // Max time a transaction can run (30s)
        isolationLevel: 'Serializable' // Ensure data consistency
      }
    })
    
    
    // Auto-seed on first connection (production only)
    const isProd = process.env.NODE_ENV !== 'development'
    if (isProd && !isSeeded) {
      // Defer seeding to avoid blocking app startup
      setTimeout(async () => {
        try {
          await seedProductionDatabase(prisma)
          isSeeded = true
        } catch (error) {
          log.error('[Database] Failed to seed database:', error)
        }
      }, 1000)
    }
  }
} catch (e) {
  log.error('[Database] ⚠️  Error initializing Prisma:', e)
  log.warn('[Database] Using mock fallbacks')
}

if (!prisma) {
  log.warn('[Dev Mode] 🔄 Prisma client disabled - IPC handlers using mock data')
}

/**
 * Register all IPC handlers
 * Call this function once during Electron app initialization
 */
export function registerAllHandlers() {
  
  registerAuthHandlers(prisma)
  
  registerDashboardHandlers(prisma)
  
  registerSalesHandlers(prisma)
  
  registerSaleTransactionHandlers(prisma)
  
  registerInventoryHandlers(prisma)
  
  registerFinanceHandlers(prisma)
  
  registerProductsHandlers(prisma)
  
  registerCategoriesHandlers(prisma)
  
  registerStoresHandlers(prisma)
  
  registerEmployeesHandlers(prisma)
  
  registerCustomersHandlers(prisma)
  
  registerSearchHandlers(prisma)
  
  registerUserHandlers(prisma)
  
  registerReportsHandlers(prisma)
  
  // Register deposit and installment handlers
  registerDepositsHandlers(prisma)
  registerInstallmentsHandlers(prisma)
  // Register receipt handlers
  registerReceiptHandlers(prisma)
  // Register analytics handlers (self-contained with own Prisma instance)
  registerAnalyticsHandlers()
  
  // Register email handlers
  registerEmailHandlers(prisma)
  
  // Register reorder analysis handlers
  setupReorderHandlers(prisma)
  
  // Register supplier handlers
  registerSupplierHandlers(prisma)
  
  // Register thermal receipt/printer handlers
  registerThermalReceiptHandlers()
  
  // Register barcode printing handlers
  registerBarcodePrintHandlers()
  
  // Register purchase order handlers
  setupPurchaseOrderHandlers(prisma)
  
  // Register delete handlers (archive/restore functionality)
  registerDeleteHandlers(prisma)
  
  // Register stock movement handlers (restock, adjustments, etc.)
  registerStockMovementHandlers(prisma)
  
  // Register log bridge (renderer → main log file)
  registerLogHandlers()

  // Register module feature-flag handlers
  registerModuleHandlers()

  // ── Plugin Handlers ──────────────────────────────────────────────────────
  // Only plugins compiled into this build (via ENABLED_MODULES) are in
  // ALL_PLUGINS.  Each plugin ensures its DB tables exist then registers
  // its ipcMain.handle channels.
  const dbPath = getDatabasePath()
  const dbUrl = `file:${dbPath}`
  for (const plugin of ALL_PLUGINS) {
    // Ensure schema first, then register handlers so they are never called
    // before the tables exist in the database.
    plugin
      .ensureSchema(prisma, dbUrl, process.cwd())
      .then(() => plugin.registerHandlers(prisma))
      .catch((e) => {
        log.error(`[${plugin.id}] Schema migration failed, registering handlers anyway:`, e)
        plugin.registerHandlers(prisma)
      })
  }

  log.info('✅ All IPC handlers registered successfully')
}
