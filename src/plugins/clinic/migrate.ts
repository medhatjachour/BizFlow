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

const CLINIC_TABLES = ['ClinicPatient', 'ClinicSession', 'ClinicPrescription', 'ClinicCheckResult', 'ClinicAppointment', 'ClinicExpense', 'ClinicStaff', 'ClinicSalaryRecord']

export async function ensureClinicSchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)

  if (missing.length === 0) {
    log.info('✅ Clinic tables already exist — no migration needed')
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

function runDbPush(dbUrl: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['prisma', 'db', 'push', '--schema=prisma/merged.prisma', '--skip-generate', '--accept-data-loss'],
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
