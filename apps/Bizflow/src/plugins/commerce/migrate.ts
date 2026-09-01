/**
 * Commerce Plugin – DB Migration
 *
 * Called once on app startup after the Prisma client is ready.
 * Runs `prisma db push --schema=prisma/merged.prisma` only when one or more
 * commerce tables are missing, so it is a no-op on every run after the first.
 */

import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Commerce:Migrate')

const COMMERCE_TABLES = [
  'Category', 'Product', 'ProductImage', 'ProductVariant', 'ProductAttribute',
  'VariantAttributeValue', 'StockMovement', 'Store', 'Customer', 'SaleTransaction',
  'SaleItem', 'Deposit', 'Installment', 'InstallmentPlan', 'ReceiptTemplate',
  'Supplier', 'SupplierProduct', 'PurchaseOrder', 'PurchaseOrderItem',
]

export async function ensureCommerceSchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)

  if (missing.length === 0) {
    await ensureSaleCompletionColumns(prisma)
    log.info('✅ Commerce tables already exist — no migration needed')
    return
  }

  log.info(`🔧 Missing commerce tables: [${missing.join(', ')}] — running db push…`)
  await runDbPush(dbUrl, cwd)
  await ensureSaleCompletionColumns(prisma)
  log.info('✅ Commerce schema applied successfully')
}

async function ensureSaleCompletionColumns(prisma: any): Promise<void> {
  const columns: Array<{ name: string }> = await prisma.$queryRawUnsafe(
    `PRAGMA table_info("SaleTransaction")`
  )
  const existing = new Set(columns.map((column) => column.name))
  const additions = [
    { name: 'completionScheduledFor', sql: `ALTER TABLE "SaleTransaction" ADD COLUMN "completionScheduledFor" DATETIME` },
    { name: 'completionDelayDays', sql: `ALTER TABLE "SaleTransaction" ADD COLUMN "completionDelayDays" INTEGER` },
    { name: 'completedAt', sql: `ALTER TABLE "SaleTransaction" ADD COLUMN "completedAt" DATETIME` }
  ]

  for (const addition of additions) {
    if (!existing.has(addition.name)) {
      await prisma.$executeRawUnsafe(addition.sql)
      log.info(`Added SaleTransaction.${addition.name}`)
    }
  }

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SaleTransaction_status_completionScheduledFor_idx" ON "SaleTransaction"("status", "completionScheduledFor")`
  )
}

async function getMissingTables(prisma: any): Promise<string[]> {
  const missing: string[] = []
  for (const table of COMMERCE_TABLES) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      )
      if (rows.length === 0) missing.push(table)
    } catch {
      missing.push(table)
    }
  }
  return missing
}

function runDbPush(dbUrl: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['prisma', 'db', 'push', '--schema=prisma/merged.prisma', '--accept-data-loss'],
      {
        cwd,
        shell: true,
        env: { ...process.env, DATABASE_URL: dbUrl }
      }
    )

    let output = ''
    proc.stdout?.on('data', (d: Buffer) => { output += d.toString() })
    proc.stderr?.on('data', (d: Buffer) => {
      const t = d.toString()
      if (!t.includes('Prisma schema loaded') && !t.includes('Datasource') && !t.includes('Update available')) {
        log.warn('[db push stderr]', t.trim())
      }
    })

    proc.on('close', (code) => {
      if (code === 0 || output.includes('Your database is now in sync')) {
        resolve()
      } else {
        reject(new Error(`prisma db push failed (exit ${code})`))
      }
    })
    proc.on('error', reject)
  })
}
