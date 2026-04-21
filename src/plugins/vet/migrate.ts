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
  'VetSalaryRecord'
]

export async function ensureVetSchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)

  if (missing.length === 0) {
    log.info('✅ Vet tables already exist — no migration needed.')
    return
  }

  log.info(`🔧 Missing vet tables: [${missing.join(', ')}] — running db push…`)
  await runDbPush(dbUrl, cwd)
  log.info('✅ Vet schema applied successfully')
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
      if (code === 0) {
        log.info('[db push stdout]', output.trim())
        resolve()
      } else {
        reject(new Error(`prisma db push exited with code ${code}`))
      }
    })
  })
}
