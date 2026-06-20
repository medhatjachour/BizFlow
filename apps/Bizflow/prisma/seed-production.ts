/**
 * Production Seed - Setup Account Only
 * Creates minimal data needed for production deployment
 */

import { PrismaClient } from '../src/generated/prisma'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Starter materials for clinic module (if enabled)
const STARTER_MATERIALS = [
  // ── Dental ───────────────────────────────────────────────────────────────
  { name: 'Composite Resin A2',          category: 'Dental',      unit: 'syringe', quantity: 42,  minQuantity: 8,  costPerUnit: 18.5,  supplier: 'DentalHub',       expiryInDays: 420,  batchNumber: 'CR-A2-2026-01' },
  { name: 'Composite Resin A3',          category: 'Dental',      unit: 'syringe', quantity: 36,  minQuantity: 8,  costPerUnit: 18.5,  supplier: 'DentalHub',       expiryInDays: 390,  batchNumber: 'CR-A3-2026-01' },
  { name: 'Bonding Agent',               category: 'Dental',      unit: 'bottle',  quantity: 24,  minQuantity: 5,  costPerUnit: 24.0,  supplier: 'DentalHub',       expiryInDays: 300,  batchNumber: 'BA-2026-04'    },
  { name: 'Temporary Filling Material',  category: 'Dental',      unit: 'jar',     quantity: 20,  minQuantity: 5,  costPerUnit: 13.5,  supplier: 'DentalHub',       expiryInDays: 330,  batchNumber: 'TFM-2026-02'   },
  { name: 'Dental Cement',               category: 'Dental',      unit: 'box',     quantity: 28,  minQuantity: 6,  costPerUnit: 16.2,  supplier: 'DentalHub',       expiryInDays: 420,  batchNumber: 'DC-2026-04'    },
  { name: 'Zinc Oxide Eugenol',          category: 'Dental',      unit: 'kit',     quantity: 12,  minQuantity: 4,  costPerUnit: 11.0,  supplier: 'DentalHub',       expiryInDays: 360,  batchNumber: 'ZOE-2026-01'   },
  { name: 'Alginate Impression Material',category: 'Dental',      unit: 'bag',     quantity: 18,  minQuantity: 4,  costPerUnit: 9.0,   supplier: 'TechDent',        expiryInDays: 180,  batchNumber: 'ALG-2026-02'   },
  // ── Consumable ───────────────────────────────────────────────────────────
  { name: 'Etching Gel 37%',             category: 'Consumable',  unit: 'tube',    quantity: 4,   minQuantity: 6,  costPerUnit: 9.2,   supplier: 'MedSupply Co.',   expiryInDays: 15,   batchNumber: 'EG-37-2026-02' },
  { name: 'Irrigation Saline 500ml',     category: 'Consumable',  unit: 'bottle',  quantity: 40,  minQuantity: 10, costPerUnit: 3.6,   supplier: 'MedSupply Co.',   expiryInDays: 540,  batchNumber: 'SAL-500-2026-02'},
  { name: 'Gauze Pads Sterile',          category: 'Consumable',  unit: 'pack',    quantity: 80,  minQuantity: 20, costPerUnit: 2.1,   supplier: 'SteriClean',      expiryInDays: 720,  batchNumber: 'GZ-2026-01'    },
  { name: 'Surgical Gloves Medium',      category: 'Consumable',  unit: 'box',     quantity: 70,  minQuantity: 15, costPerUnit: 6.8,   supplier: 'SteriClean',      expiryInDays: 680,  batchNumber: 'GL-M-2026-03'  },
  { name: 'N95 Masks',                   category: 'Consumable',  unit: 'box',     quantity: 34,  minQuantity: 10, costPerUnit: 11.3,  supplier: 'SteriClean',      expiryInDays: 640,  batchNumber: 'N95-2026-02'   },
  { name: 'Suction Tips',                category: 'Consumable',  unit: 'pack',    quantity: 65,  minQuantity: 12, costPerUnit: 4.2,   supplier: 'DentalHub',       expiryInDays: 900,  batchNumber: 'ST-2026-05'    },
  { name: 'Cotton Rolls',                category: 'Consumable',  unit: 'pack',    quantity: 0,   minQuantity: 15, costPerUnit: 2.8,   supplier: 'DentalHub',       expiryInDays: 860,  batchNumber: 'CRL-2026-03'   },
  { name: 'Disposable Saliva Ejectors',  category: 'Consumable',  unit: 'pack',    quantity: 50,  minQuantity: 12, costPerUnit: 3.0,   supplier: 'SteriClean',      expiryInDays: 800,  batchNumber: 'DSE-2026-01'   },
  { name: 'Paper Points #30',            category: 'Consumable',  unit: 'box',     quantity: 8,   minQuantity: 6,  costPerUnit: 5.5,   supplier: 'TechDent',        expiryInDays: 700,  batchNumber: 'PP30-2026-03'  },
  // ── Surgical ─────────────────────────────────────────────────────────────
  { name: 'Sutures 3-0',                 category: 'Surgical',    unit: 'box',     quantity: 25,  minQuantity: 6,  costPerUnit: 14.4,  supplier: 'MedSupply Co.',   expiryInDays: 520,  batchNumber: 'SUT-30-2026-01'},
  { name: 'Hemostatic Sponge',           category: 'Surgical',    unit: 'pack',    quantity: 22,  minQuantity: 5,  costPerUnit: 8.7,   supplier: 'MedSupply Co.',   expiryInDays: 450,  batchNumber: 'HS-2026-03', isActive: false },
  { name: 'Surgical Blades #15',         category: 'Surgical',    unit: 'box',     quantity: 3,   minQuantity: 5,  costPerUnit: 7.0,   supplier: 'MedSupply Co.',   expiryInDays: 600,  batchNumber: 'SB15-2026-02'  },
  // ── Device / Instrument ──────────────────────────────────────────────────
  { name: 'Endodontic Files Set',        category: 'Device',      unit: 'set',     quantity: 18,  minQuantity: 4,  costPerUnit: 22.0,  supplier: 'TechDent',        expiryInDays: null, batchNumber: 'ENDO-SET-2026-01'},
  { name: 'Impression Tray Set',         category: 'Device',      unit: 'set',     quantity: 6,   minQuantity: 2,  costPerUnit: 35.0,  supplier: 'TechDent',        expiryInDays: null, batchNumber: 'ITS-2026-01'   },
  // ── Medication ───────────────────────────────────────────────────────────
  { name: 'Local Anesthetic Carpule',    category: 'Medication',  unit: 'box',     quantity: 55,  minQuantity: 12, costPerUnit: 12.0,  supplier: 'Clinic Pharma',   expiryInDays: -35,  batchNumber: 'LA-CP-2026-03' },
  { name: 'Ibuprofen 400mg (sample)',    category: 'Medication',  unit: 'strip',   quantity: 30,  minQuantity: 10, costPerUnit: 1.5,   supplier: 'Clinic Pharma',   expiryInDays: 365,  batchNumber: 'IBU-400-2026-01'},
  { name: 'Chlorhexidine Mouthwash',     category: 'Medication',  unit: 'bottle',  quantity: 20,  minQuantity: 6,  costPerUnit: 4.8,   supplier: 'Clinic Pharma',   expiryInDays: 290,  batchNumber: 'CHX-2026-04'   },
  { name: 'Topical Fluoride Gel',        category: 'Medication',  unit: 'tube',    quantity: 15,  minQuantity: 4,  costPerUnit: 6.5,   supplier: 'Clinic Pharma',   expiryInDays: 25,   batchNumber: 'FLU-2026-02'   },
  // ── Laboratory ───────────────────────────────────────────────────────────
  { name: 'Plaster of Paris (dental)',   category: 'Laboratory',  unit: 'kg',      quantity: 5,   minQuantity: 2,  costPerUnit: 8.0,   supplier: 'DentalLab Pro',   expiryInDays: 365,  batchNumber: 'POP-2026-01'   },
  { name: 'Dental Wax Blocks',           category: 'Laboratory',  unit: 'box',     quantity: 10,  minQuantity: 3,  costPerUnit: 12.0,  supplier: 'DentalLab Pro',   expiryInDays: null, batchNumber: 'DWX-2026-01'   },
]

const DEFAULT_CATEGORIES = [
  { name: 'Dental',      color: 'teal',    sortOrder: 0 },
  { name: 'Surgical',    color: 'violet',  sortOrder: 1 },
  { name: 'Consumable',  color: 'blue',    sortOrder: 2 },
  { name: 'Device',      color: 'indigo',  sortOrder: 3 },
  { name: 'Medication',  color: 'emerald', sortOrder: 4 },
  { name: 'Laboratory',  color: 'cyan',    sortOrder: 5 },
  { name: 'Other',       color: 'slate',   sortOrder: 6 },
]

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
    await p.clinicMaterialAdjustment?.deleteMany()
    await p.clinicMaterialExpiry?.deleteMany()
    await p.clinicMaterialLoss?.deleteMany()
    await p.clinicSessionMaterial?.deleteMany()
    await p.clinicMaterialBatch?.deleteMany()
    await p.clinicMaterial?.deleteMany()
    await p.clinicMaterialCategory?.deleteMany()
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
