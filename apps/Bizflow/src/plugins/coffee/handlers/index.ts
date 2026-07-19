// ─── Coffee: Handlers Index ───────────────────────────────────────────────────
// Single entry point that wires all coffee IPC handlers.
// Import this from the main plugin index.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { registerProductHandlers }  from './products'
import { registerTableHandlers }    from './tables'
import { registerOrderHandlers }    from './orders'
import { registerSalesHandlers }    from './sales'
import { registerShiftHandlers }    from './shifts'
import { registerOverviewHandlers } from './overview'
import { registerCustomerHandlers } from './customers'
import { registerReportHandlers }   from './reports'
import { registerFinanceHandlers }  from './finance'

export function registerCoffeeHandlers(prisma: any) {
  registerProductHandlers(prisma)
  registerTableHandlers(prisma)
  registerOrderHandlers(prisma)
  registerSalesHandlers(prisma)
  registerShiftHandlers(prisma)
  registerOverviewHandlers(prisma)
  registerCustomerHandlers(prisma)
  registerReportHandlers(prisma)
  registerFinanceHandlers(prisma)
}
