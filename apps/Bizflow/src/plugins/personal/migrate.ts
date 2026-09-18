// ─── Personal Work Plugin – Database Migration ───────────────────────────────
// Runs once on app startup to ensure all personal-work tables exist in the
// SQLite DB. Uses `prisma db push` against the merged schema (idempotent —
// no-op when the tables are already there).
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Personal:Migrate')

/** Tables introduced by this plugin (must match model names in schema.prisma). */
export const PERSONAL_TABLES = [
  'PersonalClient',
  'PersonalProject',
  'PersonalDeliverable',
  'PersonalStageEvent',
  'PersonalChangeRequest',
  'PersonalWaitLog',
  'PersonalChecklistTemplate',
  'PersonalChecklistItem',
  'PersonalTask',
  'PersonalFocusSession',
  'PersonalWorkLog',
  'PersonalInvoice',
  'PersonalPayment',
  'PersonalExpense',
  'PersonalSubscription',
  'PersonalRetainer',
  'PersonalRetainerUsage',
  'PersonalRateProfile',
  'PersonalTaxVaultEntry',
  'PersonalBlackout',
  'PersonalWorkload',
  'PersonalScript',
  'PersonalNote'
]

export async function ensurePersonalSchema(prisma: any, dbUrl: string, cwd: string): Promise<void> {
  log.info(`Personal work schema migration starting… [dbUrl: ${dbUrl}]`)
  const missing = await getMissingTables(prisma)
  if (missing.length === 0) {
    log.info('✅ Personal work tables already exist — no migration needed')
    return
  }
  log.info(`🔧 Missing personal tables: [${missing.join(', ')}] — running db push…`)
  await runDbPush(dbUrl, cwd)
  log.info('✅ Personal work schema applied successfully')
}

async function getMissingTables(prisma: any): Promise<string[]> {
  const missing: string[] = []

  try {
    const coreTableCheck = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='User' LIMIT 1`
    )
    log.info(`Database connection verified: core tables ${coreTableCheck?.length > 0 ? 'exist' : 'not found'}`)
  } catch (err) {
    log.error('Failed to verify database connection:', err instanceof Error ? err.message : String(err))
  }

  for (const table of PERSONAL_TABLES) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      )
      if (!rows || rows.length === 0) {
        missing.push(table)
      }
    } catch (err) {
      log.error(`Error checking table ${table}:`, err instanceof Error ? err.message : String(err))
      missing.push(table)
    }
  }

  if (missing.length > 0) {
    log.info(`Found ${missing.length} missing personal tables: [${missing.join(', ')}]`)
  } else {
    log.info(`All ${PERSONAL_TABLES.length} personal work tables exist in database`)
  }
  return missing
}

function runDbPush(dbUrl: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['prisma', 'db', 'push', '--schema=prisma/merged.prisma', '--accept-data-loss'],
      { cwd, shell: true, env: { ...process.env, DATABASE_URL: dbUrl } }
    )
    let output = ''
    let stderrOutput = ''
    proc.stdout?.on('data', (d: Buffer) => { output += d.toString() })
    proc.stderr?.on('data', (d: Buffer) => {
      const t = d.toString()
      stderrOutput += t
      if (!t.includes('Prisma schema loaded') && !t.includes('Datasource') && !t.includes('Update available')) {
        log.warn('[db push stderr]', t.trim())
      }
    })
    proc.on('close', (code) => {
      if (code === 0 || output.includes('Your database is now in sync')) {
        resolve()
      } else if (stderrOutput.includes('already exists')) {
        log.info('⚠️  Some tables already existed; treating as up-to-date')
        resolve()
      } else {
        reject(new Error(`prisma db push failed (exit ${code})`))
      }
    })
    proc.on('error', reject)
  })
}
