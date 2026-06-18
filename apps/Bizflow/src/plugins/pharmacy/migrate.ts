/**
 * Pharmacy Plugin – DB Migration
 *
 * Called once on app startup. Runs `prisma db push` only when one or more
 * pharmacy tables are missing, so it is a no-op on every subsequent run.
 */

import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Pharmacy:Migrate')

export const PHARMACY_TABLES = [
  'PharmacyProduct',
  'PharmacyBatch',
  'PharmacySale',
  'PharmacySaleItem',
  'PharmacySupplier',
  'PharmacyPurchaseOrder',
  'PharmacyPurchaseOrderItem',
  'PharmacyCustomer'
]

export async function ensurePharmacySchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)

  if (missing.length === 0) {
    log.info('✅ Pharmacy tables already exist — no migration needed.')
    await applyColumnMigrations(prisma)
    return
  }

  log.info(`🔧 Missing pharmacy tables: [${missing.join(', ')}] — running db push…`)
  await runDbPush(dbUrl, cwd)
  await applyColumnMigrations(prisma)
  log.info('✅ Pharmacy schema applied successfully')
}

/**
 * Idempotent column additions for databases created by an older version of
 * this plugin. Each ALTER is skipped when the column already exists.
 */
async function applyColumnMigrations(prisma: any): Promise<void> {
  const columnMigrations: Array<{ table: string; column: string; sql: string }> = [
    { table: 'PharmacyBatch', column: 'disposeReason', sql: `ALTER TABLE "PharmacyBatch" ADD COLUMN "disposeReason" TEXT` },
    { table: 'PharmacyPurchaseOrderItem', column: 'received', sql: `ALTER TABLE "PharmacyPurchaseOrderItem" ADD COLUMN "received" BOOLEAN DEFAULT 0` },
    { table: 'PharmacyProduct', column: 'subUnit', sql: `ALTER TABLE "PharmacyProduct" ADD COLUMN "subUnit" TEXT` },
    { table: 'PharmacyProduct', column: 'subUnitsPerContainer', sql: `ALTER TABLE "PharmacyProduct" ADD COLUMN "subUnitsPerContainer" REAL` },
    { table: 'PharmacyProduct', column: 'subUnitPrice', sql: `ALTER TABLE "PharmacyProduct" ADD COLUMN "subUnitPrice" REAL` },
    { table: 'PharmacySale', column: 'customerId', sql: `ALTER TABLE "PharmacySale" ADD COLUMN "customerId" TEXT` },
    { table: 'PharmacySaleItem', column: 'saleUnit', sql: `ALTER TABLE "PharmacySaleItem" ADD COLUMN "saleUnit" TEXT DEFAULT 'base'` },
  ]

  for (const m of columnMigrations) {
    try {
      const cols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${m.table}")`)
      if (cols.length === 0) continue // table not present yet
      const exists = cols.some((c: any) => c.name === m.column)
      if (!exists) {
        await prisma.$executeRawUnsafe(m.sql)
        log.info(`✅ Column ${m.table}.${m.column} added`)
      }
    } catch (err) {
      log.warn(`⚠️  Column migration ${m.table}.${m.column} skipped:`, err)
    }
  }
}

async function getMissingTables(prisma: any): Promise<string[]> {
  const missing: string[] = []
  for (const table of PHARMACY_TABLES) {
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
    const child = spawn(
      'npx',
      ['prisma', 'db', 'push', '--schema=prisma/merged.prisma', '--skip-generate'],
      { cwd, shell: true, env: { ...process.env, DATABASE_URL: dbUrl } }
    )
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += d.toString() })
    child.stderr?.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      if (stdout.trim()) log.info('[db push stdout]', stdout.trim())
      if (code === 0) resolve()
      else reject(new Error(`prisma db push exited with code ${code}: ${stderr}`))
    })
    child.on('error', reject)
  })
}
