/**
 * Clinic materials IPC handlers — barrel.
 *
 * Grouped by responsibility into sibling modules so each file stays focused.
 * This barrel keeps the public entry point `registerMaterialHandlers(prisma)`
 * unchanged for the plugin registration.
 *
 *   materials.shared.ts     – period + expiry-sync helpers
 *   materials.categories.ts – material category CRUD
 *   materials.batches.ts    – batch (stock lot) CRUD
 *   materials.crud.ts       – materials CRUD, session usage, stats, finance
 *   materials.logging.ts    – batch audit trail (loss / expiry / adjustment)
 */
import { registerMaterialCategoryHandlers } from './materials.categories'
import { registerMaterialBatchHandlers } from './materials.batches'
import { registerMaterialCrudHandlers } from './materials.crud'
import { registerMaterialLoggingHandlers } from './materials.logging'

export function registerMaterialHandlers(prisma: any) {
  // Material categories
  registerMaterialCategoryHandlers(prisma)

  // Material batches (stock lots)
  registerMaterialBatchHandlers(prisma)

  // Materials CRUD, session usage, stats & finance
  registerMaterialCrudHandlers(prisma)

  // Batch audit trail: loss / expiry / adjustment
  registerMaterialLoggingHandlers(prisma)
}
