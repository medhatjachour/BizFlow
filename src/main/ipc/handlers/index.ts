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
import VetPlugin from '../../../plugins/vet/index'
import GymPlugin from '../../../plugins/gym/index'
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
  ...(__PLUGIN_VET__        ? [VetPlugin]        : []),
  ...(__PLUGIN_GYM__        ? [GymPlugin]        : []),
]

// Prisma client — initialised lazily via initializePrisma() so it never
// opens the database file before initializeDatabase() has copied the
// seeded template into place (avoids EBUSY on first production run).
let isSeeded = false
export let prisma: any = null

/**
 * Initialise the Prisma client and apply SQLite PRAGMAs.
 * Must be awaited AFTER initializeDatabase() has completed so the database
 * file already contains the schema from the seeded template.
 */
export async function initializePrisma(): Promise<void> {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    let PrismaClient

    if (isDev) {
      const prismaPath = path.resolve(process.cwd(), 'src', 'generated', 'prisma')
      PrismaClient = require(prismaPath).PrismaClient
    } else {
      const prismaPath = path.resolve(__dirname, '..', '..', '..', 'app.asar.unpacked', 'src', 'generated', 'prisma')
      log.info('[Database] [PROD] Loading Prisma from:', prismaPath)
      PrismaClient = require(prismaPath).PrismaClient
    }

    if (!PrismaClient) {
      log.warn('[Database] PrismaClient could not be loaded')
      return
    }

    const dbPath = getDatabasePath()

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}?connection_limit=1&timeout=60000&journal_mode=WAL`
        }
      },
      log: ['error'],
      transactionOptions: {
        maxWait: 30000,
        timeout: 30000,
        isolationLevel: 'Serializable'
      }
    })

    // Apply SQLite performance PRAGMAs — awaited so the connection is fully
    // open before registerAllHandlers() proceeds.
    try {
      await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
      await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
      await prisma.$queryRawUnsafe('PRAGMA cache_size = -65536;')
      await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')
      await prisma.$queryRawUnsafe('PRAGMA mmap_size = 536870912;')
      await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 10000;')
      await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;')
      await prisma.$queryRawUnsafe('PRAGMA optimize;')
      log.info('[Database] ✅ SQLite PRAGMAs applied')

      // ── Orphan table cleanup ──────────────────────────────────────────────
      try {
        const EXPECTED = new Set<string>([
          'User', 'FinancialTransaction',
          'Employee', 'EmployeeAttendance', 'EmployeeDocument',
          'EmployeeActivityLog', 'EmployeePayroll', 'EmployeeShift', 'EmployeeOvertime',
          'EmailReport',
        ])
        if (__PLUGIN_COMMERCE__)    ['Category','Product','ProductImage','ProductVariant','ProductAttribute','VariantAttributeValue','StockMovement','Store','Customer','SaleTransaction','SaleItem','Deposit','Installment','InstallmentPlan','ReceiptTemplate','Supplier','SupplierProduct','PurchaseOrder','PurchaseOrderItem','CommerceExpense'].forEach(t => EXPECTED.add(t))
        if (__PLUGIN_BAKERY__)      ['Recipe','RecipeIngredient','ProductionBatch','PantryIngredient','WasteLog','ProductionSchedule','BakerySale'].forEach(t => EXPECTED.add(t))
        if (__PLUGIN_RESTAURANT__)  ['RestaurantTable','TableReservation','MenuItem','DineInOrder','DineInOrderItem'].forEach(t => EXPECTED.add(t))
        if (__PLUGIN_WAREHOUSE__)   ['WarehouseLocation','WarehouseStock','StockTransfer','StockTransferItem'].forEach(t => EXPECTED.add(t))
        if (__PLUGIN_CLINIC__)      ['ClinicPatient','ClinicSession','ClinicPrescription','ClinicCheckResult','ClinicAppointment','ClinicExpense','ClinicStaff','ClinicSalaryRecord'].forEach(t => EXPECTED.add(t))
        if (__PLUGIN_VET__)         ['VetOwner','VetPatient','VetSession','VetPrescription','VetAppointment','VetCheckResult','VetExpense','VetStaff','VetSalaryRecord'].forEach(t => EXPECTED.add(t))
        if (__PLUGIN_GYM__)         ['GymCoach','GymTrainee','GymPlan','GymSubscription','GymFreeze','GymWalkSession','GymExpense','GymMeasurement','GymGoal','GymLocker','GymLockerAssignment','GymProgram','GymProgramDay','GymProgramExercise','GymProgramAssignment','GymShift'].forEach(t => EXPECTED.add(t))
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

    // Seed setup account if not already present
    if (!isSeeded) {
      try {
        await seedProductionDatabase(prisma)
        isSeeded = true
      } catch (error) {
        log.error('[Database] Failed to seed database:', error)
      }
    }
  } catch (e) {
    log.error('[Database] ⚠️  Error initializing Prisma:', e)
    log.warn('[Database] Using mock fallbacks')
  }

  if (!prisma) {
    log.warn('[Dev Mode] 🔄 Prisma client disabled - IPC handlers using mock data')
  }
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
