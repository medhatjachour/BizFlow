import { registerPharmacyProductHandlers } from './products'
import { registerPharmacyBatchHandlers } from './batches'
import { registerPharmacySaleHandlers } from './sales'
import { registerPharmacySupplierHandlers } from './suppliers'
import { registerPharmacyPurchaseOrderHandlers } from './purchaseOrders'
import { registerPharmacyStatsHandlers } from './stats'
import { registerPharmacyCustomerHandlers } from './customers'

/** Register every IPC channel owned by the pharmacy plugin. */
export function registerPharmacyHandlers(prisma: any): void {
  registerPharmacyProductHandlers(prisma)
  registerPharmacyBatchHandlers(prisma)
  registerPharmacySaleHandlers(prisma)
  registerPharmacySupplierHandlers(prisma)
  registerPharmacyPurchaseOrderHandlers(prisma)
  registerPharmacyStatsHandlers(prisma)
  registerPharmacyCustomerHandlers(prisma)
}
