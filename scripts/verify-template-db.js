/**
 * Verify template.db has proper schema and setup user
 * Used in CI/CD to ensure production database will work
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const templateDbPath = path.join(__dirname, '..', 'prisma', 'template.db')

console.log('\n🔍 Verifying template.db schema...\n')

// Check file exists
if (!fs.existsSync(templateDbPath)) {
  console.error('❌ template.db not found at:', templateDbPath)
  process.exit(1)
}

// Check file size
const stats = fs.statSync(templateDbPath)
const sizeKB = (stats.size / 1024).toFixed(2)
console.log(`✅ File exists (${sizeKB} KB)`)

if (stats.size < 10240) {
  console.error('❌ File too small, likely empty or corrupt')
  process.exit(1)
}

// Connect to template database and verify
async function verify() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${templateDbPath}`
      }
    }
  })

  try {
    // Check critical tables by querying them
    const userCount = await prisma.user.count()
    const productCount = await prisma.product.count()
    const categoryCount = await prisma.category.count()
    const storeCount = await prisma.store.count()
    
    console.log('\n📊 Data verification:')
    console.log(`   Users: ${userCount}`)
    console.log(`   Products: ${productCount}`)
    console.log(`   Categories: ${categoryCount}`)
    console.log(`   Stores: ${storeCount}`)
    
    if (userCount === 0) {
      console.error('\n❌ No users found in template!')
      process.exit(1)
    }
    
    // Check setup user exists
    const setupUser = await prisma.user.findUnique({
      where: { username: 'setup' }
    })
    
    if (!setupUser) {
      console.error('\n❌ Setup user not found!')
      process.exit(1)
    }
    
    console.log(`\n✅ Setup user verified (role: ${setupUser.role})`)
    
    // Try to query a few tables to ensure schema is complete
    try {
      await prisma.saleTransaction.findFirst()
      await prisma.customer.findFirst()
      await prisma.stockMovement.findFirst()
      console.log('✅ All major tables accessible')
    } catch (error) {
      console.error('❌ Error accessing tables:', error.message)
      process.exit(1)
    }
    
    console.log('\n✅ Template database verification passed!\n')
    
  } catch (error) {
    console.error('\n❌ Error verifying template database:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verify()
