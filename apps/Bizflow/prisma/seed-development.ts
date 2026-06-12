/**
 * Development Seed - Large Dataset Simulation
 * Creates realistic data spanning 4 years for ALL modules:
 * - Core: products, sales, customers, employees, finance, suppliers
 * - Clinic plugin: patients, sessions, prescriptions, check results
 * - Restaurant plugin: menu, tables, reservations, dine-in orders
 * - Warehouse plugin: locations, stock, transfers
 * - Bakery plugin: pantry, recipes, batches, schedules, waste
 */

import { PrismaClient } from '../src/generated/prisma'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Date helpers
const NOW = new Date()
const FOUR_YEARS_AGO = new Date(NOW.getTime() - 4 * 365 * 24 * 60 * 60 * 1000)
const THREE_YEARS_AGO = new Date(NOW.getTime() - 3 * 365 * 24 * 60 * 60 * 1000)

// Configuration - Optimized for speed
const CONFIG = {
  TOTAL_PRODUCTS: 50000,
  TOTAL_SALES: 250000, // Increased from 100k to 250k for better analytics
  CUSTOMER_COUNT: 2000, // Increased from 1k to 2k
  // Use larger batches with transactions for much better performance
  PRODUCT_BATCH_SIZE: 100, // Products per transaction (smaller to avoid timeout with EAV attribute creation)
  VARIANT_BATCH_SIZE: 1000, // Variants per transaction
  SALE_BATCH_SIZE: 500 // Sales per transaction
}

// Product categories with realistic distribution
const CATEGORIES = [
  { name: 'Electronics', weight: 0.15 },
  { name: 'Clothing', weight: 0.25 },
  { name: 'Home & Kitchen', weight: 0.20 },
  { name: 'Sports & Fitness', weight: 0.10 },
  { name: 'Books & Media', weight: 0.08 },
  { name: 'Food & Beverages', weight: 0.12 },
  { name: 'Beauty & Health', weight: 0.10 }
]

const PRODUCT_NAMES = {
  Electronics: ['Headphones', 'Mouse', 'Keyboard', 'Monitor', 'Cable', 'Charger', 'Speaker', 'Webcam'],
  Clothing: ['T-Shirt', 'Jeans', 'Jacket', 'Dress', 'Shoes', 'Sneakers', 'Boots', 'Socks', 'Hat'],
  'Home & Kitchen': ['Blender', 'Toaster', 'Kettle', 'Pan', 'Plate Set', 'Mug', 'Lamp', 'Cushion'],
  'Sports & Fitness': ['Yoga Mat', 'Dumbbells', 'Running Shoes', 'Water Bottle', 'Resistance Band'],
  'Books & Media': ['Novel', 'Magazine', 'DVD', 'Comic Book', 'Art Book'],
  'Food & Beverages': ['Coffee', 'Tea', 'Snacks', 'Juice', 'Energy Drink', 'Protein Bar'],
  'Beauty & Health': ['Shampoo', 'Lotion', 'Face Cream', 'Vitamins', 'Soap', 'Perfume']
}

const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Gray', 'Navy', 'Brown', 'Pink', 'Purple']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']

// Random helpers
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPrice(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function weightedRandom(items: any[], weights: number[]): any {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) return items[i]
  }
  return items[items.length - 1]
}

function generateSKU(category: string, index: number): string {
  const prefix = category.substring(0, 3).toUpperCase()
  return `${prefix}-${String(index).padStart(6, '0')}`
}

async function main() {
  console.log('🌱 Starting comprehensive development seed...')
  console.log(`📊 Target: ${CONFIG.TOTAL_PRODUCTS.toLocaleString()} products, ${CONFIG.TOTAL_SALES.toLocaleString()} sales\n`)

  const startTime = Date.now()

  // Configure SQLite for better performance with large inserts
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
  await prisma.$queryRawUnsafe('PRAGMA cache_size = 10000;')
  await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')
  console.log('✅ Configured SQLite for bulk operations\n')

  // ==================== CLEAR EXISTING DATA ====================
  console.log('🗑️ Clearing existing data...')

  // Plugin: Clinic
  await prisma.clinicCheckResult.deleteMany()
  await prisma.clinicPrescription.deleteMany()
  await prisma.clinicSession.deleteMany()
  await prisma.clinicPatient.deleteMany()

  // Plugin: Restaurant
  await prisma.dineInOrderItem.deleteMany()
  await prisma.dineInOrder.deleteMany()
  await prisma.tableReservation.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.restaurantTable.deleteMany()

  // Plugin: Warehouse
  await prisma.stockTransferItem.deleteMany()
  await prisma.stockTransfer.deleteMany()
  await prisma.warehouseStock.deleteMany()
  await prisma.warehouseLocation.deleteMany()

  // Plugin: Bakery
  await prisma.productionSchedule.deleteMany()
  await prisma.wasteLog.deleteMany()
  await prisma.productionBatch.deleteMany()
  await prisma.recipeIngredient.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.pantryIngredient.deleteMany()

  // Core
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.supplierProduct.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.variantAttributeValue.deleteMany()
  await prisma.productAttribute.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.saleTransaction.deleteMany()
  await prisma.installment.deleteMany()
  await prisma.deposit.deleteMany()
  await prisma.installmentPlan.deleteMany()
  await prisma.receiptTemplate.deleteMany()
  await prisma.financialTransaction.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.employeeOvertime.deleteMany()
  await prisma.employeeShift.deleteMany()
  await prisma.employeePayroll.deleteMany()
  await prisma.employeeActivityLog.deleteMany()
  await prisma.employeeDocument.deleteMany()
  await prisma.employeeAttendance.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.emailReport.deleteMany()
  await prisma.store.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Cleared existing data\n')

  // ==================== CATEGORIES ====================
  console.log('📂 Creating categories...')
  const categories = await Promise.all(
    CATEGORIES.map(cat => 
      prisma.category.create({ 
        data: { 
          name: cat.name,
          description: `${cat.name} products and accessories`
        } 
      })
    )
  )
  console.log(`✅ Created ${categories.length} categories\n`)

  // ==================== USERS ====================
  console.log('👥 Creating users...')
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'setup',
        passwordHash: await bcrypt.hash('setup123', 10),
        role: 'admin',
        fullName: 'Setup Administrator',
        email: 'setup@bizflow.com',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
        fullName: 'Admin User',
        email: 'admin@bizflow.com',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        username: 'manager',
        passwordHash: await bcrypt.hash('manager123', 10),
        role: 'manager',
        fullName: 'Store Manager',
        email: 'manager@bizflow.com',
        isActive: true,
      },
    })
  ])
  console.log(`✅ Created ${users.length} users\n`)

  // ==================== STORES ====================
  console.log('🏪 Creating stores...')
  const stores = await Promise.all([
    prisma.store.create({ 
      data: { 
        name: 'Main Store', 
        location: 'Downtown',
        phone: '+1-555-1000',
        hours: '9AM-9PM',
        manager: 'John Manager'
      } 
    }),
    prisma.store.create({ 
      data: { 
        name: 'West Branch', 
        location: 'West District',
        phone: '+1-555-2000',
        hours: '10AM-8PM',
        manager: 'Tom Assistant'
      } 
    }),
    prisma.store.create({ 
      data: { 
        name: 'East Branch', 
        location: 'East District',
        phone: '+1-555-3000',
        hours: '10AM-8PM',
        manager: 'Lisa Sales'
      } 
    })
  ])
  console.log(`✅ Created ${stores.length} stores\n`)

  // ==================== EMPLOYEES ====================
  console.log('👷 Creating employees with full HR data...')
  const employeeData = [
    { name: 'John Manager',   role: 'Store Manager',      department: 'Management', email: 'john.manager@bizflow.com',   phone: '+1-555-1001', salary: 5000, salaryType: 'monthly', employmentType: 'full-time', hireDate: new Date('2022-01-15') },
    { name: 'Sarah Cashier',  role: 'Cashier',            department: 'Sales',      email: 'sarah.cashier@bizflow.com',  phone: '+1-555-1002', salary: 2500, salaryType: 'monthly', employmentType: 'full-time', hireDate: new Date('2022-03-01') },
    { name: 'Mike Stock',     role: 'Stock Clerk',        department: 'Warehouse',  email: 'mike.stock@bizflow.com',     phone: '+1-555-1003', salary: 2200, salaryType: 'monthly', employmentType: 'full-time', hireDate: new Date('2022-06-10') },
    { name: 'Lisa Sales',     role: 'Sales Associate',    department: 'Sales',      email: 'lisa.sales@bizflow.com',     phone: '+1-555-2001', salary: 2800, salaryType: 'monthly', employmentType: 'full-time', hireDate: new Date('2023-01-20') },
    { name: 'Tom Assistant',  role: 'Assistant Manager',  department: 'Management', email: 'tom.assistant@bizflow.com',  phone: '+1-555-2002', salary: 4000, salaryType: 'monthly', employmentType: 'full-time', hireDate: new Date('2022-09-05') },
    { name: 'Emma Inventory', role: 'Inventory Analyst',  department: 'Warehouse',  email: 'emma.inventory@bizflow.com', phone: '+1-555-3001', salary: 3000, salaryType: 'monthly', employmentType: 'part-time', hireDate: new Date('2023-05-01') },
    { name: 'Carlos Finance', role: 'Finance Officer',    department: 'Finance',    email: 'carlos.finance@bizflow.com', phone: '+1-555-4001', salary: 4500, salaryType: 'monthly', employmentType: 'full-time', hireDate: new Date('2022-02-14') },
  ]
  const employees = await Promise.all(
    employeeData.map(e => prisma.employee.create({ data: e }))
  )

  // Attendance: last 90 days for each employee
  const today = new Date(); today.setHours(0,0,0,0)
  const attendanceStatuses = ['present','present','present','present','late','absent','half-day']
  for (const emp of employees) {
    const records: any[] = []
    for (let d = 89; d >= 0; d--) {
      const date = new Date(today); date.setDate(date.getDate() - d)
      const dow = date.getDay()
      if (dow === 0 || dow === 6) continue // skip weekends
      const status = attendanceStatuses[randomInt(0, attendanceStatuses.length - 1)]
      const checkIn  = status !== 'absent' ? new Date(date.getTime() + (8 + (status === 'late' ? randomInt(1,2) : 0)) * 3600 * 1000) : null
      const checkOut = checkIn ? new Date(date.getTime() + (17 + randomInt(0,2)) * 3600 * 1000) : null
      records.push({ employeeId: emp.id, date, status, checkIn, checkOut })
    }
    await prisma.employeeAttendance.createMany({ data: records })
  }

  // Payroll: last 6 months
  for (const emp of employees) {
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m)
      const bonuses    = Math.random() > 0.7 ? randomPrice(100, 500) : 0
      const deductions = Math.random() > 0.8 ? randomPrice(50, 200) : 0
      const netPay = emp.salary + bonuses - deductions
      const isPaid = m > 0
      await prisma.employeePayroll.create({ data: {
        employeeId: emp.id,
        month: d.getMonth() + 1, year: d.getFullYear(),
        baseSalary: emp.salary, bonuses, deductions, netPay,
        status: isPaid ? 'paid' : 'pending',
        paidDate: isPaid ? new Date(d.getFullYear(), d.getMonth(), 28) : null
      }}).catch(() => {}) // skip duplicate if re-run
    }
  }

  // Shifts: last 30 days
  const shiftTypes = [
    { type: 'morning', start: '08:00', end: '16:00' },
    { type: 'evening', start: '14:00', end: '22:00' },
    { type: 'night',   start: '22:00', end: '06:00' },
  ]
  for (const emp of employees) {
    for (let d = 29; d >= 0; d--) {
      const date = new Date(today); date.setDate(date.getDate() - d)
      if (date.getDay() === 0 || date.getDay() === 6) continue
      const shift = shiftTypes[randomInt(0, shiftTypes.length - 1)]
      await prisma.employeeShift.create({ data: {
        employeeId: emp.id, date,
        shiftType: shift.type, startTime: shift.start, endTime: shift.end,
        breakMins: 30
      }})
    }
  }

  // Overtime: random 10 records per employee
  for (const emp of employees) {
    for (let i = 0; i < 5; i++) {
      const date = randomDate(new Date(Date.now() - 90 * 24 * 3600 * 1000), new Date())
      await prisma.employeeOvertime.create({ data: {
        employeeId: emp.id, date,
        hours: randomInt(1, 4),
        reason: ['High sales volume','Stock count','System migration','Special event'][randomInt(0,3)],
        approved: Math.random() > 0.3,
        approvedBy: users[0].id,
        multiplier: 1.5
      }})
    }
  }

  // Activity logs
  for (const emp of employees) {
    await prisma.employeeActivityLog.createMany({ data: [
      { employeeId: emp.id, action: 'hired',          details: 'Employee created in system',    performedBy: users[0].id, createdAt: emp.hireDate },
      { employeeId: emp.id, action: 'salary_updated', details: `Salary set to ${emp.salary}`,  performedBy: users[0].id, createdAt: new Date() },
    ]})
  }

  console.log(`✅ Created ${employees.length} employees with attendance, payroll, shifts & overtime\n`)

  // ==================== CUSTOMERS ====================
  console.log('👥 Creating customers...')
  const customers: any[] = []
  
  console.log(`   Generating ${CONFIG.CUSTOMER_COUNT.toLocaleString()} customers in batches...`)
  for (let i = 0; i < CONFIG.CUSTOMER_COUNT; i += 200) { // Larger batches with transactions
    const batchSize = Math.min(200, CONFIG.CUSTOMER_COUNT - i)
    const customerData = Array.from({ length: batchSize }, (_, idx) => {
      const num = i + idx + 1
      return {
        name: `Customer ${num}`,
        email: `customer${num}@email.com`,
        phone: `+1-555-${String(num).padStart(4, '0')}`,
        loyaltyTier: Math.random() > 0.7 ? 'Gold' : Math.random() > 0.4 ? 'Silver' : 'Bronze',
        totalSpent: randomPrice(0, 5000)
      }
    })
    
    // Use createMany for better SQLite performance
    await prisma.customer.createMany({
      data: customerData
    })
    
    if ((i + batchSize) % 1000 === 0) {
      console.log(`   Created ${(i + batchSize).toLocaleString()} customers...`)
    }
  }
  
  // Fetch customers for later use
  const fetchedCustomers = await prisma.customer.findMany()
  customers.push(...fetchedCustomers)
  console.log(`✅ Created ${customers.length.toLocaleString()} customers\n`)

  // ==================== PRODUCTS (50,000 over 3 years) ====================
  console.log(`📦 Creating ${CONFIG.TOTAL_PRODUCTS.toLocaleString()} products over 3 years...`)
  const products: any[] = []
  let productIndex = 0
  let totalInitialStockMovements = 0

  const totalBatches = Math.ceil(CONFIG.TOTAL_PRODUCTS / CONFIG.PRODUCT_BATCH_SIZE)
  
  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const batchStart = batchNum * CONFIG.PRODUCT_BATCH_SIZE
    const batchSize = Math.min(CONFIG.PRODUCT_BATCH_SIZE, CONFIG.TOTAL_PRODUCTS - batchStart)
    
    // Use transaction for batch — longer timeout needed due to EAV attribute creation per product
    const result = await prisma.$transaction(async (tx) => {
      const createdProducts = []
      let stockMovementsCount = 0
      
      for (let idx = 0; idx < batchSize; idx++) {
        productIndex = batchStart + idx
        
        // Distribute products over 3 years with growth pattern
        const creationProgress = productIndex / CONFIG.TOTAL_PRODUCTS
        const createdAt = randomDate(THREE_YEARS_AGO, NOW)
        
        // Select category using weights
        const category = weightedRandom(categories, CATEGORIES.map(c => c.weight))
        const categoryName = category.name as keyof typeof PRODUCT_NAMES
        const productNames = PRODUCT_NAMES[categoryName]
        const productName = productNames[randomInt(0, productNames.length - 1)]
        
        const hasVariants = Math.random() > 0.3
        const basePrice = randomPrice(5, 500)
        const baseCost = basePrice * (0.5 + Math.random() * 0.2) // 50-70% of price
        
        // Generate variant data with barcodes
        // Track color/size separately — ProductVariant uses EAV via VariantAttributeValue
        const variantAttrMeta: Array<{color: string, size: string}> = []
        const variantData = hasVariants ? 
          Array.from({ length: randomInt(2, 5) }, (_, vIdx) => {
            const sku = `${generateSKU(categoryName, productIndex + 1)}-V${vIdx + 1}`
            const variantPrice = basePrice + randomPrice(-10, 20)
            const variantCost = variantPrice * (0.5 + Math.random() * 0.2) // 50-70% of variant price
            variantAttrMeta.push({
              color: COLORS[randomInt(0, COLORS.length - 1)],
              size: SIZES[randomInt(0, SIZES.length - 1)]
            })
            return {
              sku,
              barcode: `BAR${sku.replace(/-/g, '')}`,
              price: variantPrice,
              cost: variantCost,
              stock: randomInt(50, 200),
              reorderPoint: randomInt(10, 30)
            }
          }) :
          [{
            sku: generateSKU(categoryName, productIndex + 1),
            barcode: `BAR${generateSKU(categoryName, productIndex + 1).replace(/-/g, '')}`,
            price: basePrice,
            cost: baseCost,
            stock: randomInt(100, 500),
            reorderPoint: randomInt(20, 50)
          }]
        if (!hasVariants) variantAttrMeta.push({ color: 'Default', size: 'One Size' })
        
        const product = await tx.product.create({
          data: {
            name: `${productName} ${categoryName.substring(0, 4)} ${productIndex + 1}`,
            baseSKU: generateSKU(categoryName, productIndex + 1),
            categoryId: category.id,
            description: `Quality ${productName.toLowerCase()} from ${categoryName}`,
            basePrice,
            baseCost,
            hasVariants,
            storeId: stores[randomInt(0, stores.length - 1)].id,
            createdAt,
            images: {
              create: [{
                filename: 'placeholder.png',
                order: 0
              }]
            },
            variants: {
              create: variantData
            }
          },
          include: {
            variants: true
          }
        })
        
        // Create EAV attribute entries for Color and Size
        const colorAttr = await tx.productAttribute.create({
          data: { productId: product.id, name: 'Color', position: 0 }
        })
        const sizeAttr = await tx.productAttribute.create({
          data: { productId: product.id, name: 'Size', position: 1 }
        })
        for (let vi = 0; vi < product.variants.length; vi++) {
          const v = product.variants[vi]
          const meta = variantAttrMeta[vi]
          await tx.variantAttributeValue.createMany({
            data: [
              { variantId: v.id, attributeId: colorAttr.id, value: meta.color },
              { variantId: v.id, attributeId: sizeAttr.id, value: meta.size }
            ]
          })
        }
        
        // Create initial RESTOCK stock movements for each variant
        for (const variant of product.variants) {
          if (variant.stock > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: variant.id,
                type: 'RESTOCK',
                quantity: variant.stock,
                previousStock: 0,
                newStock: variant.stock,
                reason: 'Initial inventory',
                userId: users[0].id,
                createdAt
              }
            })
            stockMovementsCount++
          }
        }
        
        createdProducts.push(product)
      }
      
      return { products: createdProducts, stockMovements: stockMovementsCount }
    }, { timeout: 120000 })
    
    products.push(...result.products)
    totalInitialStockMovements += result.stockMovements
    
    // Report progress every 1000 products
    if ((batchStart + batchSize) % 1000 === 0 || (batchStart + batchSize) === CONFIG.TOTAL_PRODUCTS) {
      const percent = ((batchStart + batchSize) / CONFIG.TOTAL_PRODUCTS * 100).toFixed(1)
      console.log(`   ${(batchStart + batchSize).toLocaleString()} / ${CONFIG.TOTAL_PRODUCTS.toLocaleString()} products (${percent}%)...`)
    }
  }
  
  console.log(`✅ Created ${products.length.toLocaleString()} products`)
  console.log(`✅ Created ${totalInitialStockMovements.toLocaleString()} initial stock movements\n`)

  // ==================== SALE TRANSACTIONS (1,000,000 over 4 years) ====================
  console.log(`💰 Creating ${CONFIG.TOTAL_SALES.toLocaleString()} sale transactions over 4 years...`)
  
  const totalSalesBatches = Math.ceil(CONFIG.TOTAL_SALES / CONFIG.SALE_BATCH_SIZE)
  let totalSalesCreated = 0
  const allSaleItems: any[] = []
  
  for (let batchNum = 0; batchNum < totalSalesBatches; batchNum++) {
    const batchStart = batchNum * CONFIG.SALE_BATCH_SIZE
    const batchSize = Math.min(CONFIG.SALE_BATCH_SIZE, CONFIG.TOTAL_SALES - batchStart)
    
    const createdTransactions = await prisma.$transaction(async (tx) => {
      const transactions = []
      
      for (let idx = 0; idx < batchSize; idx++) {
        // Distribute sales over 4 years with seasonal variations
        const saleDate = randomDate(FOUR_YEARS_AGO, NOW)
        const month = saleDate.getMonth()
        
        // Seasonal boost (holidays: Nov, Dec)
        const seasonalMultiplier = (month === 10 || month === 11) ? 1.5 : 1.0
        
        // Select random product and customer
        const product = products[randomInt(0, products.length - 1)]
        const customer = customers[randomInt(0, customers.length - 1)]
        
        // Get product variants (use cached product data)
        const productWithVariants = await tx.product.findUnique({
          where: { id: product.id },
          include: { variants: { take: 5 } }
        })
        
        if (!productWithVariants || productWithVariants.variants.length === 0) continue
        
        const variants = productWithVariants.variants
        
        // Random number of items in this transaction (1-3)
        const itemCount = Math.min(randomInt(1, 3), variants.length)
        const selectedVariants = variants.slice(0, itemCount)
        
        // Calculate items and totals
        const items = []
        let subtotal = 0
        
        for (const variant of selectedVariants) {
          const quantity = randomInt(1, 2)
          const price = variant.price
          const finalPrice = price // No discount for seed data
          const total = finalPrice * quantity
          
          items.push({
            productId: product.id,
            variantId: variant.id,
            quantity,
            price,
            finalPrice,
            total
          })
          
          subtotal += total
        }
        
        // Calculate tax (8% for example)
        const tax = Math.round(subtotal * 0.08 * 100) / 100
        const total = subtotal + tax
        
        // Random payment method
        const paymentMethods = ['cash', 'card']
        const paymentMethod = paymentMethods[randomInt(0, 1)]
        
        // Create the sale transaction with items
        const transaction = await tx.saleTransaction.create({
          data: {
            userId: users[randomInt(0, users.length - 1)].id,
            customerId: customer.id,
            paymentMethod,
            status: 'completed',
            subtotal,
            tax,
            total,
            createdAt: saleDate,
            items: {
              create: items
            }
          },
          include: {
            items: true
          }
        })
        
        transactions.push(transaction)
      }
      
      return transactions
    })
    
    totalSalesCreated += createdTransactions.length
    
    // Collect sale items for later stock movement creation
    for (const transaction of createdTransactions) {
      for (const item of transaction.items) {
        allSaleItems.push({
          transactionId: transaction.id,
          variantId: item.variantId,
          quantity: item.quantity,
          userId: transaction.userId,
          createdAt: transaction.createdAt
        })
      }
    }
    
    // Report progress every 10000 sales
    if ((batchStart + batchSize) % 10000 === 0 || (batchStart + batchSize) === CONFIG.TOTAL_SALES) {
      const percent = ((batchStart + batchSize) / CONFIG.TOTAL_SALES * 100).toFixed(1)
      console.log(`   ${(batchStart + batchSize).toLocaleString()} / ${CONFIG.TOTAL_SALES.toLocaleString()} transactions (${percent}%)...`)
    }
  }
  
  console.log(`✅ Created ${totalSalesCreated.toLocaleString()} sale transactions\n`)

  // ==================== STOCK MOVEMENTS FROM SALES ====================
  console.log(`📦 Creating stock movements for ${allSaleItems.length.toLocaleString()} sale items...`)
  
  let totalStockMovements = 0
  const stockMovementBatchSize = 500  // Smaller batches to avoid transaction timeout
  
  for (let i = 0; i < allSaleItems.length; i += stockMovementBatchSize) {
    const batch = allSaleItems.slice(i, i + stockMovementBatchSize)
    
    // Batch create stock movements
    const stockMovements = []
    const variantUpdates = []
    
    for (const item of batch) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId }
        })
        
        if (variant) {
          const previousStock = variant.stock
          const newStock = Math.max(0, previousStock - item.quantity)
          
          stockMovements.push({
            variantId: item.variantId,
            type: 'SALE',
            quantity: -item.quantity,
            previousStock,
            newStock,
            referenceId: item.transactionId,
            userId: item.userId,
            createdAt: item.createdAt
          })
          
          variantUpdates.push({
            id: item.variantId,
            stock: newStock
          })
          
          totalStockMovements++
        }
      }
    }
    
    // Create stock movements in bulk
    if (stockMovements.length > 0) {
      await prisma.stockMovement.createMany({
        data: stockMovements
      })
    }
    
    // Update variant stocks in bulk
    for (const update of variantUpdates) {
      await prisma.productVariant.update({
        where: { id: update.id },
        data: { stock: update.stock }
      })
    }
    
    if ((i + stockMovementBatchSize) % 10000 === 0 || (i + stockMovementBatchSize) >= allSaleItems.length) {
      const percent = (Math.min(i + stockMovementBatchSize, allSaleItems.length) / allSaleItems.length * 100).toFixed(1)
      console.log(`   ${Math.min(i + stockMovementBatchSize, allSaleItems.length).toLocaleString()} / ${allSaleItems.length.toLocaleString()} movements (${percent}%)...`)
    }
  }
  
  console.log(`✅ Created ${totalStockMovements.toLocaleString()} sale stock movements\n`)

  // ==================== UPDATE CUSTOMER TOTAL SPENT ====================
  console.log('💳 Updating customer totalSpent amounts...')
  
  const customerUpdates = await prisma.$transaction(async (tx) => {
    let updatedCount = 0
    
    for (const customer of customers) {
      const totalSpent = await tx.saleTransaction.aggregate({
        where: { customerId: customer.id },
        _sum: { total: true }
      })
      
      await tx.customer.update({
        where: { id: customer.id },
        data: { totalSpent: totalSpent._sum.total || 0 }
      })
      
      updatedCount++
    }
    
    return updatedCount
  })
  
  console.log(`✅ Updated ${customerUpdates} customer records\n`)

  // ==================== PARTIAL REFUNDS ====================
  console.log('🔄 Creating partial refunds for testing...')
  
  // Get some recent completed transactions
  const recentTransactions = await prisma.saleTransaction.findMany({
    where: { 
      status: 'completed',
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
    },
    include: { items: true },
    take: 50,
    orderBy: { createdAt: 'desc' }
  })
  
  let partialRefundCount = 0
  let fullRefundCount = 0
  
  // Create 10 partially refunded transactions
  for (let i = 0; i < Math.min(10, recentTransactions.length); i++) {
    const transaction = recentTransactions[i]
    
    if (transaction.items.length === 0) continue
    
    await prisma.$transaction(async (tx) => {
      // Pick random items to partially refund
      const itemsToRefund = transaction.items.slice(0, Math.ceil(transaction.items.length / 2))
      
      for (const item of itemsToRefund) {
        // Refund 30-70% of the quantity
        const refundPercentage = 0.3 + Math.random() * 0.4
        const quantityToRefund = Math.max(1, Math.floor(item.quantity * refundPercentage))
        
        // Update sale item
        await tx.saleItem.update({
          where: { id: item.id },
          data: {
            refundedQuantity: quantityToRefund,
            refundedAt: new Date()
          }
        })
        
        // Restore stock if variant exists
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
          })
          
          if (variant) {
            const previousStock = variant.stock
            const newStock = previousStock + quantityToRefund
            
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: newStock }
            })
            
            // Create stock movement
            await tx.stockMovement.create({
              data: {
                variantId: item.variantId,
                type: 'RETURN',
                quantity: quantityToRefund,
                previousStock,
                newStock,
                referenceId: transaction.id,
                userId: transaction.userId,
                reason: 'Partial Refund',
                notes: `Partial refund: ${quantityToRefund} of ${item.quantity} units`,
                createdAt: new Date()
              }
            })
          }
        }
      }
      
      // Update transaction status to partially_refunded
      await tx.saleTransaction.update({
        where: { id: transaction.id },
        data: { status: 'partially_refunded' }
      })
      
      partialRefundCount++
    })
  }
  
  // Create 5 fully refunded transactions
  for (let i = 10; i < Math.min(15, recentTransactions.length); i++) {
    const transaction = recentTransactions[i]
    
    if (transaction.items.length === 0) continue
    
    await prisma.$transaction(async (tx) => {
      // Refund all items completely
      for (const item of transaction.items) {
        await tx.saleItem.update({
          where: { id: item.id },
          data: {
            refundedQuantity: item.quantity,
            refundedAt: new Date()
          }
        })
        
        // Restore stock if variant exists
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
          })
          
          if (variant) {
            const previousStock = variant.stock
            const newStock = previousStock + item.quantity
            
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: newStock }
            })
            
            // Create stock movement
            await tx.stockMovement.create({
              data: {
                variantId: item.variantId,
                type: 'RETURN',
                quantity: item.quantity,
                previousStock,
                newStock,
                referenceId: transaction.id,
                userId: transaction.userId,
                reason: 'Full Refund',
                notes: `Full refund of ${item.quantity} units`,
                createdAt: new Date()
              }
            })
          }
        }
      }
      
      // Update transaction status to refunded
      await tx.saleTransaction.update({
        where: { id: transaction.id },
        data: { status: 'refunded' }
      })
      
      fullRefundCount++
    })
  }
  
  console.log(`✅ Created ${partialRefundCount} partially refunded and ${fullRefundCount} fully refunded transactions\n`)
  
  // Recalculate customer totalSpent after refunds
  console.log('💳 Recalculating customer totalSpent after refunds...')
  
  let refundedCustomerUpdates = 0
  
  // Update customers in batches to avoid transaction timeout
  const customerBatchSize = 50
  for (let i = 0; i < customers.length; i += customerBatchSize) {
    const batch = customers.slice(i, i + customerBatchSize)
    
    await prisma.$transaction(async (tx) => {
      for (const customer of batch) {
        const totalSpent = await tx.saleTransaction.aggregate({
          where: { 
            customerId: customer.id,
            status: 'completed' // Only count completed, not refunded
          },
          _sum: { total: true }
        })
        
        await tx.customer.update({
          where: { id: customer.id },
          data: { totalSpent: totalSpent._sum.total || 0 }
        })
        
        refundedCustomerUpdates++
      }
    })
  }
  
  console.log(`✅ Updated ${refundedCustomerUpdates} customer records\n`)

  // ==================== ADDITIONAL STOCK MOVEMENTS ====================
  console.log('📦 Creating additional stock movements (restocks, adjustments, returns)...')
  
  let additionalStockMovements = 0
  const variantIds = await prisma.productVariant.findMany({ select: { id: true } })
  const movementTypes = [
    { type: 'RESTOCK', weight: 0.4 },
    { type: 'ADJUSTMENT', weight: 0.2 },
    { type: 'RETURN', weight: 0.2 },
    { type: 'SHRINKAGE', weight: 0.2 }
  ]
  
  // Add ~10,000 additional stock movements over time
  const targetMovements = 10000
  const movementBatchSize = 500
  
  for (let i = 0; i < targetMovements; i += movementBatchSize) {
    const batchSize = Math.min(movementBatchSize, targetMovements - i)
    
    await prisma.$transaction(async (tx) => {
      for (let j = 0; j < batchSize; j++) {
        const variant = variantIds[randomInt(0, variantIds.length - 1)]
        const movementType = weightedRandom(
          movementTypes.map(m => m.type),
          movementTypes.map(m => m.weight)
        )
        
        const currentVariant = await tx.productVariant.findUnique({
          where: { id: variant.id }
        })
        
        if (!currentVariant) continue
        
        let quantity = 0
        let reason = ''
        
        switch (movementType) {
          case 'RESTOCK':
            quantity = randomInt(20, 100)
            reason = 'Supplier delivery'
            break
          case 'ADJUSTMENT':
            quantity = randomInt(-10, 10)
            reason = 'Inventory count correction'
            break
          case 'RETURN':
            quantity = randomInt(1, 5)
            reason = 'Customer return'
            break
          case 'SHRINKAGE':
            quantity = -randomInt(1, 5)
            reason = 'Damage/theft'
            break
        }
        
        const previousStock = currentVariant.stock
        const newStock = Math.max(0, previousStock + quantity)
        
        await tx.stockMovement.create({
          data: {
            variantId: variant.id,
            type: movementType,
            quantity,
            previousStock,
            newStock,
            reason,
            userId: users[randomInt(0, users.length - 1)].id,
            createdAt: randomDate(THREE_YEARS_AGO, NOW)
          }
        })
        
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock, lastRestocked: movementType === 'RESTOCK' ? new Date() : undefined }
        })
        
        additionalStockMovements++
      }
    })
  }
  
  console.log(`✅ Created ${additionalStockMovements.toLocaleString()} additional stock movements\n`)

  // ==================== FINANCIAL TRANSACTIONS ====================
  console.log('💸 Creating financial transactions over 4 years...')
  
  const expenseTypes = [
    { description: 'Monthly rent payment', min: 4000, max: 6000 },
    { description: 'Electricity and water bills', min: 800, max: 1500 },
    { description: 'Employee salaries payment', min: 12000, max: 18000 },
    { description: 'Office supplies', min: 200, max: 800 },
    { description: 'Marketing and advertising', min: 1000, max: 5000 },
    { description: 'Equipment maintenance', min: 500, max: 2000 },
    { description: 'Insurance premiums', min: 2000, max: 4000 },
    { description: 'Internet and phone services', min: 300, max: 600 }
  ]
  
  const incomeTypes = [
    { description: 'Product sales revenue', min: 10000, max: 50000 },
    { description: 'Service fees', min: 1000, max: 5000 },
    { description: 'Wholesale orders', min: 5000, max: 20000 },
    { description: 'Online sales revenue', min: 3000, max: 15000 }
  ]
  
  let financialTransactionCount = 0
  
  // Create monthly transactions over 4 years (48 months)
  const monthsToCreate = 48
  
  await prisma.$transaction(async (tx) => {
    for (let month = 0; month < monthsToCreate; month++) {
      const transactionDate = new Date(FOUR_YEARS_AGO)
      transactionDate.setMonth(transactionDate.getMonth() + month)
      
      // Create 3-5 expenses per month
      const expenseCount = randomInt(3, 5)
      for (let i = 0; i < expenseCount; i++) {
        const expense = expenseTypes[randomInt(0, expenseTypes.length - 1)]
        await tx.financialTransaction.create({
          data: {
            type: 'expense',
            amount: randomPrice(expense.min, expense.max),
            description: expense.description,
            userId: users[randomInt(0, users.length - 1)].id,
            createdAt: randomDate(transactionDate, new Date(transactionDate.getTime() + 28 * 24 * 60 * 60 * 1000))
          }
        })
        financialTransactionCount++
      }
      
      // Create 2-4 income entries per month
      const incomeCount = randomInt(2, 4)
      for (let i = 0; i < incomeCount; i++) {
        const income = incomeTypes[randomInt(0, incomeTypes.length - 1)]
        await tx.financialTransaction.create({
          data: {
            type: 'income',
            amount: randomPrice(income.min, income.max),
            description: income.description,
            userId: users[randomInt(0, users.length - 1)].id,
            createdAt: randomDate(transactionDate, new Date(transactionDate.getTime() + 28 * 24 * 60 * 60 * 1000))
          }
        })
        financialTransactionCount++
      }
    }
  })
  
  console.log(`✅ Created ${financialTransactionCount} financial transactions\n`)

  // ==================== SUPPLIERS ====================
  console.log('📦 Creating suppliers...')
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'ABC Electronics Supply',
        contactName: 'John Smith',
        email: 'john@abcelectronics.com',
        phone: '+1-555-7000',
        address: '123 Supplier St, City',
        paymentTerms: 'Net 30',
        isActive: true,
        notes: 'Primary electronics supplier'
      }
    }),
    prisma.supplier.create({
      data: {
        name: 'Global Clothing Distributors',
        contactName: 'Sarah Johnson',
        email: 'sarah@globalclothing.com',
        phone: '+1-555-8000',
        address: '456 Fashion Ave, City',
        paymentTerms: 'Net 45',
        isActive: true,
        notes: 'Quality clothing supplier'
      }
    }),
    prisma.supplier.create({
      data: {
        name: 'Home & Kitchen Wholesale',
        contactName: 'Mike Brown',
        email: 'mike@homekitchen.com',
        phone: '+1-555-9000',
        address: '789 Kitchen Blvd, City',
        paymentTerms: 'Net 60',
        isActive: true
      }
    })
  ])
  console.log(`✅ Created ${suppliers.length} suppliers\n`)

  // ==================== SUPPLIER PRODUCTS ====================
  console.log('🔗 Linking products to suppliers...')
  let supplierProductCount = 0
  
  // Link first 100 products to suppliers randomly
  const productsToLink = products.slice(0, 100)
  
  for (const product of productsToLink) {
    const supplier = suppliers[randomInt(0, suppliers.length - 1)]
    const baseCost = product.baseCost || product.basePrice * 0.6
    
    await prisma.supplierProduct.create({
      data: {
        supplierId: supplier.id,
        productId: product.id,
        sku: `SUP-${product.baseSKU}`,
        cost: baseCost,
        leadTime: randomInt(7, 30),
        minOrderQty: randomInt(10, 50),
        isPreferred: Math.random() > 0.7
      }
    })
    supplierProductCount++
  }
  
  console.log(`✅ Created ${supplierProductCount} supplier-product links\n`)

  // ==================== PURCHASE ORDERS ====================
  console.log('📝 Creating purchase orders...')
  let purchaseOrderCount = 0
  const poStatuses = ['draft', 'ordered', 'received', 'cancelled']
  
  // Create 20 purchase orders over the past year
  for (let i = 0; i < 20; i++) {
    const supplier = suppliers[randomInt(0, suppliers.length - 1)]
    const poDate = randomDate(
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      new Date()
    )
    
    // Get 2-5 random products from this supplier
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: { supplierId: supplier.id },
      take: randomInt(2, 5),
      include: { product: { include: { variants: true } } }
    })
    
    if (supplierProducts.length === 0) continue
    
    const status = weightedRandom(poStatuses, [0.1, 0.3, 0.5, 0.1])
    
    // Calculate items and total
    const items = supplierProducts.map(sp => {
      const quantity = randomInt(10, 100)
      const unitCost = sp.cost
      const totalCost = quantity * unitCost
      const variant = sp.product.variants[0] // Use first variant
      
      return {
        productId: sp.productId,
        variantId: variant?.id || null,
        quantity,
        unitCost,
        totalCost,
        receivedQty: status === 'received' ? quantity : 0
      }
    })
    
    const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0)
    const taxAmount = subtotal * 0.08
    const shippingCost = randomPrice(50, 200)
    const totalAmount = subtotal + taxAmount + shippingCost
    
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${String(i + 1).padStart(6, '0')}`,
        supplierId: supplier.id,
        status,
        orderDate: poDate,
        expectedDate: status !== 'cancelled' ? new Date(poDate.getTime() + randomInt(7, 21) * 24 * 60 * 60 * 1000) : null,
        receivedDate: status === 'received' ? new Date(poDate.getTime() + randomInt(7, 14) * 24 * 60 * 60 * 1000) : null,
        totalAmount,
        taxAmount,
        shippingCost,
        notes: `Purchase order for ${supplier.name}`,
        orderedBy: users[0].id,
        approvedBy: status !== 'draft' ? users[1].id : null,
        items: {
          create: items
        }
      }
    })
    
    purchaseOrderCount++
  }
  
  console.log(`✅ Created ${purchaseOrderCount} purchase orders\n`)

  // ==================== INSTALLMENT PLANS ====================
  console.log('💳 Creating installment plans...')
  const installmentPlans = await prisma.installmentPlan.createMany({
    data: [
      { name: '3-Month Plan',        downPaymentPercent: 30, numberOfPayments: 3,  intervalDays: 30, interestRate: 5,  description: '30% down, 3 monthly installments @ 5%',   isActive: true },
      { name: '6-Month Plan',        downPaymentPercent: 20, numberOfPayments: 6,  intervalDays: 30, interestRate: 8,  description: '20% down, 6 monthly installments @ 8%',   isActive: true },
      { name: '12-Month Plan',       downPaymentPercent: 10, numberOfPayments: 12, intervalDays: 30, interestRate: 12, description: '10% down, 12 monthly installments @ 12%', isActive: true },
      { name: 'Weekly 4-Week Plan',  downPaymentPercent: 25, numberOfPayments: 4,  intervalDays: 7,  interestRate: 2,  description: '25% down, 4 weekly installments @ 2%',    isActive: true },
      { name: 'No Interest 3-Month', downPaymentPercent: 50, numberOfPayments: 3,  intervalDays: 30, interestRate: 0,  description: '50% down, 3 monthly installments, 0%',    isActive: true },
    ]
  })
  console.log(`✅ Created ${installmentPlans.count} installment plans\n`)

  // ═══════════════════════ PLUGIN: CLINIC ═══════════════════════════════════
  console.log('🏥 Seeding Clinic plugin...')

  // Create a shared dummy PDF file for check results preview
  const dummyPdfDir  = path.resolve(__dirname, '../resources/dummy-data')
  const dummyPdfPath = path.join(dummyPdfDir, 'dummy-check-result.pdf')
  if (!fs.existsSync(dummyPdfDir)) fs.mkdirSync(dummyPdfDir, { recursive: true })
  if (!fs.existsSync(dummyPdfPath)) {
    // Minimal valid PDF bytes
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj ' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
      '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
      'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n' +
      'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
    )
    fs.writeFileSync(dummyPdfPath, minimalPdf)
  }

  const CLINIC_PATIENTS = [
    { name: 'Ahmed Al-Rashid',    phone: '+966-50-1001', gender: 'male',   dateOfBirth: new Date('1985-03-12'), bloodType: 'O+',  allergies: 'Penicillin',     nationalId: 'NID-001' },
    { name: 'Fatima Hassan',      phone: '+966-50-1002', gender: 'female', dateOfBirth: new Date('1992-07-24'), bloodType: 'A+',  allergies: null,             nationalId: 'NID-002' },
    { name: 'Mohammed Al-Sayed',  phone: '+966-50-1003', gender: 'male',   dateOfBirth: new Date('1978-11-05'), bloodType: 'B-',  allergies: 'Aspirin',        nationalId: 'NID-003' },
    { name: 'Sara Khalid',        phone: '+966-50-1004', gender: 'female', dateOfBirth: new Date('2000-01-30'), bloodType: 'AB+', allergies: null,             nationalId: 'NID-004' },
    { name: 'Omar Abdullah',      phone: '+966-50-1005', gender: 'male',   dateOfBirth: new Date('1965-09-18'), bloodType: 'A-',  allergies: 'Sulfa drugs',    nationalId: 'NID-005' },
    { name: 'Nour Al-Farsi',      phone: '+966-50-1006', gender: 'female', dateOfBirth: new Date('1990-04-15'), bloodType: 'O-',  allergies: null,             nationalId: 'NID-006' },
    { name: 'Khalid Ibrahim',     phone: '+966-50-1007', gender: 'male',   dateOfBirth: new Date('1988-12-22'), bloodType: 'B+',  allergies: null,             nationalId: 'NID-007' },
    { name: 'Rania Mahmoud',      phone: '+966-50-1008', gender: 'female', dateOfBirth: new Date('1975-06-08'), bloodType: 'O+',  allergies: 'Latex',          nationalId: 'NID-008' },
    { name: 'Tariq Al-Amri',      phone: '+966-50-1009', gender: 'male',   dateOfBirth: new Date('1995-02-14'), bloodType: 'A+',  allergies: null,             nationalId: 'NID-009' },
    { name: 'Hind Al-Otaibi',     phone: '+966-50-1010', gender: 'female', dateOfBirth: new Date('1982-08-27'), bloodType: 'AB-', allergies: 'NSAIDs',         nationalId: 'NID-010' },
    { name: 'Yusuf Nasser',       phone: '+966-50-1011', gender: 'male',   dateOfBirth: new Date('1960-11-03'), bloodType: 'B+',  allergies: 'Codeine',        nationalId: 'NID-011' },
    { name: 'Layla Al-Ghamdi',    phone: '+966-50-1012', gender: 'female', dateOfBirth: new Date('2003-05-19'), bloodType: 'O+',  allergies: null,             nationalId: 'NID-012' },
    { name: 'Hassan Al-Balawi',   phone: '+966-50-1013', gender: 'male',   dateOfBirth: new Date('1971-07-31'), bloodType: 'A+',  allergies: null,             nationalId: 'NID-013' },
    { name: 'Mona Saleh',         phone: '+966-50-1014', gender: 'female', dateOfBirth: new Date('1998-03-07'), bloodType: 'B-',  allergies: 'Ibuprofen',      nationalId: 'NID-014' },
    { name: 'Abdulaziz Al-Zahrani',phone:'+966-50-1015', gender: 'male',   dateOfBirth: new Date('1955-10-21'), bloodType: 'O+',  allergies: 'Morphine',       nationalId: 'NID-015' },
  ]

  const visitTypes   = ['first_visit','follow_up','routine','emergency']
  const doctors      = ['Dr. Ahmad Karimi','Dr. Sarah Mitchell','Dr. Khalid Nasser','Dr. Emily Chen']
  const diagnoses    = ['Hypertension','Type 2 Diabetes','Upper Respiratory Infection','Migraine','Gastritis','Lumbar Pain','Anxiety Disorder','Hyperlipidemia','Asthma','Dermatitis']
  const medicines    = ['Metformin 500mg','Amlodipine 5mg','Omeprazole 20mg','Paracetamol 500mg','Amoxicillin 500mg','Atorvastatin 20mg','Salbutamol inhaler','Cetirizine 10mg','Ibuprofen 400mg','Fluoxetine 20mg']
  const checkTitles  = ['Blood Test - CBC','Chest X-Ray','MRI Brain','ECG','Lipid Panel','HbA1c','Urine Analysis','Thyroid Function','Kidney Function','Abdominal Ultrasound']

  let clinicPatientCount = 0, clinicSessionCount = 0, clinicPrescriptionCount = 0, clinicCheckResultCount = 0

  for (const pd of CLINIC_PATIENTS) {
    const pat = await prisma.clinicPatient.create({ data: { ...pd, medicalNotes: Math.random() > 0.5 ? 'Chronic condition, requires regular monitoring' : null } })
    clinicPatientCount++

    // 3–6 sessions per patient
    const sessionCount = randomInt(3, 6)
    for (let s = 0; s < sessionCount; s++) {
      const visitDate   = randomDate(new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000), new Date())
      const diag        = diagnoses[randomInt(0, diagnoses.length - 1)]
      const charged     = randomPrice(50, 500)
      const payStatus   = ['paid','partial','unpaid','waived'][randomInt(0,3)]
      const paid        = payStatus === 'paid' ? charged : payStatus === 'partial' ? charged * 0.5 : 0

      const vitals = JSON.stringify({
        bp:     `${randomInt(110,140)}/${randomInt(70,90)}`,
        temp:   `${(36 + Math.random() * 2).toFixed(1)}°C`,
        pulse:  `${randomInt(60,100)} bpm`,
        weight: `${randomInt(55,100)} kg`,
        o2sat:  `${randomInt(95,100)}%`
      })

      const session = await prisma.clinicSession.create({ data: {
        patientId: pat.id,
        visitDate,
        visitType:     visitTypes[randomInt(0, visitTypes.length - 1)],
        doctorName:    doctors[randomInt(0, doctors.length - 1)],
        chiefComplaint: ['Headache and dizziness','Chest pain','Shortness of breath','Fever and cough','Back pain','Stomach ache','Fatigue','Skin rash','Joint pain','Follow-up checkup'][randomInt(0,9)],
        vitals,
        diagnosis:     diag,
        notes:         `Patient presents with ${diag.toLowerCase()}. Advised lifestyle changes.`,
        followUpDate:  Math.random() > 0.4 ? new Date(visitDate.getTime() + randomInt(14,60) * 24 * 3600 * 1000) : null,
        status:        ['completed','completed','completed','active','cancelled'][randomInt(0,4)],
        amountCharged: charged,
        amountPaid:    paid,
        paymentStatus: payStatus,
        paymentMethod: ['cash','card','insurance','other'][randomInt(0,3)],
      }})
      clinicSessionCount++

      // 0–3 prescriptions per session
      const rxCount = randomInt(0, 3)
      for (let r = 0; r < rxCount; r++) {
        await prisma.clinicPrescription.create({ data: {
          sessionId:   session.id,
          medicineName: medicines[randomInt(0, medicines.length - 1)],
          dosage:       ['250mg','500mg','10mg','20mg','40mg'][randomInt(0,4)],
          frequency:    ['Once daily','Twice daily','Three times daily','As needed'][randomInt(0,3)],
          duration:     ['5 days','7 days','14 days','30 days','Ongoing'][randomInt(0,4)],
          quantity:     randomInt(7, 60),
          instructions: ['Take with food','Take before sleep','Take on empty stomach','Avoid alcohol'][randomInt(0,3)]
        }})
        clinicPrescriptionCount++
      }
    }

    // 1–3 check results per patient
    const crCount = randomInt(1, 3)
    for (let c = 0; c < crCount; c++) {
      const title = checkTitles[randomInt(0, checkTitles.length - 1)]
      await prisma.clinicCheckResult.create({ data: {
        patientId:   pat.id,
        title,
        description: `${title} report — results within normal range.`,
        fileName:    'dummy-check-result.pdf',
        filePath:    dummyPdfPath,
        fileSize:    fs.statSync(dummyPdfPath).size,
        resultDate:  randomDate(new Date(Date.now() - 365 * 24 * 3600 * 1000), new Date()),
      }})
      clinicCheckResultCount++
    }
  }
  console.log(`✅ Clinic: ${clinicPatientCount} patients, ${clinicSessionCount} sessions, ${clinicPrescriptionCount} prescriptions, ${clinicCheckResultCount} check results\n`)

  // ═══════════════════════ PLUGIN: RESTAURANT ═══════════════════════════════
  console.log('🍽️ Seeding Restaurant plugin...')

  // Tables
  const tableSections = ['Indoor','Outdoor','Bar','VIP']
  const tables = await Promise.all(
    Array.from({ length: 14 }, (_, i) => prisma.restaurantTable.create({ data: {
      number:   i + 1,
      capacity: [2, 2, 4, 4, 4, 6, 6, 8][randomInt(0, 7)],
      section:  tableSections[randomInt(0, tableSections.length - 1)],
      status:   ['available','available','available','occupied','reserved'][randomInt(0, 4)],
      isActive: true,
    }}))
  )

  // Menu items
  const menuCategories: Record<string, Array<{ name: string; price: number; cost: number; prep: number }>> = {
    Starters:  [
      { name: 'Garlic Bread',       price: 5.5,  cost: 1.2, prep: 8  },
      { name: 'Bruschetta',         price: 7.0,  cost: 2.0, prep: 10 },
      { name: 'Soup of the Day',    price: 6.5,  cost: 1.8, prep: 10 },
      { name: 'Caesar Salad',       price: 9.0,  cost: 2.5, prep: 8  },
      { name: 'Spring Rolls',       price: 8.5,  cost: 2.2, prep: 12 },
    ],
    Mains: [
      { name: 'Grilled Chicken',    price: 18.0, cost: 7,   prep: 20 },
      { name: 'Beef Steak',         price: 28.0, cost: 12,  prep: 25 },
      { name: 'Pasta Carbonara',    price: 15.0, cost: 4.5, prep: 15 },
      { name: 'Margherita Pizza',   price: 14.0, cost: 4.0, prep: 18 },
      { name: 'Fish & Chips',       price: 16.5, cost: 5.5, prep: 20 },
      { name: 'Veggie Burger',      price: 13.0, cost: 3.5, prep: 12 },
      { name: 'Lamb Chops',         price: 26.0, cost: 11,  prep: 30 },
    ],
    Desserts: [
      { name: 'Chocolate Lava Cake',price: 8.5,  cost: 2.0, prep: 10 },
      { name: 'Tiramisu',           price: 7.5,  cost: 1.8, prep: 5  },
      { name: 'Cheesecake',         price: 7.0,  cost: 1.5, prep: 5  },
      { name: 'Ice Cream Sundae',   price: 6.0,  cost: 1.2, prep: 5  },
    ],
    Drinks: [
      { name: 'Fresh Orange Juice', price: 4.5,  cost: 1.0, prep: 5  },
      { name: 'Lemonade',           price: 3.5,  cost: 0.8, prep: 5  },
      { name: 'Soft Drink',         price: 2.5,  cost: 0.5, prep: 2  },
      { name: 'Mineral Water',      price: 2.0,  cost: 0.3, prep: 1  },
      { name: 'Arabic Coffee',      price: 3.0,  cost: 0.7, prep: 5  },
      { name: 'Cappuccino',         price: 4.0,  cost: 1.0, prep: 5  },
    ],
  }

  const allMenuItems: any[] = []
  let menuDisplayOrder = 0
  for (const [cat, items] of Object.entries(menuCategories)) {
    for (const item of items) {
      const mi = await prisma.menuItem.create({ data: {
        name: item.name, category: cat,
        price: item.price, cost: item.cost,
        preparationTime: item.prep,
        displayOrder: menuDisplayOrder++,
        isAvailable: Math.random() > 0.1,
        description: `Fresh ${item.name.toLowerCase()} prepared to order`
      }})
      allMenuItems.push(mi)
    }
  }

  // Reservations: past 30 days + next 14 days
  const guestNames  = ['Al-Rashid Family','Smith Party','Johnson Group','Al-Sayed','Williams','Al-Faris','Brown Family','Al-Otaibi']
  const resvStatuses = ['confirmed','confirmed','confirmed','seated','completed','completed','cancelled','pending']
  let reservationCount = 0
  for (let i = 0; i < 40; i++) {
    const isUpcoming = Math.random() > 0.6
    const resDate = isUpcoming
      ? randomDate(new Date(), new Date(Date.now() + 14 * 24 * 3600 * 1000))
      : randomDate(new Date(Date.now() - 30 * 24 * 3600 * 1000), new Date())
    await prisma.tableReservation.create({ data: {
      tableId:       tables[randomInt(0, tables.length - 1)].id,
      customerName:  guestNames[randomInt(0, guestNames.length - 1)],
      customerPhone: `+1-555-${String(9000 + i).padStart(4,'0')}`,
      partySize:     randomInt(1, 8),
      date:          resDate,
      status:        resvStatuses[randomInt(0, resvStatuses.length - 1)],
      notes:         Math.random() > 0.7 ? 'Window seat preferred' : null,
    }})
    reservationCount++
  }

  // Dine-in orders: last 60 days
  const servers   = ['Ali','Sara','Omar','Nour','Khalid']
  const orderStatuses = ['paid','paid','paid','paid','open','ready','voided']
  let orderCount = 0, orderItemCount = 0
  for (let i = 0; i < 80; i++) {
    const orderDate  = randomDate(new Date(Date.now() - 60 * 24 * 3600 * 1000), new Date())
    const status     = orderStatuses[randomInt(0, orderStatuses.length - 1)]
    const table      = tables[randomInt(0, tables.length - 1)]
    // Pick 2–5 menu items
    const picked: any[] = []
    const itemCount  = randomInt(2, 5)
    for (let j = 0; j < itemCount; j++) picked.push(allMenuItems[randomInt(0, allMenuItems.length - 1)])
    const subtotal   = picked.reduce((s, m) => s + m.price * (Math.random() > 0.6 ? 2 : 1), 0)
    const tax        = Math.round(subtotal * 0.08 * 100) / 100
    const total      = subtotal + tax
    const itemStatuses = ['pending','preparing','ready','served']

    const order = await prisma.dineInOrder.create({ data: {
      tableId:    table.id,
      status,
      serverName: servers[randomInt(0, servers.length - 1)],
      subtotal, tax, total,
      openedAt:  orderDate,
      closedAt:  status === 'paid' ? new Date(orderDate.getTime() + randomInt(30,120) * 60 * 1000) : null,
      items: {
        create: picked.map(mi => ({
          menuItemId: mi.id,
          itemName:   mi.name,
          quantity:   Math.random() > 0.6 ? 2 : 1,
          unitPrice:  mi.price,
          status:     status === 'paid' ? 'served' : itemStatuses[randomInt(0, itemStatuses.length - 1)],
        }))
      }
    }})
    orderCount++
    orderItemCount += picked.length
  }

  console.log(`✅ Restaurant: ${tables.length} tables, ${allMenuItems.length} menu items, ${reservationCount} reservations, ${orderCount} orders (${orderItemCount} items)\n`)

  // ═══════════════════════ PLUGIN: WAREHOUSE ════════════════════════════════
  console.log('🏭 Seeding Warehouse plugin...')

  // Hierarchical locations: zones → aisles → shelves
  const zoneNames = ['Zone A – Electronics','Zone B – Clothing','Zone C – Kitchen','Zone D – Sports']
  const rootLocations: any[] = []
  for (let z = 0; z < zoneNames.length; z++) {
    const zone = await prisma.warehouseLocation.create({ data: {
      name: zoneNames[z], code: `Z${String.fromCharCode(65+z)}`,
      type: 'zone', isActive: true,
      notes: `Main ${zoneNames[z].split('–')[1].trim()} storage zone`
    }})
    rootLocations.push(zone)

    for (let a = 1; a <= 3; a++) {
      const aisle = await prisma.warehouseLocation.create({ data: {
        name: `Aisle ${z+1}-${a}`, code: `Z${String.fromCharCode(65+z)}-A${a}`,
        type: 'aisle', parentId: zone.id, isActive: true
      }})

      for (let s = 1; s <= 4; s++) {
        const shelf = await prisma.warehouseLocation.create({ data: {
          name: `Shelf ${z+1}-${a}-${s}`, code: `Z${String.fromCharCode(65+z)}-A${a}-S${s}`,
          type: 'shelf', parentId: aisle.id, isActive: true
        }})

        // Add stock to each shelf
        const stockItems = [
          `SKU-${String.fromCharCode(65+z)}${a}${s}-001`,
          `SKU-${String.fromCharCode(65+z)}${a}${s}-002`,
        ]
        for (const sku of stockItems) {
          await prisma.warehouseStock.create({ data: {
            locationId:  shelf.id,
            productName: `${zoneNames[z].split('–')[1].trim().trim()} Item ${sku.slice(-3)}`,
            sku, quantity: randomInt(10, 500), unit: 'pcs',
            minQuantity: randomInt(5, 20),
          }}).catch(() => {}) // skip unique conflicts
        }
      }
    }
  }

  // Stock transfers between zones
  const allLocations = await prisma.warehouseLocation.findMany({ where: { type: 'shelf' } })
  const transferStatuses = ['completed','completed','completed','in_transit','draft','cancelled']
  let transferCount = 0, transferItemCount = 0
  for (let i = 0; i < 25; i++) {
    const from   = allLocations[randomInt(0, allLocations.length - 1)]
    let   to     = allLocations[randomInt(0, allLocations.length - 1)]
    while (to.id === from.id) to = allLocations[randomInt(0, allLocations.length - 1)]
    const status = transferStatuses[randomInt(0, transferStatuses.length - 1)]
    const tDate  = randomDate(new Date(Date.now() - 180 * 24 * 3600 * 1000), new Date())

    await prisma.stockTransfer.create({ data: {
      fromLocationId: from.id,
      toLocationId:   to.id,
      status, transferDate: tDate,
      completedAt:    status === 'completed' ? new Date(tDate.getTime() + randomInt(1,5) * 24 * 3600 * 1000) : null,
      notes: `Transfer from ${from.name} to ${to.name}`,
      items: {
        create: Array.from({ length: randomInt(1, 4) }, (_, j) => ({
          productName: `Transfer Item ${i + 1}-${j + 1}`,
          sku:         `TRF-${String(i+1).padStart(3,'0')}-${j+1}`,
          quantity:    randomInt(5, 50),
          unit:        'pcs',
        }))
      }
    }})
    transferCount++
    transferItemCount += randomInt(1, 4)
  }
  console.log(`✅ Warehouse: ${allLocations.length} shelf locations, ${transferCount} transfers\n`)

  // ═══════════════════════ PLUGIN: BAKERY ═══════════════════════════════════
  console.log('🥐 Seeding Bakery plugin...')

  // Pantry ingredients
  const pantryData = [
    { name: 'All-Purpose Flour',  currentStock: 200000, unit: 'g',   costPerUnit: 0.002, lowStockThreshold: 20000, supplierName: 'FoodSupply Co' },
    { name: 'Whole Wheat Flour',  currentStock: 80000,  unit: 'g',   costPerUnit: 0.003, lowStockThreshold: 10000, supplierName: 'FoodSupply Co' },
    { name: 'Granulated Sugar',   currentStock: 50000,  unit: 'g',   costPerUnit: 0.003, lowStockThreshold: 5000,  supplierName: 'FoodSupply Co' },
    { name: 'Brown Sugar',        currentStock: 25000,  unit: 'g',   costPerUnit: 0.004, lowStockThreshold: 3000,  supplierName: 'FoodSupply Co' },
    { name: 'Unsalted Butter',    currentStock: 15000,  unit: 'g',   costPerUnit: 0.015, lowStockThreshold: 2000,  supplierName: 'Dairy Direct'  },
    { name: 'Eggs',               currentStock: 300,    unit: 'pcs', costPerUnit: 0.3,   lowStockThreshold: 50,    supplierName: 'Dairy Direct'  },
    { name: 'Whole Milk',         currentStock: 20000,  unit: 'ml',  costPerUnit: 0.001, lowStockThreshold: 3000,  supplierName: 'Dairy Direct'  },
    { name: 'Baking Powder',      currentStock: 2000,   unit: 'g',   costPerUnit: 0.01,  lowStockThreshold: 200  },
    { name: 'Baking Soda',        currentStock: 1500,   unit: 'g',   costPerUnit: 0.008, lowStockThreshold: 200  },
    { name: 'Salt',               currentStock: 5000,   unit: 'g',   costPerUnit: 0.001, lowStockThreshold: 500  },
    { name: 'Vanilla Extract',    currentStock: 1000,   unit: 'ml',  costPerUnit: 0.05,  lowStockThreshold: 100  },
    { name: 'Dark Chocolate',     currentStock: 8000,   unit: 'g',   costPerUnit: 0.02,  lowStockThreshold: 1000, supplierName: 'Choco World'   },
    { name: 'Cocoa Powder',       currentStock: 5000,   unit: 'g',   costPerUnit: 0.015, lowStockThreshold: 500,  supplierName: 'Choco World'   },
    { name: 'Active Dry Yeast',   currentStock: 500,    unit: 'g',   costPerUnit: 0.04,  lowStockThreshold: 50   },
    { name: 'Olive Oil',          currentStock: 10000,  unit: 'ml',  costPerUnit: 0.008, lowStockThreshold: 1000 },
    { name: 'Heavy Cream',        currentStock: 8000,   unit: 'ml',  costPerUnit: 0.005, lowStockThreshold: 1000 },
    { name: 'Cream Cheese',       currentStock: 5000,   unit: 'g',   costPerUnit: 0.018, lowStockThreshold: 500  },
    { name: 'Almonds',            currentStock: 4000,   unit: 'g',   costPerUnit: 0.025, lowStockThreshold: 500  },
    { name: 'Rolled Oats',        currentStock: 10000,  unit: 'g',   costPerUnit: 0.004, lowStockThreshold: 1000 },
    { name: 'Honey',              currentStock: 3000,   unit: 'ml',  costPerUnit: 0.012, lowStockThreshold: 300  },
  ]
  const pantryIngredients = await Promise.all(pantryData.map(p => prisma.pantryIngredient.create({ data: p })))

  // Recipes
  const recipeTemplates = [
    {
      name: 'Classic White Bread',    yieldQty: 2, yieldUnit: 'loaves',  expiryDays: 4,
      description: 'Traditional white sandwich bread',
      ingredients: [
        { name: 'All-Purpose Flour', qty: 500, unit: 'g' }, { name: 'Whole Milk', qty: 300, unit: 'ml' },
        { name: 'Active Dry Yeast', qty: 7, unit: 'g' },    { name: 'Salt', qty: 10, unit: 'g' },
        { name: 'Granulated Sugar', qty: 15, unit: 'g' },   { name: 'Unsalted Butter', qty: 30, unit: 'g' },
      ]
    },
    {
      name: 'Chocolate Chip Cookies', yieldQty: 24, yieldUnit: 'pcs',   expiryDays: 7,
      description: 'Crispy-edge, chewy-center cookies',
      ingredients: [
        { name: 'All-Purpose Flour', qty: 280, unit: 'g' }, { name: 'Unsalted Butter', qty: 230, unit: 'g' },
        { name: 'Brown Sugar', qty: 200, unit: 'g' },        { name: 'Granulated Sugar', qty: 100, unit: 'g' },
        { name: 'Eggs', qty: 2, unit: 'pcs' },               { name: 'Vanilla Extract', qty: 5, unit: 'ml' },
        { name: 'Dark Chocolate', qty: 200, unit: 'g' },     { name: 'Baking Soda', qty: 5, unit: 'g' },
        { name: 'Salt', qty: 3, unit: 'g' },
      ]
    },
    {
      name: 'Croissants',             yieldQty: 12, yieldUnit: 'pcs',   expiryDays: 2,
      description: 'Buttery flaky French croissants',
      ingredients: [
        { name: 'All-Purpose Flour', qty: 500, unit: 'g' }, { name: 'Unsalted Butter', qty: 280, unit: 'g' },
        { name: 'Whole Milk', qty: 140, unit: 'ml' },        { name: 'Active Dry Yeast', qty: 7, unit: 'g' },
        { name: 'Granulated Sugar', qty: 50, unit: 'g' },    { name: 'Salt', qty: 10, unit: 'g' },
      ]
    },
    {
      name: 'Chocolate Lava Cake',    yieldQty: 6, yieldUnit: 'pcs',    expiryDays: 2,
      description: 'Warm individual cakes with molten center',
      ingredients: [
        { name: 'Dark Chocolate', qty: 170, unit: 'g' },    { name: 'Unsalted Butter', qty: 115, unit: 'g' },
        { name: 'Eggs', qty: 4, unit: 'pcs' },               { name: 'Granulated Sugar', qty: 100, unit: 'g' },
        { name: 'All-Purpose Flour', qty: 60, unit: 'g' },   { name: 'Cocoa Powder', qty: 15, unit: 'g' },
      ]
    },
    {
      name: 'Banana Nut Muffins',     yieldQty: 12, yieldUnit: 'pcs',   expiryDays: 5,
      description: 'Moist muffins with banana and almonds',
      ingredients: [
        { name: 'All-Purpose Flour', qty: 280, unit: 'g' }, { name: 'Rolled Oats', qty: 50, unit: 'g' },
        { name: 'Brown Sugar', qty: 150, unit: 'g' },         { name: 'Eggs', qty: 2, unit: 'pcs' },
        { name: 'Unsalted Butter', qty: 115, unit: 'g' },    { name: 'Whole Milk', qty: 120, unit: 'ml' },
        { name: 'Almonds', qty: 80, unit: 'g' },              { name: 'Baking Powder', qty: 8, unit: 'g' },
        { name: 'Salt', qty: 3, unit: 'g' },
      ]
    },
    {
      name: 'Classic Cheesecake',     yieldQty: 8, yieldUnit: 'slices', expiryDays: 5,
      description: 'New York style baked cheesecake',
      ingredients: [
        { name: 'Cream Cheese', qty: 680, unit: 'g' }, { name: 'Granulated Sugar', qty: 200, unit: 'g' },
        { name: 'Eggs', qty: 3, unit: 'pcs' },          { name: 'Heavy Cream', qty: 120, unit: 'ml' },
        { name: 'Vanilla Extract', qty: 10, unit: 'ml' },{ name: 'All-Purpose Flour', qty: 30, unit: 'g' },
      ]
    },
    {
      name: 'Sourdough Loaf',         yieldQty: 1, yieldUnit: 'loaf',   expiryDays: 5,
      description: 'Traditional tangy sourdough bread',
      ingredients: [
        { name: 'Whole Wheat Flour', qty: 250, unit: 'g' }, { name: 'All-Purpose Flour', qty: 250, unit: 'g' },
        { name: 'Salt', qty: 12, unit: 'g' },                { name: 'Active Dry Yeast', qty: 5, unit: 'g' },
      ]
    },
    {
      name: 'Honey Granola Bars',     yieldQty: 16, yieldUnit: 'pcs',   expiryDays: 14,
      description: 'Wholesome oat and honey bars',
      ingredients: [
        { name: 'Rolled Oats', qty: 300, unit: 'g' }, { name: 'Honey', qty: 120, unit: 'ml' },
        { name: 'Almonds', qty: 100, unit: 'g' },      { name: 'Brown Sugar', qty: 60, unit: 'g' },
        { name: 'Unsalted Butter', qty: 60, unit: 'g' },{ name: 'Salt', qty: 3, unit: 'g' },
      ]
    },
  ]

  const pantryMap = new Map(pantryIngredients.map(p => [p.name, p]))
  let recipeCount = 0, batchCount = 0, scheduleCount = 0, wasteCount = 0

  for (const rt of recipeTemplates) {
    const recipe = await prisma.recipe.create({ data: {
      name: rt.name, description: rt.description,
      yieldQty: rt.yieldQty, yieldUnit: rt.yieldUnit,
      expiryDays: rt.expiryDays, isActive: true,
      ingredients: {
        create: rt.ingredients.map(ing => {
          const pantry = pantryMap.get(ing.name)
          return {
            name: ing.name, quantity: ing.qty, unit: ing.unit,
            costPerUnit: pantry?.costPerUnit ?? 0.01,
            pantryIngredientId: pantry?.id ?? null,
          }
        })
      }
    }})
    recipeCount++

    // 3–8 production batches over the past year
    const numBatches = randomInt(3, 8)
    for (let b = 0; b < numBatches; b++) {
      const batchDate = randomDate(new Date(Date.now() - 365 * 24 * 3600 * 1000), new Date())
      const qty = randomInt(1, 5)
      const totalCost = rt.ingredients.reduce((s, ing) => {
        const pantry = pantryMap.get(ing.name)
        return s + ing.qty * qty * (pantry?.costPerUnit ?? 0.01)
      }, 0)
      await prisma.productionBatch.create({ data: {
        recipeId: recipe.id, batchDate,
        quantity: qty, unitsProduced: qty * recipe.yieldQty,
        totalCost: Math.round(totalCost * 100) / 100,
        expiresAt: rt.expiryDays ? new Date(batchDate.getTime() + rt.expiryDays * 24 * 3600 * 1000) : null,
        notes: `Batch #${b+1} — ${qty} runs`,
      }})
      batchCount++
    }

    // Production schedules: next 14 days
    for (let d = 0; d < 7; d++) {
      const schedDate = new Date(); schedDate.setDate(schedDate.getDate() + d * 2)
      await prisma.productionSchedule.create({ data: {
        recipeId: recipe.id, scheduledDate: schedDate,
        plannedQuantity: randomInt(1, 4),
        actualQuantity:  d < 3 ? randomInt(1, 4) : null,
        status: d < 3 ? 'completed' : (d === 3 ? 'in-progress' : 'planned'),
      }})
      scheduleCount++
    }

    // 1–2 waste logs per recipe
    const wasteTypes = ['ingredient','finished_product','other']
    for (let w = 0; w < randomInt(1, 2); w++) {
      const wType = wasteTypes[randomInt(0, wasteTypes.length - 1)]
      const pantry = pantryIngredients[randomInt(0, pantryIngredients.length - 1)]
      await prisma.wasteLog.create({ data: {
        wasteType:         wType,
        recipeId:          recipe.id,
        pantryIngredientId: wType === 'ingredient' ? pantry.id : null,
        itemName:          wType === 'ingredient' ? pantry.name : rt.name,
        quantity:          randomInt(1, 10),
        unit:              wType === 'ingredient' ? pantry.unit : rt.yieldUnit,
        cost:              randomPrice(1, 30),
        reason:            ['Expired','Dropped','Overbaked','Quality reject','Breakage'][randomInt(0,4)],
        wasteDate:         randomDate(new Date(Date.now() - 90 * 24 * 3600 * 1000), new Date()),
        notes:             'Recorded during end-of-day waste audit',
      }})
      wasteCount++
    }
  }
  console.log(`✅ Bakery: ${pantryIngredients.length} pantry items, ${recipeCount} recipes, ${batchCount} batches, ${scheduleCount} schedules, ${wasteCount} waste logs\n`)
  console.log('💰 Creating deposits and installments...')
  
  // Get some recent customers with significant spending
  const customersWithSales = await prisma.customer.findMany({
    where: {
      totalSpent: { gt: 1000 },
      saleTransactions: { some: {} }
    },
    include: {
      saleTransactions: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      }
    },
    take: 30
  })
  
  let depositCount = 0
  let installmentCount = 0
  
  // Get installment plans
  const allPlans = await prisma.installmentPlan.findMany()
  
  for (let i = 0; i < Math.min(15, customersWithSales.length); i++) {
    const customer = customersWithSales[i]
    const sale = customer.saleTransactions[0]
    const plan = allPlans[randomInt(0, allPlans.length - 1)]
    
    if (!sale || !plan) continue
    
    // Calculate payment schedule
    const downPayment = sale.total * (plan.downPaymentPercent / 100)
    const remaining = sale.total - downPayment
    const installmentAmount = remaining / plan.numberOfPayments
    
    // Create deposit
    await prisma.deposit.create({
      data: {
        amount: downPayment,
        date: sale.createdAt,
        method: sale.paymentMethod,
        status: 'paid',
        note: `Down payment (${plan.downPaymentPercent}%)`,
        customerId: customer.id,
        saleId: sale.id
      }
    })
    depositCount++
    
    // Create installments
    for (let j = 0; j < plan.numberOfPayments; j++) {
      const dueDate = new Date(sale.createdAt)
      dueDate.setDate(dueDate.getDate() + (plan.intervalDays * (j + 1)))
      
      // Randomly mark some as paid
      const isPaid = j < 2 && Math.random() > 0.3
      
      await prisma.installment.create({
        data: {
          amount: installmentAmount,
          dueDate,
          paidDate: isPaid ? new Date(dueDate.getTime() - randomInt(0, 5) * 24 * 60 * 60 * 1000) : null,
          status: isPaid ? 'paid' : (dueDate < new Date() ? 'overdue' : 'pending'),
          note: `Payment ${j + 1} of ${plan.numberOfPayments}`,
          customerId: customer.id,
          saleId: sale.id,
          planId: plan.id
        }
      })
      installmentCount++
    }
  }
  
  console.log(`✅ Created ${depositCount} deposits and ${installmentCount} installments\n`)

  // ==================== SUMMARY ====================
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log('🎉 Development seeding completed successfully!\n')
  console.log('📊 Summary:')
  console.log('  ── Core ──────────────────────────────────────────')
  console.log(`   • ${categories.length} categories`)
  console.log(`   • ${users.length} users`)
  console.log(`   • ${stores.length} stores`)
  console.log(`   • ${employees.length} employees (with attendance, payroll, shifts, overtime)`)
  console.log(`   • ${customers.length.toLocaleString()} customers`)
  console.log(`   • ${products.length.toLocaleString()} products (over 3 years)`)
  console.log(`   • ${totalInitialStockMovements.toLocaleString()} initial stock movements`)
  console.log(`   • ${totalSalesCreated.toLocaleString()} sale transactions (over 4 years)`)
  console.log(`   • ${totalStockMovements.toLocaleString()} sale-related stock movements`)
  console.log(`   • ${additionalStockMovements.toLocaleString()} additional stock movements`)
  console.log(`   • ${financialTransactionCount} financial transactions`)
  console.log(`   • ${suppliers.length} suppliers / ${supplierProductCount} supplier-product links`)
  console.log(`   • ${purchaseOrderCount} purchase orders`)
  console.log(`   • ${depositCount} deposits / ${installmentCount} installments`)
  console.log(`   • ${installmentPlans.count} installment plans`)
  console.log('  ── Clinic Plugin ─────────────────────────────────')
  console.log(`   • ${clinicPatientCount} patients`)
  console.log(`   • ${clinicSessionCount} sessions / ${clinicPrescriptionCount} prescriptions`)
  console.log(`   • ${clinicCheckResultCount} check results (PDF)`)
  console.log('  ── Restaurant Plugin ─────────────────────────────')
  console.log(`   • ${tables.length} tables / ${allMenuItems.length} menu items`)
  console.log(`   • ${reservationCount} reservations / ${orderCount} orders (${orderItemCount} items)`)
  console.log('  ── Warehouse Plugin ──────────────────────────────')
  console.log(`   • ${allLocations.length} shelf locations (4 zones → aisles → shelves)`)
  console.log(`   • ${transferCount} stock transfers`)
  console.log('  ── Bakery Plugin ─────────────────────────────────')
  console.log(`   • ${pantryIngredients.length} pantry ingredients`)
  console.log(`   • ${recipeCount} recipes / ${batchCount} production batches`)
  console.log(`   • ${scheduleCount} production schedules / ${wasteCount} waste logs`)
  console.log(`\n⏱️  Completed in ${duration}s`)
  console.log('\n🔐 Login Credentials:')
  console.log('   Setup: setup / setup123')
  console.log('   Admin: admin / admin123')
  console.log('   Manager: manager / manager123')
}

main()
  .catch((e) => {
    console.error('❌ Error during development seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
