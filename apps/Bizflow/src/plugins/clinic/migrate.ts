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
    },
    // ─── Multi-doctor feature (additive, nullable — safe on existing rows) ─────
    { table: 'ClinicPatient',     column: 'primaryDoctorId', sql: `ALTER TABLE "ClinicPatient" ADD COLUMN "primaryDoctorId" TEXT` },
    { table: 'ClinicSession',     column: 'doctorId',        sql: `ALTER TABLE "ClinicSession" ADD COLUMN "doctorId" TEXT` },
    { table: 'ClinicAppointment', column: 'doctorId',        sql: `ALTER TABLE "ClinicAppointment" ADD COLUMN "doctorId" TEXT` },
    { table: 'ClinicStaff',       column: 'specialty',       sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "specialty" TEXT` },
    { table: 'ClinicStaff',       column: 'title',           sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "title" TEXT` },
    { table: 'ClinicStaff',       column: 'licenseNo',       sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "licenseNo" TEXT` },
    { table: 'ClinicStaff',       column: 'bio',             sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "bio" TEXT` },
    { table: 'ClinicStaff',       column: 'avatarColor',     sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "avatarColor" TEXT` },
    { table: 'ClinicStaff',       column: 'roomNumber',      sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "roomNumber" TEXT` },
    { table: 'ClinicStaff',       column: 'consultationFee', sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "consultationFee" REAL` },
    { table: 'ClinicStaff',       column: 'commissionPct',   sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "commissionPct" REAL` },
    { table: 'ClinicStaff',       column: 'isDefault',       sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false` },
    { table: 'ClinicStaff',       column: 'workingHours',    sql: `ALTER TABLE "ClinicStaff" ADD COLUMN "workingHours" TEXT` }
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

  // ─── Backfill doctorId from the legacy free-text doctorName ─────────────────
  // Links existing sessions/appointments to a matching ClinicStaff doctor by name
  // (case-insensitive). Idempotent: only touches rows where doctorId IS NULL.
  // Never creates or deletes doctors — purely a link-up, safe to run every boot.
  await backfillDoctorLinks(prisma)
}

async function backfillDoctorLinks(prisma: any): Promise<void> {
  try {
    const doctors: Array<{ id: string; name: string }> = await prisma.$queryRawUnsafe(
      `SELECT id, name FROM "ClinicStaff" WHERE role = 'doctor'`
    )
    if (!doctors.length) return
    const byName = new Map<string, string>()
    for (const d of doctors) byName.set(d.name.trim().toLowerCase(), d.id)

    for (const table of ['ClinicSession', 'ClinicAppointment']) {
      const rows: Array<{ id: string; doctorName: string | null }> = await prisma.$queryRawUnsafe(
        `SELECT id, doctorName FROM "${table}" WHERE doctorId IS NULL AND doctorName IS NOT NULL AND doctorName <> ''`
      )
      for (const r of rows) {
        const match = byName.get((r.doctorName ?? '').trim().toLowerCase())
        if (match) {
          await prisma.$executeRawUnsafe(
            `UPDATE "${table}" SET doctorId = ? WHERE id = ?`, match, r.id
          )
        }
      }
    }
    log.info('✅ Doctor links backfilled from doctorName')
  } catch (err) {
    log.warn('⚠️  Doctor link backfill skipped:', err)
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
