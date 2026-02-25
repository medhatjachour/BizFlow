/**
 * Development Seed - Large Dataset Simulation
 * Creates realistic data spanning 4 years:
 * - 50,000 products added over 3 years
 * - 1,000,000 sales over 4 years
 * - Realistic growth patterns and seasonal variations
 */

import { PrismaClient } from '../src/generated/prisma'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'

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
  PRODUCT_BATCH_SIZE: 500, // Products per transaction
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
  await prisma.stockMovement.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.saleTransaction.deleteMany()
  await prisma.installment.deleteMany()
  await prisma.deposit.deleteMany()
  await prisma.installmentPlan.deleteMany()
  await prisma.receiptTemplate.deleteMany()
  await prisma.financialTransaction.deleteMany()
  await prisma.product.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.store.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
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
  console.log('👷 Creating employees...')
  const employees = await Promise.all([
    prisma.employee.create({ 
      data: { 
        name: 'John Manager', 
        role: 'Store Manager', 
        email: 'john.manager@bizflow.com',
        phone: '+1-555-1001',
        salary: 5000
      } 
    }),
    prisma.employee.create({ 
      data: { 
        name: 'Sarah Cashier', 
        role: 'Cashier', 
        email: 'sarah.cashier@bizflow.com',
        phone: '+1-555-1002',
        salary: 2500
      } 
    }),
    prisma.employee.create({ 
      data: { 
        name: 'Mike Stock', 
        role: 'Stock Clerk', 
        email: 'mike.stock@bizflow.com',
        phone: '+1-555-1003',
        salary: 2200
      } 
    }),
    prisma.employee.create({ 
      data: { 
        name: 'Lisa Sales', 
        role: 'Sales Associate', 
        email: 'lisa.sales@bizflow.com',
        phone: '+1-555-2001',
        salary: 2800
      } 
    }),
    prisma.employee.create({ 
      data: { 
        name: 'Tom Assistant', 
        role: 'Assistant Manager', 
        email: 'tom.assistant@bizflow.com',
        phone: '+1-555-2002',
        salary: 4000
      } 
    })
  ])
  console.log(`✅ Created ${employees.length} employees\n`)

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
    
    // Use transaction for batch with sequential processing
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
        const variantData = hasVariants ? 
          Array.from({ length: randomInt(2, 5) }, (_, vIdx) => {
            const sku = `${generateSKU(categoryName, productIndex + 1)}-V${vIdx + 1}`
            const variantPrice = basePrice + randomPrice(-10, 20)
            const variantCost = variantPrice * (0.5 + Math.random() * 0.2) // 50-70% of variant price
            return {
              color: COLORS[randomInt(0, COLORS.length - 1)],
              size: SIZES[randomInt(0, SIZES.length - 1)],
              sku,
              barcode: `BAR${sku.replace(/-/g, '')}`,
              price: variantPrice,
              cost: variantCost,
              stock: randomInt(50, 200),
              reorderPoint: randomInt(10, 30)
            }
          }) :
          [{
            color: 'Default',
            size: 'One Size',
            sku: generateSKU(categoryName, productIndex + 1),
            barcode: `BAR${generateSKU(categoryName, productIndex + 1).replace(/-/g, '')}`,
            price: basePrice,
            cost: baseCost,
            stock: randomInt(100, 500),
            reorderPoint: randomInt(20, 50)
          }]
        
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
    })
    
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

  // ==================== DEPOSITS & INSTALLMENTS ====================
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

  // ==================== INSTALLMENT PLANS ====================
  console.log('💳 Creating installment plans...')
  const installmentPlans = await prisma.installmentPlan.createMany({
    data: [
      {
        name: '3-Month Plan',
        downPaymentPercent: 30,
        numberOfPayments: 3,
        intervalDays: 30,
        interestRate: 5,
        description: '30% down payment, 3 monthly installments with 5% interest',
        isActive: true
      },
      {
        name: '6-Month Plan',
        downPaymentPercent: 20,
        numberOfPayments: 6,
        intervalDays: 30,
        interestRate: 8,
        description: '20% down payment, 6 monthly installments with 8% interest',
        isActive: true
      },
      {
        name: '12-Month Plan',
        downPaymentPercent: 10,
        numberOfPayments: 12,
        intervalDays: 30,
        interestRate: 12,
        description: '10% down payment, 12 monthly installments with 12% interest',
        isActive: true
      },
      {
        name: 'Weekly 4-Week Plan',
        downPaymentPercent: 25,
        numberOfPayments: 4,
        intervalDays: 7,
        interestRate: 2,
        description: '25% down payment, 4 weekly installments with 2% interest',
        isActive: true
      },
      {
        name: 'No Interest 3-Month',
        downPaymentPercent: 50,
        numberOfPayments: 3,
        intervalDays: 30,
        interestRate: 0,
        description: '50% down payment, 3 monthly installments with no interest',
        isActive: true
      }
    ]
  })
  console.log(`✅ Created ${installmentPlans.count} installment plans\n`)

  // ==================== SUMMARY ====================
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log('🎉 Development seeding completed successfully!\n')
  console.log('📊 Summary:')
  console.log(`   • ${categories.length} categories`)
  console.log(`   • ${users.length} users`)
  console.log(`   • ${stores.length} stores`)
  console.log(`   • ${employees.length} employees`)
  console.log(`   • ${customers.length.toLocaleString()} customers`)
  console.log(`   • ${products.length.toLocaleString()} products (over 3 years)`)
  console.log(`   • ${totalInitialStockMovements.toLocaleString()} initial stock movements`)
  console.log(`   • ${totalSalesCreated.toLocaleString()} sale transactions (over 4 years)`)
  console.log(`   • ${totalStockMovements.toLocaleString()} sale-related stock movements`)
  console.log(`   • ${additionalStockMovements.toLocaleString()} additional stock movements`)
  console.log(`   • ${financialTransactionCount} financial transactions`)
  console.log(`   • ${suppliers.length} suppliers`)
  console.log(`   • ${supplierProductCount} supplier-product links`)
  console.log(`   • ${purchaseOrderCount} purchase orders`)
  console.log(`   • ${depositCount} deposits`)
  console.log(`   • ${installmentCount} installments`)
  console.log(`   • ${installmentPlans.count} installment plans`)
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
