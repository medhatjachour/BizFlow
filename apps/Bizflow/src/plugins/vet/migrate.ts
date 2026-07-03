/**
 * Vet Plugin – DB Migration
 *
 * Called once on app startup. Runs `prisma db push` only when one or more
 * vet tables are missing so it is a no-op on every subsequent run.
 */

import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Vet:Migrate')

const VET_TABLES = [
  'VetOwner',
  'VetPatient',
  'VetSession',
  'VetPrescription',
  'VetAppointment',
  'VetCheckResult',
  'VetExpense',
  'VetStaff',
  'VetSalaryRecord',
  'VetMedicine',
  'VetMedicineBatch',
  'VetMedicineSale',
  'VetMedicineCategory',
  'VetMedicineUnit',
  'VetVisitType',
  'VetMedicineAudit'
]

export async function ensureVetSchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  // 1) Reliable, CLI-free creation of tables added in newer versions. This runs
  //    via the Prisma client at runtime, so it works in a packaged install
  //    (where `prisma db push` is NOT available) and never loses data.
  await ensureNewTables(prisma)

  // 2) For any OTHER still-missing tables, try a schema push. This only works in
  //    dev / when the Prisma CLI is reachable; in a packaged app it is expected
  //    to fail, so we swallow the error and rely on steps 1 + 3.
  const missing = await getMissingTables(prisma)
  if (missing.length > 0) {
    log.info(`🔧 Missing vet tables: [${missing.join(', ')}] — attempting db push…`)
    try {
      await runDbPush(dbUrl, cwd)
    } catch (err) {
      log.warn('⚠️  db push unavailable (packaged install?) — relying on runtime table/column creation:', err)
    }
  } else {
    log.info('✅ Vet tables already exist.')
  }

  // 3) Idempotent column additions for older databases. ALWAYS run (even if a
  //    push above failed) so updates never get stuck on a missing column.
  await applyColumnMigrations(prisma)
  log.info('✅ Vet schema ensured')
}

/**
 * Create tables introduced in newer app versions, idempotently, using raw SQL
 * through the Prisma client. SQLite `CREATE TABLE IF NOT EXISTS` is a no-op when
 * the table already exists, so this is safe to run on every startup and is the
 * production-safe equivalent of `prisma db push` for additive table changes.
 *
 * DDL must mirror the Prisma models (see src/plugins/vet/schema.prisma).
 */
async function ensureNewTables(prisma: any): Promise<void> {
  const statements: string[] = [
    `CREATE TABLE IF NOT EXISTS "VetMedicineAudit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "medicineId" TEXT NOT NULL,
      "batchId" TEXT,
      "batchNumber" TEXT,
      "action" TEXT NOT NULL DEFAULT 'edit_batch',
      "changes" TEXT,
      "note" TEXT,
      "userId" TEXT,
      "userName" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "VetMedicineAudit_medicineId_idx" ON "VetMedicineAudit"("medicineId")`,
    `CREATE INDEX IF NOT EXISTS "VetMedicineAudit_batchId_idx" ON "VetMedicineAudit"("batchId")`,
    `CREATE TABLE IF NOT EXISTS "VetVisitType" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "color" TEXT NOT NULL DEFAULT '#6366f1',
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VetVisitType_name_key" ON "VetVisitType"("name")`,
  ]
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (err) {
      log.warn('⚠️  ensureNewTables statement skipped:', err)
    }
  }
}

/**
 * Safe column additions for existing databases (SQLite ALTER TABLE ADD COLUMN).
 * Each entry is idempotent — a column that already exists is detected via
 * PRAGMA table_info and skipped, so this is safe to run on every startup.
 */
async function applyColumnMigrations(prisma: any): Promise<void> {
  const columnMigrations: Array<{ table: string; column: string; sql: string }> = [
    {
      table: 'VetMedicineSale',
      column: 'saleGroupId',
      sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "saleGroupId" TEXT`
    },
    {
      table: 'VetMedicineSale',
      column: 'status',
      sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "status" TEXT DEFAULT 'completed'`
    },
    {
      table: 'VetMedicineSale',
      column: 'refundedQty',
      sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "refundedQty" REAL`
    },
    {
      table: 'VetMedicineSale',
      column: 'refundedAmount',
      sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "refundedAmount" REAL`
    },
    {
      table: 'VetMedicineSale',
      column: 'refundedAt',
      sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "refundedAt" DATETIME`
    },
    {
      table: 'VetMedicineSale',
      column: 'refundReason',
      sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "refundReason" TEXT`
    },
    // Sub-unit selling support (medicines sold by ml/dose from a container).
    { table: 'VetMedicine',      column: 'subUnit',              sql: `ALTER TABLE "VetMedicine" ADD COLUMN "subUnit" TEXT` },
    { table: 'VetMedicine',      column: 'subUnitsPerContainer', sql: `ALTER TABLE "VetMedicine" ADD COLUMN "subUnitsPerContainer" REAL` },
    { table: 'VetMedicineBatch', column: 'sellingPrice',         sql: `ALTER TABLE "VetMedicineBatch" ADD COLUMN "sellingPrice" REAL` },
    { table: 'VetMedicineSale',  column: 'saleUnit',             sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "saleUnit" TEXT` },
    { table: 'VetMedicineSale',  column: 'amountPaid',           sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "amountPaid" REAL` },
    { table: 'VetMedicineSale',  column: 'paymentStatus',        sql: `ALTER TABLE "VetMedicineSale" ADD COLUMN "paymentStatus" TEXT DEFAULT 'paid'` }
  ]

  for (const m of columnMigrations) {
    try {
      const cols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${m.table}")`)
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
  for (const table of VET_TABLES) {
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
      if (code === 0) {
        log.info('[db push stdout]', output.trim())
        resolve()
      } else {
        reject(new Error(`prisma db push exited with code ${code}`))
      }
    })
  })
}
