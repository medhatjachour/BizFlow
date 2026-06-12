const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Create a template sqlite DB with schema and minimal seed (admin user)
const repoRoot    = path.resolve(__dirname, '..')
const templatePath = path.join(repoRoot, 'prisma', 'template.db')
const mergedSchema = path.join(repoRoot, 'prisma', 'merged.prisma')
const envBuildPath = path.join(repoRoot, '.env.build')

/**
 * Resolve which modules to include in the template DB.
 * Priority: ENABLED_MODULES env var > .env.build file > 'commerce' (kernel default).
 *
 * We intentionally do NOT fall back to "all plugins" — the template DB should
 * only contain the core kernel tables plus the explicitly selected plugin so
 * that first-run installations are lean and don't carry unused tables.
 */
function resolveModules() {
  if (process.env.ENABLED_MODULES) {
    return process.env.ENABLED_MODULES.trim()
  }
  if (fs.existsSync(envBuildPath)) {
    const match = fs.readFileSync(envBuildPath, 'utf-8').match(/^ENABLED_MODULES=(.+)$/m)
    if (match) return match[1].trim()
  }
  // Default: commerce is the base/kernel plugin bundled with every build
  return 'commerce'
}

const enabledModules = resolveModules()
console.log(`Creating template DB at ${templatePath}`)
console.log(`Enabled modules: ${enabledModules}`)

// Step 1: Merge only the enabled-plugin schemas so the template DB contains
//         only the tables relevant to the selected plugins.
console.log('Merging schemas for enabled modules...')
const mergeEnv = Object.assign({}, process.env, { ENABLED_MODULES: enabledModules })
execSync('node scripts/merge-schemas.js', { stdio: 'inherit', cwd: repoRoot, env: mergeEnv })

// Step 2: Generate the Prisma client from the merged schema
execSync(`npx prisma generate --schema=${mergedSchema}`, { stdio: 'inherit', cwd: repoRoot, env: mergeEnv })

// Step 3: Push the MERGED schema (not the full schema.prisma) to template.db
//         This ensures only enabled-plugin tables are created.
const dbEnv = Object.assign({}, mergeEnv, { DATABASE_URL: `file:${templatePath}` })

console.log('Pushing merged Prisma schema to template DB...')
execSync(`npx prisma db push --schema=${mergedSchema}`, { stdio: 'inherit', cwd: repoRoot, env: dbEnv })

// Step 4: Run production seed to create setup account in template.db
console.log('Seeding setup account into template DB (production seed)...')
execSync('npx ts-node prisma/seed-production.ts', { stdio: 'inherit', cwd: repoRoot, env: dbEnv })

console.log('Template DB created successfully:', templatePath)
