/**
 * Clinic Plugin – DB Migration
 *
 * Called once on app startup after the Prisma client is ready.
 * Runs `prisma db push --schema=prisma/merged.prisma` only when one or more
 * clinic tables are missing so it is a no-op on every run after the first.
 */

import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Clinic:Migrate')

const CLINIC_TABLES = ['ClinicPatient', 'ClinicSession', 'ClinicPrescription', 'ClinicCheckResult', 'ClinicAppointment', 'ClinicExpense', 'ClinicStaff', 'ClinicSalaryRecord', 'ClinicMaterial', 'ClinicMaterialCategory', 'ClinicMaterialBatch', 'ClinicSessionMaterial', 'ClinicMaterialLoss', 'ClinicMaterialExpiry', 'ClinicMaterialAdjustment']

export async function ensureClinicSchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)

  if (missing.length === 0) {
    log.info('✅ Clinic tables already exist — checking column migrations…')
    await applyColumnMigrations(prisma)
    return
  }

  log.info(`🔧 Missing clinic tables: [${missing.join(', ')}] — running db push…`)
  await runDbPush(dbUrl, cwd)
  log.info('✅ Clinic schema applied successfully')
}

async function getMissingTables(prisma: any): Promise<string[]> {
  const missing: string[] = []
  for (const table of CLINIC_TABLES) {
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

/**
 * Safe column additions for existing databases (SQLite ALTER TABLE ADD COLUMN).
 * Each entry is idempotent — adding a column that already exists is caught and ignored.
 */
async function applyColumnMigrations(prisma: any): Promise<void> {
  const columnMigrations: Array<{ table: string; column: string; sql: string }> = [
    {
      table: 'ClinicPatient',
      column: 'folderNumber',
      sql: `ALTER TABLE "ClinicPatient" ADD COLUMN "folderNumber" TEXT`
    },
    {
      table: 'ClinicSession',
      column: 'dentalChart',
      sql: `ALTER TABLE "ClinicSession" ADD COLUMN "dentalChart" TEXT`
    }
  ]

  for (const m of columnMigrations) {
    try {
      // Check if column already exists via PRAGMA
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
