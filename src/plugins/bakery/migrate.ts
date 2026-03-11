/**
 * Bakery Plugin – DB Migration
 *
 * Called once on app startup (after the Prisma client is ready).
 * Uses `prisma db push --schema=prisma/merged.prisma` to ensure all
 * bakery tables exist in the active database without destroying existing data.
 *
 * This file is the only place that knows which tables belong to the bakery
 * plugin — keeping the migration concern fully inside the plugin boundary.
 */

import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Bakery:Migrate')

/** Table names introduced by this plugin.  Used for the existence check. */
const BAKERY_TABLES = [
  'Recipe',
  'RecipeIngredient',
  'ProductionBatch',
  'PantryIngredient',
  'WasteLog',
  'ProductionSchedule'
]

/**
 * Ensure all bakery tables exist in the database pointed to by `dbUrl`.
 * Runs `prisma db push --schema=prisma/merged.prisma` only when one or more
 * tables are missing, so it is a no-op on every run after the first.
 *
 * @param prisma  - Active Prisma client (used to check table existence)
 * @param dbUrl   - DATABASE_URL for the active database (absolute file path)
 * @param cwd     - Project root (where package.json lives)
 */
export async function ensureBakerySchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)

  if (missing.length === 0) {
    log.info('✅ Bakery tables already exist — no migration needed')
    return
  }

  log.info(`🔧 Missing bakery tables: [${missing.join(', ')}] — running db push…`)

  await runDbPush(dbUrl, cwd)

  log.info('✅ Bakery schema applied successfully')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns names of BAKERY_TABLES that don't exist in the DB yet. */
async function getMissingTables(prisma: any): Promise<string[]> {
  const missing: string[] = []

  for (const table of BAKERY_TABLES) {
    try {
      await prisma.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      )
      // If the SELECT returns nothing we still treat it as existing (no throw)
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

/** Runs `prisma db push --schema=prisma/merged.prisma` as a child process. */
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
