import { spawn } from 'node:child_process'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Gym:Migrate')

const GYM_TABLES = [
  'GymCoach', 'GymTrainee', 'GymPlan', 'GymSubscription',
  'GymFreeze', 'GymWalkSession', 'GymExpense',
  'GymMeasurement', 'GymGoal', 'GymProgram', 'GymProgramDay',
  'GymProgramExercise', 'GymProgramAssignment',
  'GymLocker', 'GymLockerAssignment', 'GymShift'
]

async function needsPlanColumnMigration(prisma: any): Promise<boolean> {
  try {
    const cols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info('GymPlan')`)
    return !cols.some((c: any) => c.name === 'hasSauna')
  } catch {
    return false
  }
}

export async function ensureGymSchema(
  prisma: any,
  dbUrl: string,
  cwd: string
): Promise<void> {
  const missing = await getMissingTables(prisma)
  if (missing.length > 0) {
    log.info(`🔧 Missing gym tables: [${missing.join(', ')}] — running db push…`)
    await runDbPush(dbUrl, cwd)
    log.info('✅ Gym schema applied successfully')
    return
  }
  // Tables exist — check if new columns were added to GymPlan
  const needsCols = await needsPlanColumnMigration(prisma)
  if (needsCols) {
    log.info('🔧 GymPlan has new columns — running db push to add them…')
    await runDbPush(dbUrl, cwd)
    log.info('✅ Gym plan columns updated successfully')
    return
  }
  log.info('✅ Gym tables already exist and are up to date')
}

async function getMissingTables(prisma: any): Promise<string[]> {
  const missing: string[] = []
  for (const table of GYM_TABLES) {
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
      if (code === 0 || output.includes('Your database is now in sync')) {
        resolve()
      } else {
        reject(new Error(`prisma db push failed (exit ${code})`))
      }
    })
    proc.on('error', reject)
  })
}
