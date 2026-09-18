// ─── Personal Work: Handlers Index ───────────────────────────────────────────
// Single entry point that wires every personal IPC handler.
// Import this from the main plugin index.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { registerClientHandlers }   from './clients'
import { registerProjectHandlers }  from './projects'
import { registerRequestHandlers }  from './requests'
import { registerWaitHandlers }     from './waits'
import { registerTaskHandlers }     from './tasks'
import { registerFocusHandlers }    from './focus'
import { registerBillingHandlers }  from './billing'
import { registerFinanceHandlers }  from './finance'
import { registerCapacityHandlers } from './capacity'
import { registerPlaybookHandlers } from './playbook'
import { registerMetaHandlers }     from './meta'
import { registerOverviewHandlers } from './overview'

export function registerPersonalHandlers(prisma: any) {
  registerClientHandlers(prisma)
  registerProjectHandlers(prisma)
  registerRequestHandlers(prisma)
  registerWaitHandlers(prisma)
  registerTaskHandlers(prisma)
  registerFocusHandlers(prisma)
  registerBillingHandlers(prisma)
  registerFinanceHandlers(prisma)
  registerCapacityHandlers(prisma)
  registerPlaybookHandlers(prisma)
  registerMetaHandlers(prisma)
  registerOverviewHandlers(prisma)
}
