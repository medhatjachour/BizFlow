import { ipcMain } from 'electron'
import { registerOwnerHandlers } from './owners'
import { registerVetPatientHandlers } from './patients'
import { registerVetSessionHandlers } from './sessions'
import { registerVetAppointmentHandlers } from './appointments'
import { registerVetCheckResultHandlers } from './checkResults'
import { registerVetExpenseHandlers } from './expenses'
import { registerVetStaffHandlers } from './staff'
import { registerVetStatsHandlers } from './stats'
import { registerVetMedicineHandlers } from './medicines'
import { registerVetCatalogueHandlers } from './catalogue'

export function registerVetHandlers(prisma: any): void {
  // The prisma arg is forwarded to each handler group so each can use
  // it directly without capturing a module-level reference.
  registerOwnerHandlers(prisma)
  registerVetPatientHandlers(prisma)
  registerVetSessionHandlers(prisma)
  registerVetAppointmentHandlers(prisma)
  registerVetCheckResultHandlers(prisma)
  registerVetExpenseHandlers(prisma)
  registerVetStaffHandlers(prisma)
  registerVetStatsHandlers(prisma)
  registerVetMedicineHandlers(prisma)
  registerVetCatalogueHandlers(prisma)
}

// Unused but re-exported so the preload knows IPC is wired
export { ipcMain }
