/**
 * Commerce Plugin – DB Migration
 *
 * The commerce models (Product, Store, SaleTransaction, etc.) are defined in
 * the main  prisma/schema.prisma  and migrated by the app-level MigrationManager
 * on every startup.  This plugin therefore requires NO additional schema push.
 *
 * This file exists to satisfy the IPlugin.ensureSchema() contract and to
 * document the migration strategy.
 *
 * ─── Future migration path ────────────────────────────────────────────────
 * When commerce models are eventually moved to  src/plugins/commerce/schema.prisma
 * (i.e. extracted from the main schema), this function will need to:
 *   1. Check whether core commerce tables exist (Category, Product, Store, …)
 *   2. Run  prisma db push --schema=prisma/merged.prisma  if any are missing
 *      (same pattern used by BakeryPlugin in migrate.ts)
 * ─────────────────────────────────────────────────────────────────────────
 */

import { createLogger } from '../../main/utils/logger'

const log = createLogger('Commerce:Migrate')

/**
 * No-op: commerce tables are created/migrated by the app's MigrationManager.
 */
export async function ensureCommerceSchema(
  _prisma: any,
  _dbUrl: string,
  _cwd: string
): Promise<void> {
  log.info('✅ Commerce schema managed by main MigrationManager — no plugin migration needed')
}
