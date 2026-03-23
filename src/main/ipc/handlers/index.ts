/**
 * IPC Handlers Index
 * Centralizes registration of all domain-specific handlers
 */

import path from 'node:path'
import { getDatabasePath } from '../../database/init'
import { seedProductionDatabase } from '../../database/seed-production'
import { registerAuthHandlers } from './auth.handlers'
import { registerDashboardHandlers } from './dashboard.handlers'
import { registerEmployeesHandlers } from './employees.handlers'
import { registerCustomersHandlers } from './customers.handlers'
import { registerSearchHandlers } from './search.handlers'
import { registerUserHandlers } from './user.handlers'
import { registerReportsHandlers } from './reports.handlers'
import { registerAnalyticsHandlers } from './analytics.handlers'
import { registerEmailHandlers } from './email.handlers'
import './backup.handlers' // Import backup handlers (self-contained, no registration needed)
import { registerLogHandlers } from './log.handlers'
import { registerFinanceHandlers } from './finance.handlers'
import { registerModuleHandlers } from './module.handlers'
import type { IPlugin } from '../../../shared/interfaces/IPlugin'
import CommercePlugin from '../../../plugins/commerce/index'
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
  ...(__PLUGIN_COMMERCE__   ? [CommercePlugin]   : []),
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
    
    
    // Apply SQLite performance PRAGMAs immediately after client creation.
    // The journal_mode=WAL in the connection URL string is NOT reliably applied
    // by Prisma for SQLite — explicit $queryRawUnsafe calls are required.
    ;(async () => {
      try {
        await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
        await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
        await prisma.$queryRawUnsafe('PRAGMA cache_size = -65536;')  // 64 MB page cache
        await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')
        await prisma.$queryRawUnsafe('PRAGMA mmap_size = 536870912;') // 512 MB memory-mapped I/O
        await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;')  // 10 s wait on locked DB
        await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;')
        await prisma.$queryRawUnsafe('PRAGMA optimize;')
        log.info('[Database] ✅ SQLite PRAGMAs applied')

        // ── Orphan table cleanup ──────────────────────────────────────────────
        // Drop tables left behind by a previous build that had more plugins
        // (e.g. a user upgrading from a full build to a clinic-only build).
        // Non-fatal: wrapped in its own try/catch.
        try {
          const EXPECTED = new Set<string>([
            'User', 'FinancialTransaction',
            'Employee', 'EmployeeAttendance', 'EmployeeDocument',
            'EmployeeActivityLog', 'EmployeePayroll', 'EmployeeShift', 'EmployeeOvertime',
            'EmailReport',
          ])
          if (__PLUGIN_COMMERCE__)    ['Category','Product','ProductImage','ProductVariant','ProductAttribute','VariantAttributeValue','StockMovement','Store','Customer','SaleTransaction','SaleItem','Deposit','Installment','InstallmentPlan','ReceiptTemplate','Supplier','SupplierProduct','PurchaseOrder','PurchaseOrderItem'].forEach(t => EXPECTED.add(t))
          if (__PLUGIN_BAKERY__)      ['Recipe','RecipeIngredient','ProductionBatch','PantryIngredient','WasteLog','ProductionSchedule'].forEach(t => EXPECTED.add(t))
          if (__PLUGIN_RESTAURANT__)  ['RestaurantTable','TableReservation','MenuItem','DineInOrder','DineInOrderItem'].forEach(t => EXPECTED.add(t))
          if (__PLUGIN_WAREHOUSE__)   ['WarehouseLocation','WarehouseStock','StockTransfer','StockTransferItem'].forEach(t => EXPECTED.add(t))
          if (__PLUGIN_CLINIC__)      ['ClinicPatient','ClinicSession','ClinicPrescription','ClinicCheckResult','ClinicAppointment','ClinicExpense','ClinicStaff','ClinicSalaryRecord'].forEach(t => EXPECTED.add(t))
          const allTables: { name: string }[] = await prisma.$queryRawUnsafe(
            `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
          )
          const orphans = allTables.map((r: { name: string }) => r.name).filter(t => !EXPECTED.has(t))
          if (orphans.length > 0) {
            log.info(`[Database] 🧹 Dropping ${orphans.length} orphan table(s): ${orphans.join(', ')}`)
            for (const table of orphans) {
              await prisma.$queryRawUnsafe(`DROP TABLE IF EXISTS "${table}"`)
            }
            log.info('[Database] ✅ Orphan tables removed')
          }
        } catch (cleanupErr) {
          log.warn('[Database] Orphan table cleanup failed (non-fatal):', cleanupErr)
        }
      } catch (e) {
        log.error('[Database] Failed to apply SQLite PRAGMAs:', e)
      }
    })()

    // Auto-seed on first connection (always — ensures setup user exists in dev and prod)
    if (!isSeeded) {
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

  // ── Kernel handlers (always registered) ─────────────────────────────────
  registerAuthHandlers(prisma)
  registerDashboardHandlers(prisma)
  registerFinanceHandlers(prisma)
  registerEmployeesHandlers(prisma)
  registerCustomersHandlers(prisma)
  registerSearchHandlers(prisma)
  registerUserHandlers(prisma)
  registerReportsHandlers(prisma)
  registerAnalyticsHandlers()
  registerEmailHandlers(prisma)
  registerLogHandlers()
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
