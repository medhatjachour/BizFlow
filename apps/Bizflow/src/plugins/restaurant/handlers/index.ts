import { registerTableHandlers } from './tables'
import { registerOrderHandlers } from './orders'
import { registerMenuHandlers } from './menu'
import { registerKdsHandlers } from './kds'
import { registerReservationHandlers } from './reservations'
import { registerShiftHandlers } from './shifts'
import { registerOverviewHandlers } from './overview'
import { registerInventoryHandlers } from './inventory'
import { registerRecipeHandlers } from './recipes'
import { registerWasteHandlers } from './waste'

export function registerRestaurantHandlers(prisma: any) {
  registerTableHandlers(prisma)
  registerOrderHandlers(prisma)
  registerMenuHandlers(prisma)
  registerKdsHandlers(prisma)
  registerReservationHandlers(prisma)
  registerShiftHandlers(prisma)
  registerOverviewHandlers(prisma)
  registerInventoryHandlers(prisma)
  registerRecipeHandlers(prisma)
  registerWasteHandlers(prisma)
}