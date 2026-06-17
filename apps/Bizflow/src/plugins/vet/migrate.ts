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
  'VetMedicineUnit'
]

export async function ensureVetSchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)

  if (missing.length === 0) {
    log.info('✅ Vet tables already exist — no migration needed.')
    // Tables exist, but newer columns might be missing on older databases.
    await applyColumnMigrations(prisma)
    return
  }

  log.info(`🔧 Missing vet tables: [${missing.join(', ')}] — running db push…`)
  await runDbPush(dbUrl, cwd)
  // db push already adds every column from the schema, but run the safety
  // pass anyway so a partial/failed push still ends up consistent.
  await applyColumnMigrations(prisma)
  log.info('✅ Vet schema applied successfully')
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
    }
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
