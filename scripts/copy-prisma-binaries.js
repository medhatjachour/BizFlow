/**
 * Copy Prisma binaries to ensure they're available in packaged app
 * This fixes the "cannot find module .prisma/client/default" error
 * 
 * CRITICAL for Electron + Prisma packaging:
 * - Prisma generates to custom location (src/generated/prisma)
 * - At runtime, Prisma looks in node_modules/.prisma/client
 * - This script ensures binaries exist in BOTH locations
 */

const fs = require('fs')
const path = require('path')

const sourceDir = path.join(__dirname, '..', 'src', 'generated', 'prisma')
const targetDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client')
const alternateTarget = path.join(__dirname, '..', 'node_modules', '@prisma', 'client')

console.log('\n📦 Copying Prisma binaries for Electron packaging...')
console.log('Source:', sourceDir)
console.log('Target 1:', targetDir)
console.log('Target 2:', alternateTarget)

// Verify source exists
if (!fs.existsSync(sourceDir)) {
  console.error('❌ Source directory not found! Run "npm run prisma:generate" first')
  console.log('Attempting to generate Prisma client...')
  try {
    require('child_process').execSync('npx prisma generate', { stdio: 'inherit' })
    console.log('✅ Prisma client generated successfully')
  } catch (error) {
    console.error('❌ Failed to generate Prisma client')
    process.exit(1)
  }
}

// Create target directories
;[targetDir, alternateTarget].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`✓ Created ${path.basename(path.dirname(dir))}/${path.basename(dir)}`)
  }
})

// Copy all files to both locations
try {
  // Check if source directory exists after potential generation
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ Source directory still not found after generation attempt')
    process.exit(1)
  }
  
  const files = fs.readdirSync(sourceDir)
  let copiedCount = 0
  let binaryCount = 0

  console.log(`\nFound ${files.length} files in source directory`)

  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file)
    
    // Only copy files (not directories)
    if (fs.statSync(sourcePath).isFile()) {
      // Copy to both target locations
      const targetPath1 = path.join(targetDir, file)
      const targetPath2 = path.join(alternateTarget, file)
      
      fs.copyFileSync(sourcePath, targetPath1)
      fs.copyFileSync(sourcePath, targetPath2)
      copiedCount++
      
      // Log binary/engine files specifically (more flexible pattern matching)
      if (file.includes('query_engine') || 
          file.includes('libquery_engine') ||
          file.endsWith('.node') || 
          file.endsWith('.dll.node') ||
          file.endsWith('.so.node') ||
          file.endsWith('.dylib.node')) {
        const size = (fs.statSync(targetPath1).size / (1024 * 1024)).toFixed(2)
        console.log(`  ✓ Copied engine: ${file} (${size} MB)`)
        binaryCount++
      }
    }
  })

  if (binaryCount === 0) {
    console.warn('\n⚠️  Warning: No Prisma engine binaries found!')
    console.warn('Files in source directory:', files.filter(f => fs.statSync(path.join(sourceDir, f)).isFile()).join(', '))
  }

  console.log(`\n✅ Successfully copied ${copiedCount} files (${binaryCount} engine binaries)`)
  console.log('✅ Prisma binaries ready for packaging\n')
  
  // Verify critical Windows binary exists (if building on/for Windows) - flexible matching
  const windowsBinary = files.find(f => 
    (f.includes('windows') || f.includes('win32')) && 
    (f.includes('query_engine') || f.includes('libquery_engine'))
  )
  if (windowsBinary) {
    console.log(`✓ Windows binary verified: ${windowsBinary}`)
  } else if (process.platform === 'win32') {
    console.warn('⚠️  Warning: Windows binary not found. This may cause issues on Windows.')
    console.warn('Available binaries:', files.filter(f => f.includes('query_engine')).join(', '))
  }
  
} catch (error) {
  console.error('\n❌ Error copying Prisma binaries:', error)
  console.error('\nTroubleshooting:')
  console.error('1. Run: npm run prisma:generate')
  console.error('2. Check that src/generated/prisma exists')
  console.error('3. Verify binaryTargets in prisma/schema.prisma\n')
  process.exit(1)
}
