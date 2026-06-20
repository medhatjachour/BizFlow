/**
 * Receipt Service
 * Handles receipt generation for deposits and installments
 */
// The generated Prisma client is module-specific, so commerce models may be
// absent in single-module builds (e.g. vet). Typing it as `any` keeps this
// cross-module code compiling everywhere (matches the plugin-handler convention).
type PrismaClient = any
import { createLogger } from '../utils/logger'

const log = createLogger('Receipt')

export class ReceiptService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async generateDepositReceipt(depositId: string) {
    log.info(`Generating deposit receipt: depositId=${depositId}`)
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        customer: true,
        sale: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (!deposit) {
      log.error(`Deposit not found: depositId=${depositId}`)
      throw new Error('Deposit not found')
    }

    const receipt = {
      type: 'deposit',
      id: deposit.id,
      date: deposit.date,
      amount: deposit.amount,
      method: deposit.method,
      note: deposit.note,
      customer: deposit.customer ? {
        id: deposit.customer.id,
        name: deposit.customer.name,
        phone: deposit.customer.phone
      } : null,
      sale: deposit.sale ? {
        id: deposit.sale.id,
        total: deposit.sale.total,
        items: deposit.sale.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }))
      } : null
    }

    return receipt
  }

  async generateInstallmentReceipt(installmentId: string) {
    log.info(`Generating installment receipt: installmentId=${installmentId}`)
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        customer: true,
        sale: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (!installment) {
      log.error(`Installment not found: installmentId=${installmentId}`)
      throw new Error('Installment not found')
    }

    const receipt = {
      type: 'installment',
      id: installment.id,
      dueDate: installment.dueDate,
      paidDate: installment.paidDate,
      amount: installment.amount,
      status: installment.status,
      note: installment.note,
      customer: installment.customer ? {
        id: installment.customer.id,
        name: installment.customer.name,
        phone: installment.customer.phone
      } : null,
      sale: installment.sale ? {
        id: installment.sale.id,
        total: installment.sale.total,
        items: installment.sale.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }))
      } : null
    }

    return receipt
  }

  generateThermalReceipt(receipt: any): string {
    // ESC/POS commands for thermal printer
    const commands: string[] = []

    // Initialize printer
    commands.push('\x1B\x40') // ESC @ - Initialize

    // Set character size
    commands.push('\x1B\x21\x30') // ESC ! 0 - Normal size

    // Center alignment
    commands.push('\x1B\x61\x01') // ESC a 1 - Center

    // Header
    commands.push('BIZFLOW\n')
    commands.push('PAYMENT RECEIPT\n\n')

    // Left alignment
    commands.push('\x1B\x61\x00') // ESC a 0 - Left

    // Receipt details
    if (receipt.type === 'deposit') {
      commands.push(`Deposit ID: ${receipt.id.slice(-8)}\n`)
      commands.push(`Date: ${new Date(receipt.date).toLocaleDateString()}\n`)
      commands.push(`Amount: $${receipt.amount.toFixed(2)}\n`)
      commands.push(`Method: ${receipt.method}\n`)
    } else {
      commands.push(`Installment ID: ${receipt.id.slice(-8)}\n`)
      commands.push(`Due Date: ${new Date(receipt.dueDate).toLocaleDateString()}\n`)
      if (receipt.paidDate) {
        commands.push(`Paid Date: ${new Date(receipt.paidDate).toLocaleDateString()}\n`)
      }
      commands.push(`Amount: $${receipt.amount.toFixed(2)}\n`)
      commands.push(`Status: ${receipt.status}\n`)
    }

    if (receipt.customer) {
      commands.push(`Customer: ${receipt.customer.name}\n`)
      commands.push(`Phone: ${receipt.customer.phone}\n`)
    }

    if (receipt.note) {
      commands.push(`Note: ${receipt.note}\n`)
    }

    commands.push('\n')

    // Sale details if linked
    if (receipt.sale) {
      commands.push('Sale Details:\n')
      commands.push('-'.repeat(32) + '\n')
      receipt.sale.items.forEach((item: any) => {
        commands.push(`${item.productName.substring(0, 20)}\n`)
        commands.push(`  ${item.quantity} x $${item.price.toFixed(2)} = $${item.total.toFixed(2)}\n`)
      })
      commands.push('-'.repeat(32) + '\n')
      commands.push(`Total: $${receipt.sale.total.toFixed(2)}\n\n`)
    }

    // Footer
    commands.push('Thank you for your business!\n')
    commands.push(new Date().toLocaleString() + '\n\n')

    // Cut paper
    commands.push('\x1B\x69') // ESC i - Full cut

    return commands.join('')
  }
}