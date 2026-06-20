/**
 * Email Report Service
 *
 * Business logic layer for email report management
 * Handles email configuration, report generation, and sending
 */

// The generated Prisma client is module-specific, so commerce models may be
// absent in single-module builds (e.g. vet). Typing it as `any` keeps this
// cross-module code compiling everywhere (matches the plugin-handler convention).
type PrismaClient = any
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { createLogger } from '../utils/logger'
const log = createLogger('EmailReport')

export interface EmailReportConfig {
  userId: string
  email: string
  frequency: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
}

export interface EmailReportData {
  date: string
  totalSales: number
  totalRevenue: number
  totalProfit: number
  topProducts: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  lowStockAlerts: Array<{
    name: string
    currentStock: number
    minStock: number
  }>
  pendingInstallments: number
}

/**
 * Email Report Service Error
 */
export class EmailReportServiceError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'EmailReportServiceError'
  }
}

/**
 * Email Report Business Logic Service
 */
export class EmailReportService {
  private prisma: PrismaClient
  private transporter: Transporter | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.initializeTransporter()
  }

  /**
   * Initialize email transporter
   * Uses Gmail SMTP for now - can be configured later
   */
  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        }
      })
      log.info('Email transporter initialized')
    } catch (error) {
      log.error('Failed to initialize email transporter', { error })
      this.transporter = null
    }
  }

  /**
   * Configure email report for user
   */
  async configureEmailReport(config: EmailReportConfig): Promise<void> {
    try {
      log.info('Configuring email report', { userId: config.userId, email: config.email })

      const existing = await this.prisma.emailReport.findFirst({
        where: { userId: config.userId }
      })

      if (existing) {
        await this.prisma.emailReport.update({
          where: { id: existing.id },
          data: {
            email: config.email,
            frequency: config.frequency,
            enabled: config.enabled,
            updatedAt: new Date()
          }
        })
      } else {
        await this.prisma.emailReport.create({
          data: {
            userId: config.userId,
            email: config.email,
            frequency: config.frequency,
            enabled: config.enabled
          }
        })
      }

      log.info('Email report configured successfully', { userId: config.userId })
    } catch (error) {
      log.error('Failed to configure email report', { error, userId: config.userId })
      throw new EmailReportServiceError('Failed to configure email report')
    }
  }

  /**
   * Get email report configuration for user
   */
  async getEmailReportConfig(userId: string): Promise<EmailReportConfig | null> {
    try {
      const report = await this.prisma.emailReport.findFirst({
        where: { userId }
      })

      if (!report) return null

      return {
        userId: report.userId,
        email: report.email,
        frequency: report.frequency as 'daily' | 'weekly' | 'monthly',
        enabled: report.enabled
      }
    } catch (error) {
      log.error('Failed to get email report config', { error, userId })
      throw new EmailReportServiceError('Failed to get email report configuration')
    }
  }

  /**
   * Generate daily report data
   */
  async generateDailyReport(userId: string): Promise<EmailReportData> {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      log.info('Generating daily report', { userId, date: startOfDay.toISOString() })

      // Get sales data for today
      const sales = await this.prisma.saleTransaction.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Calculate totals
      let totalSales = 0
      let totalRevenue = 0
      let totalProfit = 0
      const productStats = new Map<string, { name: string; quantity: number; revenue: number }>()

      for (const sale of sales) {
        totalSales++
        for (const item of sale.items) {
          const revenue = item.price * item.quantity
          const cost = item.product.baseCost * item.quantity
          const profit = revenue - cost

          totalRevenue += revenue
          totalProfit += profit

          const existing = productStats.get(item.productId) || {
            name: item.product.name,
            quantity: 0,
            revenue: 0
          }
          existing.quantity += item.quantity
          existing.revenue += revenue
          productStats.set(item.productId, existing)
        }
      }

      // Get top products
      const topProducts = Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Get low stock alerts
      const lowStockProducts = await this.prisma.product.findMany({
        where: {
          isArchived: false,
          variants: {
            some: {
              stock: {
                lte: 5 // Alert when stock <= 5
              }
            }
          }
        },
        include: {
          variants: true
        }
      })

      const lowStockAlerts = lowStockProducts.flatMap(product =>
        product.variants
          .filter(variant => variant.stock <= 5)
          .map(variant => ({
            name: `${product.name}${variant.sku ? ` (${variant.sku})` : ''}`,
            currentStock: variant.stock,
            minStock: 5
          }))
      ).slice(0, 10) // Limit to 10 alerts

      // Get pending installments
      const pendingInstallments = await this.prisma.installment.count({
        where: {
          status: 'pending',
          dueDate: {
            lte: new Date() // Overdue or due today
          }
        }
      })

      return {
        date: startOfDay.toISOString().split('T')[0],
        totalSales,
        totalRevenue,
        totalProfit,
        topProducts,
        lowStockAlerts,
        pendingInstallments
      }
    } catch (error) {
      log.error('Failed to generate daily report', { error, userId })
      throw new EmailReportServiceError('Failed to generate daily report')
    }
  }

  /**
   * Send email report
   */
  async sendEmailReport(userId: string, data: EmailReportData): Promise<void> {
    if (!this.transporter) {
      throw new EmailReportServiceError('Email transporter not configured')
    }

    try {
      const config = await this.getEmailReportConfig(userId)
      if (!config || !config.enabled) {
        log.info('Email report not enabled for user', { userId })
        return
      }

      const html = this.generateEmailHTML(data)

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: config.email,
        subject: `BizFlow Daily Report - ${data.date}`,
        html
      }

      await this.transporter.sendMail(mailOptions)

      // Update last sent timestamp
      await this.prisma.emailReport.updateMany({
        where: { userId },
        data: { lastSent: new Date() }
      })

      log.info('Email report sent successfully', { userId, email: config.email })
    } catch (error) {
      log.error('Failed to send email report', { error, userId })
      throw new EmailReportServiceError('Failed to send email report')
    }
  }

  /**
   * Generate HTML email template
   */
  private generateEmailHTML(data: EmailReportData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>BizFlow Daily Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin: 0; }
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .metric { text-align: center; padding: 20px; background: #f8fafc; border-radius: 6px; }
            .metric h3 { margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-transform: uppercase; }
            .metric .value { font-size: 24px; font-weight: bold; color: #1e293b; }
            .metric .profit { color: #16a34a; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f8fafc; font-weight: 600; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 10px 0; }
            .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 BizFlow Daily Report</h1>
              <p>${data.date}</p>
            </div>

            <div class="metrics">
              <div class="metric">
                <h3>Total Sales</h3>
                <div class="value">${data.totalSales}</div>
              </div>
              <div class="metric">
                <h3>Revenue</h3>
                <div class="value">$${data.totalRevenue.toFixed(2)}</div>
              </div>
              <div class="metric profit">
                <h3>Profit</h3>
                <div class="value">$${data.totalProfit.toFixed(2)}</div>
              </div>
            </div>

            ${data.topProducts.length > 0 ? `
            <div class="section">
              <h2>🏆 Top Products</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.topProducts.map(product => `
                    <tr>
                      <td>${product.name}</td>
                      <td>${product.quantity}</td>
                      <td>$${product.revenue.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            ${data.lowStockAlerts.length > 0 ? `
            <div class="section">
              <h2>⚠️ Low Stock Alerts</h2>
              ${data.lowStockAlerts.map(alert => `
                <div class="alert">
                  <strong>${alert.name}</strong> - Current stock: ${alert.currentStock} (Minimum: ${alert.minStock})
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${data.pendingInstallments > 0 ? `
            <div class="section">
              <h2>💰 Pending Installments</h2>
              <p>You have <strong>${data.pendingInstallments}</strong> pending installments that need attention.</p>
            </div>
            ` : ''}

            <div class="footer">
              <p>This report was generated automatically by BizFlow.</p>
              <p>To unsubscribe or change settings, visit your account preferences.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(email: string): Promise<void> {
    if (!this.transporter) {
      throw new EmailReportServiceError('Email transporter not configured')
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'BizFlow Email Test',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ Email Configuration Test</h2>
            <p>Your email settings are working correctly!</p>
            <p>This is a test message from BizFlow.</p>
          </div>
        `
      }

      await this.transporter.sendMail(mailOptions)
      log.info('Test email sent successfully', { email })
    } catch (error) {
      log.error('Failed to send test email', { error, email })
      throw new EmailReportServiceError('Failed to send test email')
    }
  }
}