import { ipcMain } from 'electron'
import { InstallmentService } from '../../services/InstallmentService'
import { InstallmentPlanService } from '../../services/InstallmentPlanService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Installments')

export function registerInstallmentsHandlers(prisma: any) {
  const installmentService = new InstallmentService(prisma)

  ipcMain.handle('installments:create', async (_, data) => {
    try {
      const installment = await installmentService.createInstallment(data)
      return { success: true, installment }
    } catch (error) {
      log.error('Error creating installment:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('installments:list', async (_, options) => {
    try {
      const result = await installmentService.listInstallments(options)
      return result
    } catch (error) {
      log.error('Error listing installments:', error)
      return { installments: [], total: 0, page: 1, limit: 50, totalPages: 0 }
    }
  })

  ipcMain.handle('installments:getByCustomer', async (_, customerId) => {
    try {
      const installments = await installmentService.getInstallmentsByCustomer(customerId)
      return installments
    } catch (error) {
      log.error('Error getting installments by customer:', error)
      return []
    }
  })

  ipcMain.handle('installments:getBySale', async (_, saleId) => {
    try {
      const installments = await installmentService.getInstallmentsBySale(saleId)
      return installments
    } catch (error) {
      log.error('Error getting installments by sale:', error)
      return []
    }
  })

  ipcMain.handle('installments:getUpcomingReminders', async (_, daysAhead) => {
    try {
      const reminders = await installmentService.getUpcomingReminders(daysAhead)
      return reminders
    } catch (error) {
      log.error('Error getting upcoming reminders:', error)
      return []
    }
  })

  ipcMain.handle('installments:getOverdue', async () => {
    try {
      const overdue = await installmentService.getOverdueInstallments()
      return overdue
    } catch (error) {
      log.error('Error getting overdue installments:', error)
      return []
    }
  })

  ipcMain.handle('installments:markAsPaid', async (_, { installmentId, paidDate }) => {
    try {
      const installment = await installmentService.markAsPaid(installmentId, paidDate ? new Date(paidDate) : undefined)
      return { success: true, installment }
    } catch (error) {
      log.error('Error marking installment as paid:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('installments:markAsOverdue', async (_, installmentId) => {
    try {
      const installment = await installmentService.markAsOverdue(installmentId)
      return { success: true, installment }
    } catch (error) {
      log.error('Error marking installment as overdue:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('installments:linkToSale', async (_, { installmentIds, saleId }) => {
    try {
      const result = await installmentService.linkInstallmentsToSale(installmentIds, saleId)
      return { success: true, result }
    } catch (error) {
      log.error('Error linking installments to sale:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // ============================================================================
  // INSTALLMENT PLAN HANDLERS
  // ============================================================================

  const planService = InstallmentPlanService.getInstance(prisma)

  // Get all installment plans
  ipcMain.handle('installment-plans:getAll', async () => {
    try {
      const plans = await prisma.installmentPlan.findMany({
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' }
        ]
      })
      return plans
    } catch (error) {
      log.error('Error getting all plans:', error)
      return []
    }
  })

  // Get all active installment plans
  ipcMain.handle('installment-plans:getActive', async () => {
    try {
      const plans = await planService.getActivePlans()
      return plans
    } catch (error) {
      log.error('Error getting active plans:', error)
      return []
    }
  })

  // Create a new installment plan
  ipcMain.handle('installment-plans:create', async (_, planData) => {
    try {
      const plan = await prisma.installmentPlan.create({
        data: planData
      })
      return { success: true, plan }
    } catch (error) {
      log.error('Error creating plan:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Update an installment plan
  ipcMain.handle('installment-plans:update', async (_, { id, data }) => {
    try {
      const plan = await prisma.installmentPlan.update({
        where: { id },
        data
      })
      return { success: true, plan }
    } catch (error) {
      log.error('Error updating plan:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Delete an installment plan
  ipcMain.handle('installment-plans:delete', async (_, id) => {
    try {
      await prisma.installmentPlan.delete({
        where: { id }
      })
      return { success: true }
    } catch (error) {
      log.error('Error deleting plan:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Calculate payment schedule for a sale
  ipcMain.handle('installment-plans:calculateSchedule', async (_, { saleTotal, planId, customDownPayment }) => {
    try {
      const schedule = await planService.calculateSchedule(saleTotal, planId, customDownPayment)
      // Convert dates to ISO strings for serialization
      const serializedSchedule = {
        ...schedule,
        installments: schedule.installments.map(inst => ({
          amount: inst.amount,
          dueDate: inst.dueDate.toISOString(),
          paymentNumber: inst.paymentNumber
        }))
      }
      return { success: true, schedule: serializedSchedule }
    } catch (error) {
      log.error('Error calculating schedule:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Create installments from a schedule
  ipcMain.handle('installment-plans:createInstallmentsForSale', async (_, { saleId, customerId, schedule }) => {
    try {
      await planService.createInstallmentsForSale(saleId, customerId, schedule)
      return { success: true }
    } catch (error) {
      log.error('Error creating installments for sale:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Seed default plans
  ipcMain.handle('installment-plans:seedDefaults', async () => {
    try {
      await planService.seedDefaultPlans()
      return { success: true }
    } catch (error) {
      log.error('Error seeding default plans:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Calculate late fees
  ipcMain.handle('installments:calculateLateFees', async (_, { installmentId, dailyLateFeePercent }) => {
    try {
      const lateFee = await planService.calculateLateFees(installmentId, dailyLateFeePercent)
      return { success: true, lateFee }
    } catch (error) {
      log.error('Error calculating late fees:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Mark overdue installments (batch operation)
  ipcMain.handle('installments:markOverdueBatch', async () => {
    try {
      const count = await planService.markOverdueInstallments()
      return { success: true, count }
    } catch (error) {
      log.error('Error marking overdue installments:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
}
