import { registerTableHandlers } from './tables'
import { registerReservationHandlers } from './reservations'
import { registerMenuHandlers } from './menu'
import { registerOrderHandlers } from './orders'
import { registerOverviewHandlers } from './overview'

export function registerRestaurantHandlers(prisma: any) {
  registerTableHandlers(prisma)
  registerReservationHandlers(prisma)
  registerMenuHandlers(prisma)
  registerOrderHandlers(prisma)
  registerOverviewHandlers(prisma)
}
