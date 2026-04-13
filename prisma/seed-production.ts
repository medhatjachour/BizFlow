/**
 * Production Seed - Setup Account Only
 * Creates minimal data needed for production deployment
 */

import { PrismaClient } from '../src/generated/prisma'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting production seed (setup account only)...\n')

  // ==================== CLEAR EXISTING DATA ====================
  console.log('🗑️ Clearing existing data...')
  
  // Delete in correct order respecting foreign key constraints
  // Use try-catch to handle cases where tables might not exist yet
  // Cast to any so optional-chain access works regardless of which plugin's
  // Prisma client was generated (e.g. clinic-only has no stockMovement model).
  const p: any = prisma
  try {
    await p.stockMovement?.deleteMany()
    await p.productImage?.deleteMany()
    await p.variantAttributeValue?.deleteMany()
    await p.productAttribute?.deleteMany()
    await p.productVariant?.deleteMany()
    await p.saleItem?.deleteMany()
    await p.saleTransaction?.deleteMany()
    await p.installment?.deleteMany()
    await p.installmentPlan?.deleteMany()
    await p.deposit?.deleteMany()
    await p.receiptTemplate?.deleteMany()
    await p.purchaseOrderItem?.deleteMany()
    await p.purchaseOrder?.deleteMany()
    await p.supplierProduct?.deleteMany()
    await p.supplier?.deleteMany()
    await p.financialTransaction?.deleteMany()
    await p.product?.deleteMany()
    await p.employeeOvertime?.deleteMany()
    await p.employeeShift?.deleteMany()
    await p.employeePayroll?.deleteMany()
    await p.employeeActivityLog?.deleteMany()
    await p.employeeDocument?.deleteMany()
    await p.employeeAttendance?.deleteMany()
    await p.employee?.deleteMany()
    await p.customer?.deleteMany()
    await p.store?.deleteMany()
    await p.emailReport?.deleteMany()
    await p.user?.deleteMany()
    await p.category?.deleteMany()
    console.log('✅ Cleared existing data\n')
  } catch (error: any) {
    if (error.code === 'P2021') {
      console.log('⚠️  Database tables not found. They will be created by migrations.\n')
    } else {
      throw error
    }
  }

  // ==================== SETUP USER ====================
  console.log('👤 Creating setup user...')
  const setupUser = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'setup',
      passwordHash: await bcrypt.hash('setup123', 10),
      role: 'admin',
      fullName: 'Setup Administrator',
      email: 'setup@bizflow.local',
      isActive: true,
    },
  })
  console.log('✅ Created setup user\n')

  console.log('🎉 Production seeding completed successfully!\n')
  console.log('📊 Summary:')
  console.log('   • 1 setup user (admin)')
  console.log('\n🔐 Login Credentials:')
  console.log('   Username: setup')
  console.log('   Password: setup123')
  console.log('\n⚠️  SECURITY: Change this password after first login!')
  console.log('💡 Ready for production configuration!')
}

main()
  .catch((e) => {
    console.error('❌ Error during production seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
