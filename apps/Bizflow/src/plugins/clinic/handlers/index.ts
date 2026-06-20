import { registerPatientHandlers } from './patients'
import { registerSessionHandlers } from './sessions'
import { registerStatsHandlers } from './stats'
import { registerCheckResultHandlers } from './checkResults'
import { registerAppointmentHandlers } from './appointments'
import { registerClinicPdfHandlers } from './pdf'
import { registerExpenseHandlers } from './expenses'
import { registerClinicStaffHandlers } from './staff'
import { registerMaterialHandlers } from './materials'

export function registerClinicHandlers(prisma: any) {
  registerPatientHandlers(prisma)
  registerSessionHandlers(prisma)
  registerStatsHandlers(prisma)
  registerCheckResultHandlers(prisma)
  registerAppointmentHandlers(prisma)
  registerClinicPdfHandlers()
  registerExpenseHandlers(prisma)
  registerClinicStaffHandlers(prisma)
  registerMaterialHandlers(prisma)
}
