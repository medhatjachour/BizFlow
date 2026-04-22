/**
 * merge-schemas.js
 *
 * Combines prisma/schema.prisma (core) with each enabled plugin's
 * src/plugins/<id>/schema.prisma to produce prisma/merged.prisma.
 *
 * Schemas live at: src/plugins/<id>/schema.prisma
 *
 * Usage:
 *   node scripts/merge-schemas.js [--modules bakery,restaurant]
 *
 * By default it reads ENABLED_MODULES from the environment variable, or
 * falls back to merging ALL modules present in prisma/modules/.
 *
 * The merged file is gitignored — always regenerate before `prisma generate`.
 */

const fs = require('fs')
const path = require('path')

// ─── Configuration ───────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')
const CORE_SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma')
const PLUGINS_DIR = path.join(ROOT, 'src', 'plugins')
const OUTPUT = path.join(ROOT, 'prisma', 'merged.prisma')

/**
 * Module registry — defines which modules exist and what cross-references they
 * inject into core models.  Any cross-reference listed here will be spliced
 * into the named model in schema.prisma automatically during the merge.
 *
 * Schemas live at: src/plugins/<id>/schema.prisma
 */
const MODULE_REGISTRY = {
  // commerce MUST be first — bakery/warehouse reference Product which lives here
  commerce: {
    file: 'schema.prisma',
    // Inject back-relations into kernel User model when commerce is enabled
    injectFields: {
      User: [
        '  deactivatedProducts     Product[]              @relation("ProductDeactivations") // Products this user has deactivated',
        '  deactivatedCustomers    Customer[]             @relation("CustomerDeactivations") // Customers this user has deactivated',
        '  saleTransactions        SaleTransaction[]      // New transaction-based sales',
        '  stockMovements          StockMovement[]        // Inventory changes made by this user'
      ]
    }
  },
  bakery: {
    file: 'schema.prisma',  // path: src/plugins/bakery/schema.prisma
    /** Fields to inject into core models.  Key = model name, value = lines. */
    injectFields: {
      Product: [
        '  recipesAsOutput    Recipe[]    @relation("RecipeOutputProduct") // Recipes that produce this product',
        '  wasteLogs          WasteLog[]  @relation("ProductWasteLogs")    // Waste records for this product'
      ]
    }
  },
  restaurant: {
    file: 'schema.prisma',
    injectFields: {}
  },
  warehouse: {
    file: 'schema.prisma',
    injectFields: {}
  },
  clinic: {
    file: 'schema.prisma',
    injectFields: {}
  },
  vet: {
    file: 'schema.prisma',
    injectFields: {}
  },
  gym: {
    file: 'schema.prisma',
    injectFields: {}
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve which modules to merge (CLI > env > .env.build > all-in-dir). */
function resolveModules() {
  // --modules bakery,restaurant
  const cliIdx = process.argv.indexOf('--modules')
  if (cliIdx !== -1 && process.argv[cliIdx + 1]) {
    return process.argv[cliIdx + 1].split(',').map((m) => m.trim())
  }
  // ENABLED_MODULES=bakery,restaurant (shell env)
  if (process.env.ENABLED_MODULES) {
    return process.env.ENABLED_MODULES.split(',').map((m) => m.trim())
  }
  // .env.build (written by scripts/configure-build.js)
  const envBuildPath = path.join(ROOT, '.env.build')
  if (fs.existsSync(envBuildPath)) {
    const match = fs.readFileSync(envBuildPath, 'utf-8').match(/^ENABLED_MODULES=(.+)$/m)
    if (match) return match[1].split(',').map((m) => m.trim())
  }
  // Default: merge every plugin that has a schema.prisma
  if (!fs.existsSync(PLUGINS_DIR)) return []
  return fs
    .readdirSync(PLUGINS_DIR)
    .filter((name) => {
      const schema = path.join(PLUGINS_DIR, name, 'schema.prisma')
      return fs.existsSync(schema)
    })
}

/** Plugin dependency map — when a plugin is enabled, these plugins are auto-included first. */
const PLUGIN_DEPENDENCIES = {
  bakery: ['commerce'],
  restaurant: ['commerce'],
  warehouse: ['commerce'],
}

/**
 * Inject cross-reference fields into a model block in the schema text.
 *
 * Finds `model <ModelName> {` … `}` and inserts the given lines just before
 * the closing `createdAt` / `updatedAt` / `}`.
 */
function injectFields(schemaText, modelName, fields) {
  // Regex: finds the model block up to (but not including) the closing brace
  const modelRegex = new RegExp(
    `(model ${modelName} \\{[^}]*?)(\\n  createdAt|\\n  updatedAt|\\n  @@|\\n\\})`,
    's'
  )
  const insertion = '\n' + fields.join('\n')
  const replaced = schemaText.replace(modelRegex, `$1${insertion}$2`)
  if (replaced === schemaText) {
    console.warn(`  ⚠  Could not inject fields into model "${modelName}" — block not found.`)
  }
  return replaced
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('🔀  BizFlow Schema Merge')
  console.log('   core  :', CORE_SCHEMA)
  console.log('   output:', OUTPUT)

  // 1. Read core schema
  let merged = fs.readFileSync(CORE_SCHEMA, 'utf8')

  // 2. Determine enabled modules (with auto-dependency expansion)
  const rawModules = resolveModules()
  const enabledModules = []
  for (const m of rawModules) {
    for (const dep of (PLUGIN_DEPENDENCIES[m] || [])) {
      if (!enabledModules.includes(dep)) enabledModules.push(dep)
    }
    if (!enabledModules.includes(m)) enabledModules.push(m)
  }
  console.log('   modules:', enabledModules.length ? enabledModules.join(', ') : '(none)')

  // 3. Process each module
  for (const moduleName of enabledModules) {
    const def = MODULE_REGISTRY[moduleName]
    if (!def) {
      console.warn(`  ⚠  Unknown module "${moduleName}" — skipping.`)
      continue
    }

    const moduleFile = path.join(PLUGINS_DIR, moduleName, def.file)
    if (!fs.existsSync(moduleFile)) {
      console.warn(`  ⚠  Plugin schema not found: ${moduleFile} — skipping.`)
      continue
    }

    // 3a. Inject cross-reference fields into core models
    if (def.injectFields) {
      for (const [modelName, fields] of Object.entries(def.injectFields)) {
        merged = injectFields(merged, modelName, fields)
        console.log(`  ✓  Injected ${fields.length} field(s) into ${modelName} for [${moduleName}]`)
      }
    }

    // 3b. Append module models (strip any stray generator/datasource blocks)
    let moduleContent = fs.readFileSync(moduleFile, 'utf8')
    // Remove comment header block and any generator/datasource declarations
    moduleContent = moduleContent
      .replace(/^\/\/.*$/gm, '')              // strip single-line comments
      .replace(/generator\s+\w+\s*\{[^}]*\}/gs, '')
      .replace(/datasource\s+\w+\s*\{[^}]*\}/gs, '')
      .trim()

    merged += `\n\n// ── Module: ${moduleName} ${'─'.repeat(60 - moduleName.length)}\n\n`
    merged += moduleContent + '\n'
    console.log(`  ✓  Appended module [${moduleName}] (${moduleFile})`)
  }

  // 4. Write output
  const header =
    `// ============================================================\n` +
    `// AUTO-GENERATED — do not edit manually\n` +
    `// Run: node scripts/merge-schemas.js\n` +
    `// Generated: ${new Date().toISOString()}\n` +
    `// Modules: ${enabledModules.join(', ') || 'none'}\n` +
    `// ============================================================\n\n`

  fs.writeFileSync(OUTPUT, header + merged, 'utf8')
  console.log(`\n✅  Wrote merged schema to ${OUTPUT}`)
}

main()
