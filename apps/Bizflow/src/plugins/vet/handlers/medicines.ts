/**
 * Vet Medicines IPC handlers — barrel.
 *
 * The medicine endpoints are grouped by responsibility into sibling modules so
 * each file stays small and focused. This barrel keeps the public entry point
 * `registerVetMedicineHandlers(prisma)` unchanged for the plugin registration.
 *
 *   medicines.catalog.ts  – getAll / create / update / delete
 *   medicines.batches.ts  – getBatches / addBatch / updateBatch / deleteBatch / disposeBatch
 *   medicines.sales.ts    – sell / sellCombo / payments / settle / updateSale / refunds
 *   medicines.queries.ts  – getSales / getSaleGroups / getHistory / getSummary
 */

import { registerVetMedicineCatalogHandlers } from './medicines.catalog'
import { registerVetMedicineBatchHandlers } from './medicines.batches'
import { registerVetMedicineSalesHandlers } from './medicines.sales'
import { registerVetMedicineQueryHandlers } from './medicines.queries'

export function registerVetMedicineHandlers(prisma: any) {
  // Medicine catalogue CRUD
  registerVetMedicineCatalogHandlers(prisma)

  // Stock batch (lot) management
  registerVetMedicineBatchHandlers(prisma)

  // Sale operations (sell, payments, settlement, refunds)
  registerVetMedicineSalesHandlers(prisma)

  // Read / reporting queries
  registerVetMedicineQueryHandlers(prisma)
}
