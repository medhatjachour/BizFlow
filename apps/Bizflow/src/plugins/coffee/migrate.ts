// ─── Coffee Plugin – Database Migration ──────────────────────────────────────
// Runs once on app startup to ensure all coffee tables exist in the SQLite DB.
// Uses `prisma db push` against the merged schema (idempotent — no-op if
// tables already exist).
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Coffee:Migrate')

/** Tables introduced by this plugin (must match model names in schema.prisma). */
const COFFEE_TABLES = [
  'CoffeeCategory',
  'CoffeeProduct',
  'CoffeeStockMovement',
  'CoffeeIncomingReceipt',
  'CoffeeIncomingReceiptItem',
  'CoffeeTable',
  'CoffeeOrder',
  'CoffeeOrderItem',
  'CoffeeShift',
  'CoffeeCustomer',
  'CoffeeExpense'
]

export async function ensureCoffeeSchema(prisma: any, dbUrl: string, cwd: string): Promise<void> {
  const missing = await getMissingTables(prisma)
  if (missing.length === 0) {
    log.info('✅ Coffee tables already exist — no migration needed')
    return
  }
  log.info(`🔧 Missing coffee tables: [${missing.join(', ')}] — running db push…`)
  await runDbPush(dbUrl, cwd)
  log.info('✅ Coffee schema applied successfully')
}

async function getMissingTables(prisma: any): Promise<string[]> {
  const missing: string[] = []
  for (const table of COFFEE_TABLES) {
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
