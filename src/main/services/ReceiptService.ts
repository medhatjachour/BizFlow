/**
 * Receipt Service
 * Handles receipt generation for deposits and installments
 */
import { db } from '../database/sqlite'

export class ReceiptService {
  async generateDepositReceipt(depositId: string) {
    const deposit = db.queryOne(
      `SELECT d.*, c.id as customer_id, c.name as customer_name, c.phone as customer_phone
       FROM Deposit d
       LEFT JOIN Customer c ON d.customerId = c.id
       WHERE d.id = ?`,
      [depositId]
    )

    if (!deposit) {
      throw new Error('Deposit not found')
    }

    // Get sale details if linked
    let sale = null
    if (deposit.saleId) {
      const saleData = db.queryOne(
        'SELECT id, total FROM SaleTransaction WHERE id = ?',
        [deposit.saleId]
      )
      
      if (saleData) {
        const items = db.query(
          `SELECT si.quantity, si.price, si.total, p.name as productName
           FROM SaleItem si
           JOIN Product p ON si.productId = p.id
           WHERE si.saleId = ?`,
          [deposit.saleId]
        )
        
        sale = {
          id: saleData.id,
          total: saleData.total,
          items
        }
      }
    }

    const receipt = {
      type: 'deposit',
      id: deposit.id,
      date: deposit.date,
      amount: deposit.amount,
      method: deposit.method,
      note: deposit.note,
      customer: deposit.customer_id ? {
        id: deposit.customer_id,
        name: deposit.customer_name,
        phone: deposit.customer_phone
      } : null,
      sale
    }

    return receipt
  }

  async generateInstallmentReceipt(installmentId: string) {
    const installment = db.queryOne(
      `SELECT i.*, c.id as customer_id, c.name as customer_name, c.phone as customer_phone
       FROM Installment i
       LEFT JOIN Customer c ON i.customerId = c.id
       WHERE i.id = ?`,
      [installmentId]
    )

    if (!installment) {
      throw new Error('Installment not found')
    }

    // Get sale details if linked
    let sale = null
    if (installment.saleId) {
      const saleData = db.queryOne(
        'SELECT id, total FROM SaleTransaction WHERE id = ?',
        [installment.saleId]
      )
      
      if (saleData) {
        const items = db.query(
          `SELECT si.quantity, si.price, si.total, p.name as productName
           FROM SaleItem si
           JOIN Product p ON si.productId = p.id
           WHERE si.saleId = ?`,
          [installment.saleId]
        )
        
        sale = {
          id: saleData.id,
          total: saleData.total,
          items
        }
      }
    }

    const receipt = {
      type: 'installment',
      id: installment.id,
      dueDate: installment.dueDate,
      paidDate: installment.paidDate,
      amount: installment.amount,
      status: installment.status,
      note: installment.note,
      customer: installment.customer_id ? {
        id: installment.customer_id,
        name: installment.customer_name,
        phone: installment.customer_phone
      } : null,
      sale
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