import { registerTableHandlers } from './tables'
import { registerOrderHandlers } from './orders'
import { registerMenuHandlers } from './menu'
import { registerKdsHandlers } from './kds'
import { registerReservationHandlers } from './reservations'
import { registerShiftHandlers } from './shifts'
import { registerOverviewHandlers } from './overview'

export function registerRestaurantHandlers(prisma: any) {
  registerTableHandlers(prisma)
  registerOrderHandlers(prisma)
  registerMenuHandlers(prisma)
  registerKdsHandlers(prisma)
  registerReservationHandlers(prisma)
  registerShiftHandlers(prisma)
  registerOverviewHandlers(prisma)
}