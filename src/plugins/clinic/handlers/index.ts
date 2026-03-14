import { registerPatientHandlers } from './patients'
import { registerSessionHandlers } from './sessions'
import { registerStatsHandlers } from './stats'
import { registerCheckResultHandlers } from './checkResults'

export function registerClinicHandlers(prisma: any) {
  registerPatientHandlers(prisma)
  registerSessionHandlers(prisma)
  registerStatsHandlers(prisma)
  registerCheckResultHandlers(prisma)
}
