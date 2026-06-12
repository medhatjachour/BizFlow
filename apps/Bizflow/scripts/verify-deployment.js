/**
 * Deployment Verification Script
 * Ensures all critical files and configurations are correct before building
 * Prevents common Windows deployment errors
 */

const fs = require('fs')
const path = require('path')

console.log('\n🔍 Verifying deployment configuration...\n')

let hasErrors = false
let hasWarnings = false

// Check 1: Prisma client generated
console.log('1️⃣  Checking Prisma client generation...')
const prismaGenPath = path.join(__dirname, '..', 'src', 'generated', 'prisma')
if (!fs.existsSync(prismaGenPath)) {
  console.error('  ❌ Prisma client not generated!')
  console.error('     Run: npm run prisma:generate')
  hasErrors = true
} else {
  const files = fs.readdirSync(prismaGenPath)
  const hasIndex = files.includes('index.js') || files.includes('index.d.ts')
  const hasBinaries = files.some(f => f.includes('query_engine') || f.endsWith('.node'))
  
  if (!hasIndex) {
    console.error('  ❌ Prisma client files missing!')
    hasErrors = true
  } else if (!hasBinaries) {
    console.error('  ❌ Prisma engine binaries missing!')
    hasErrors = true
  } else {
    console.log('  ✅ Prisma client generated')
    
    // List found binaries
    const binaries = files.filter(f => f.includes('query_engine') || f.endsWith('.node'))
    binaries.forEach(b => {
      const size = (fs.statSync(path.join(prismaGenPath, b)).size / (1024 * 1024)).toFixed(2)
      console.log(`     ✓ ${b} (${size} MB)`)
    })
    
    // Check for Windows binary
    const hasWindowsBinary = binaries.some(b => b.includes('windows'))
    if (!hasWindowsBinary && process.platform === 'win32') {
      console.warn('  ⚠️  Windows binary not found (may cause issues on Windows)')
      hasWarnings = true
    }
  }
}

// Check 2: Template database exists
console.log('\n2️⃣  Checking template database...')
const templateDbPath = path.join(__dirname, '..', 'prisma', 'template.db')
if (!fs.existsSync(templateDbPath)) {
  console.error('  ❌ template.db not found!')
  console.error('     Run: npm run create-template-db')
  hasErrors = true
} else {
  const size = fs.statSync(templateDbPath).size
  if (size < 10240) { // Less than 10KB
    console.warn('  ⚠️  template.db seems too small (may be empty)')
    console.warn(`     Size: ${(size / 1024).toFixed(2)} KB`)
    hasWarnings = true
  } else {
    console.log(`  ✅ template.db exists (${(size / 1024).toFixed(2)} KB)`)
  }
}

// Check 3: Electron builder config
console.log('\n3️⃣  Checking electron-builder.yml...')
const builderConfigPath = path.join(__dirname, '..', 'electron-builder.yml')
if (!fs.existsSync(builderConfigPath)) {
  console.error('  ❌ electron-builder.yml not found!')
  hasErrors = true
} else {
  const config = fs.readFileSync(builderConfigPath, 'utf-8')
  
  // Check critical settings
  const checks = [
    { pattern: /asarUnpack:/, name: 'asarUnpack configured' },
    { pattern: /prisma\/template\.db/, name: 'template.db in extraResources' },
    { pattern: /src\/generated/, name: 'Prisma generated files included' }
  ]
  
  checks.forEach(check => {
    if (check.pattern.test(config)) {
      console.log(`  ✅ ${check.name}`)
    } else {
      console.error(`  ❌ Missing: ${check.name}`)
      hasErrors = true
    }
  })
}

// Check 4: Package.json scripts
console.log('\n4️⃣  Checking package.json scripts...')
const packageJsonPath = path.join(__dirname, '..', 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  
  const requiredScripts = [
    'prisma:generate',
    'build',
    'build:win'
  ]
  
  requiredScripts.forEach(script => {
    if (pkg.scripts[script]) {
      console.log(`  ✅ "${script}" script exists`)
    } else {
      console.error(`  ❌ Missing script: "${script}"`)
      hasErrors = true
    }
  })
  
  // Check if build script includes binary copying
  if (pkg.scripts.build && pkg.scripts.build.includes('copy-prisma-binaries')) {
    console.log('  ✅  Build script copies Prisma binaries')
  } else {
    console.warn('  ⚠️  Build script may not copy Prisma binaries')
    hasWarnings = true
  }
}

// Check 5: Node modules
console.log('\n5️⃣  Checking dependencies...')
const nodeModulesPath = path.join(__dirname, '..', 'node_modules')
if (!fs.existsSync(nodeModulesPath)) {
  console.error('  ❌ node_modules not found!')
  console.error('     Run: npm install')
  hasErrors = true
} else {
  const criticalDeps = [
    '@prisma/client',
    'electron',
    'electron-builder'
  ]
  
  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep)
    if (fs.existsSync(depPath)) {
      console.log(`  ✅ ${dep} installed`)
    } else {
      console.error(`  ❌ ${dep} not installed`)
      hasErrors = true
    }
  })
}

// Check 6: Schema.prisma binaryTargets
console.log('\n6️⃣  Checking Prisma schema binaryTargets...')
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  
  if (schema.includes('binaryTargets')) {
    const hasWindows = schema.includes('"windows"')
    const hasDarwin = schema.includes('"darwin"')
    const hasLinux = schema.includes('"linux"') || schema.includes('"debian"')
    
    console.log(`  ${hasWindows ? '✅' : '⚠️ '} Windows target ${hasWindows ? 'configured' : 'missing'}`)
    console.log(`  ${hasDarwin ? '✅' : '⚠️ '} macOS target ${hasDarwin ? 'configured' : 'missing'}`)
    console.log(`  ${hasLinux ? '✅' : '⚠️ '} Linux target ${hasLinux ? 'configured' : 'missing'}`)
    
    if (!hasWindows) hasWarnings = true
  } else {
    console.warn('  ⚠️  No binaryTargets specified (may cause cross-platform issues)')
    hasWarnings = true
  }
}

// Summary
console.log('\n' + '='.repeat(60))
if (hasErrors) {
  console.error('\n❌ VERIFICATION FAILED - Fix errors before building\n')
  process.exit(1)
} else if (hasWarnings) {
  console.warn('\n⚠️  VERIFICATION PASSED WITH WARNINGS\n')
  console.log('You can proceed, but review warnings above.\n')
  process.exit(0)
} else {
  console.log('\n✅ ALL CHECKS PASSED - Ready to build!\n')
  console.log('Next steps:')
  console.log('  npm run build       # Build the app')
  console.log('  npm run build:win   # Package for Windows')
  console.log('')
  process.exit(0)
}
