/**
 * Installment Plan Service
 * Automates installment calculations with predefined plans
 * Supports flexible payment schedules with down payments
 */

import { createLogger } from '../utils/logger'

const log = createLogger('InstallmentPlan')

export interface InstallmentPlan {
  id: string
  name: string
  downPaymentPercent: number
  numberOfPayments: number
  intervalDays: number
  interestRate: number
  description?: string
  isActive: boolean
}

export interface PaymentSchedule {
  downPayment: number
  installments: Array<{
    amount: number
    dueDate: Date
    paymentNumber: number
  }>
  totalAmount: number
  totalWithInterest: number
  interestAmount: number
}

export class InstallmentPlanService {
  private static instance: InstallmentPlanService | null = null
  private prisma: any

  private constructor(prisma: any) {
    this.prisma = prisma
  }

  static getInstance(prisma: any): InstallmentPlanService {
    if (!InstallmentPlanService.instance) {
      InstallmentPlanService.instance = new InstallmentPlanService(prisma)
    }
    return InstallmentPlanService.instance
  }

  /**
   * Calculate payment schedule for a sale with a plan
   */
  async calculateSchedule(
    saleTotal: number,
    planId: string,
    customDownPayment?: number
  ): Promise<PaymentSchedule> {
    try {
      // Get plan details
      const plan = await this.prisma.installmentPlan.findUnique({
        where: { id: planId }
      })

      if (!plan) {
        throw new Error(`Installment plan ${planId} not found`)
      }

      if (!plan.isActive) {
        throw new Error(`Installment plan ${plan.name} is not active`)
      }

      // Calculate down payment
      const downPaymentPercent = plan.downPaymentPercent / 100
      const calculatedDownPayment = saleTotal * downPaymentPercent
      const downPayment = customDownPayment !== undefined 
        ? customDownPayment 
        : calculatedDownPayment

      // Remaining amount after down payment
      const remainingAmount = saleTotal - downPayment

      // Calculate interest
      const interestRate = plan.interestRate / 100
      const interestAmount = remainingAmount * interestRate
      const totalWithInterest = remainingAmount + interestAmount

      // Calculate installment amount
      const installmentAmount = totalWithInterest / plan.numberOfPayments

      // Generate due dates
      const installments: Array<{ amount: number; dueDate: Date; paymentNumber: number }> = []
      const startDate = new Date()

      for (let i = 0; i < plan.numberOfPayments; i++) {
        const dueDate = new Date(startDate)
        dueDate.setDate(dueDate.getDate() + (plan.intervalDays * (i + 1)))

        installments.push({
          amount: Math.round(installmentAmount * 100) / 100,
          dueDate,
          paymentNumber: i + 1
        })
      }

      return {
        downPayment: Math.round(downPayment * 100) / 100,
        installments,
        totalAmount: Math.round(saleTotal * 100) / 100,
        totalWithInterest: Math.round((downPayment + totalWithInterest) * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100
      }
    } catch (error) {
      log.error('Error calculating schedule:', error)
      throw error
    }
  }

  /**
   * Create installments for a sale transaction
   */
  async createInstallmentsForSale(
    saleId: string,
    customerId: string | null,
    schedule: PaymentSchedule
  ): Promise<void> {
    try {
      // Create deposit record
      if (schedule.downPayment > 0) {
        await this.prisma.deposit.create({
          data: {
            amount: schedule.downPayment,
            date: new Date(),
            method: 'cash', // Can be overridden
            status: 'paid',
            note: 'Down payment',
            customerId,
            saleId
          }
        })
      }

      // Create installment records
      for (const installment of schedule.installments) {
        await this.prisma.installment.create({
          data: {
            amount: installment.amount,
            dueDate: installment.dueDate,
            status: 'pending',
            note: `Payment ${installment.paymentNumber} of ${schedule.installments.length}`,
            customerId,
            saleId
          }
        })
      }
    } catch (error) {
      log.error('Error creating installments:', error)
      throw error
    }
  }

  /**
   * Get all active plans
   */
  async getActivePlans(): Promise<InstallmentPlan[]> {
    try {
      const plans = await this.prisma.installmentPlan.findMany({
        where: { isActive: true },
        orderBy: { numberOfPayments: 'asc' }
      })

      return plans
    } catch (error) {
      log.error('Error fetching plans:', error)
      return []
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(id: string): Promise<InstallmentPlan | null> {
    try {
      return await this.prisma.installmentPlan.findUnique({
        where: { id }
      })
    } catch (error) {
      log.error('Error fetching plan:', error)
      return null
    }
  }

  /**
   * Create default plans if none exist
   */
  async seedDefaultPlans(): Promise<void> {
    try {
      const existingPlans = await this.prisma.installmentPlan.count()

      if (existingPlans > 0) {
        log.info('✅ Installment plans already exist')
        return
      }

      const defaultPlans = [
        {
          name: '3-Month Plan',
          downPaymentPercent: 30,
          numberOfPayments: 3,
          intervalDays: 30,
          interestRate: 5,
          description: '30% down payment, 3 monthly installments with 5% interest',
          isActive: true
        },
        {
          name: '6-Month Plan',
          downPaymentPercent: 20,
          numberOfPayments: 6,
          intervalDays: 30,
          interestRate: 8,
          description: '20% down payment, 6 monthly installments with 8% interest',
          isActive: true
        },
        {
          name: '12-Month Plan',
          downPaymentPercent: 10,
          numberOfPayments: 12,
          intervalDays: 30,
          interestRate: 12,
          description: '10% down payment, 12 monthly installments with 12% interest',
          isActive: true
        },
        {
          name: 'Weekly 4-Week Plan',
          downPaymentPercent: 25,
          numberOfPayments: 4,
          intervalDays: 7,
          interestRate: 2,
          description: '25% down payment, 4 weekly installments with 2% interest',
          isActive: true
        },
        {
          name: 'No Interest 3-Month',
          downPaymentPercent: 50,
          numberOfPayments: 3,
          intervalDays: 30,
          interestRate: 0,
          description: '50% down payment, 3 monthly installments with no interest',
          isActive: true
        }
      ]

      for (const plan of defaultPlans) {
        await this.prisma.installmentPlan.create({ data: plan })
      }

      log.info('✅ Created default installment plans')
    } catch (error) {
      log.error('Error seeding plans:', error)
    }
  }

  /**
   * Calculate late fees for overdue installments
   */
  async calculateLateFees(installmentId: string, dailyLateFeePercent: number = 0.1): Promise<number> {
    try {
      const installment = await this.prisma.installment.findUnique({
        where: { id: installmentId }
      })

      if (!installment || installment.status !== 'overdue') {
        return 0
      }

      const dueDate = new Date(installment.dueDate)
      const now = new Date()
      const daysLate = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLate <= 0) {
        return 0
      }

      // Calculate compound late fee
      const lateFeeRate = dailyLateFeePercent / 100
      const lateFee = installment.amount * lateFeeRate * daysLate

      return Math.round(lateFee * 100) / 100
    } catch (error) {
      log.error('Error calculating late fees:', error)
      return 0
    }
  }

  /**
   * Mark overdue installments
   */
  async markOverdueInstallments(): Promise<number> {
    try {
      const now = new Date()

      const result = await this.prisma.installment.updateMany({
        where: {
          status: 'pending',
          dueDate: {
            lt: now
          }
        },
        data: {
          status: 'overdue'
        }
      })

      return result.count
    } catch (error) {
      log.error('Error marking overdue installments:', error)
      return 0
    }
  }
}
