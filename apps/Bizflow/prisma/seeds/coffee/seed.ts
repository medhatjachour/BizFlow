/**
 * Coffee Shop Seed Data
 * Creates starter categories, products, a sample table layout, and a default customer.
 * Run with: npm run prisma:seed:coffee
 */

import { PrismaClient } from '../../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('☕ Seeding coffee shop data…')

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.coffeeCategory.upsert({
      where: { name: 'Hot Drinks' },
      update: {},
      create: { name: 'Hot Drinks', color: 'amber', icon: '☕', displayOrder: 1 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Cold Drinks' },
      update: {},
      create: { name: 'Cold Drinks', color: 'blue', icon: '🧊', displayOrder: 2 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Specialty Drinks' },
      update: {},
      create: { name: 'Specialty Drinks', color: 'violet', icon: '✨', displayOrder: 3 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Food & Snacks' },
      update: {},
      create: { name: 'Food & Snacks', color: 'orange', icon: '🥐', displayOrder: 4 }
    }),
    prisma.coffeeCategory.upsert({
      where: { name: 'Fresh Juice' },
      update: {},
      create: { name: 'Fresh Juice', color: 'green', icon: '🍊', displayOrder: 5 }
    })
  ])

  const [hotDrinks, coldDrinks, specialty, food, juice] = categories
  console.log(`  ✅ ${categories.length} categories seeded`)

  // ── Products ─────────────────────────────────────────────────────────────────
  const products = [
    // Hot Drinks
    { name: 'Espresso',          categoryId: hotDrinks.id,  price: 15,  cost: 4,  stock: 100, reorderPoint: 20, displayOrder: 1 },
    { name: 'Americano',         categoryId: hotDrinks.id,  price: 20,  cost: 5,  stock: 100, reorderPoint: 20, displayOrder: 2 },
    { name: 'Cappuccino',        categoryId: hotDrinks.id,  price: 35,  cost: 9,  stock: 100, reorderPoint: 15, displayOrder: 3 },
    { name: 'Latte',             categoryId: hotDrinks.id,  price: 40,  cost: 10, stock: 100, reorderPoint: 15, displayOrder: 4 },
    { name: 'Flat White',        categoryId: hotDrinks.id,  price: 40,  cost: 10, stock: 100, reorderPoint: 10, displayOrder: 5 },
    { name: 'Macchiato',         categoryId: hotDrinks.id,  price: 30,  cost: 7,  stock: 100, reorderPoint: 10, displayOrder: 6 },
    { name: 'Turkish Coffee',    categoryId: hotDrinks.id,  price: 25,  cost: 5,  stock: 100, reorderPoint: 15, displayOrder: 7 },
    { name: 'Hot Chocolate',     categoryId: hotDrinks.id,  price: 35,  cost: 8,  stock: 80,  reorderPoint: 10, displayOrder: 8 },
    { name: 'Tea',               categoryId: hotDrinks.id,  price: 15,  cost: 2,  stock: 200, reorderPoint: 30, displayOrder: 9 },
    // Cold Drinks
    { name: 'Iced Americano',    categoryId: coldDrinks.id, price: 30,  cost: 7,  stock: 100, reorderPoint: 15, displayOrder: 1 },
    { name: 'Iced Latte',        categoryId: coldDrinks.id, price: 45,  cost: 11, stock: 100, reorderPoint: 15, displayOrder: 2 },
    { name: 'Cold Brew',         categoryId: coldDrinks.id, price: 45,  cost: 10, stock: 50,  reorderPoint: 10, displayOrder: 3 },
    { name: 'Iced Cappuccino',   categoryId: coldDrinks.id, price: 45,  cost: 11, stock: 80,  reorderPoint: 10, displayOrder: 4 },
    { name: 'Frappe',            categoryId: coldDrinks.id, price: 50,  cost: 13, stock: 80,  reorderPoint: 10, displayOrder: 5 },
    // Specialty
    { name: 'Caramel Latte',     categoryId: specialty.id,  price: 50,  cost: 14, stock: 80,  reorderPoint: 10, displayOrder: 1 },
    { name: 'Vanilla Latte',     categoryId: specialty.id,  price: 50,  cost: 13, stock: 80,  reorderPoint: 10, displayOrder: 2 },
    { name: 'Mocha',             categoryId: specialty.id,  price: 50,  cost: 14, stock: 80,  reorderPoint: 10, displayOrder: 3 },
    { name: 'Matcha Latte',      categoryId: specialty.id,  price: 55,  cost: 15, stock: 60,  reorderPoint: 10, displayOrder: 4 },
    { name: 'Hazelnut Latte',    categoryId: specialty.id,  price: 55,  cost: 15, stock: 60,  reorderPoint: 10, displayOrder: 5 },
    // Food & Snacks
    { name: 'Croissant',         categoryId: food.id,        price: 25,  cost: 8,  stock: 20,  reorderPoint: 5,  displayOrder: 1 },
    { name: 'Chocolate Muffin',  categoryId: food.id,        price: 30,  cost: 9,  stock: 15,  reorderPoint: 5,  displayOrder: 2 },
    { name: 'Blueberry Muffin',  categoryId: food.id,        price: 30,  cost: 9,  stock: 15,  reorderPoint: 5,  displayOrder: 3 },
    { name: 'Avocado Toast',     categoryId: food.id,        price: 60,  cost: 20, stock: 10,  reorderPoint: 3,  displayOrder: 4 },
    { name: 'Club Sandwich',     categoryId: food.id,        price: 75,  cost: 25, stock: 10,  reorderPoint: 3,  displayOrder: 5 },
    { name: 'Cheesecake Slice',  categoryId: food.id,        price: 45,  cost: 12, stock: 8,   reorderPoint: 3,  displayOrder: 6 },
    // Fresh Juice
    { name: 'Orange Juice',      categoryId: juice.id,       price: 30,  cost: 8,  stock: 50,  reorderPoint: 10, displayOrder: 1 },
    { name: 'Mango Juice',       categoryId: juice.id,       price: 35,  cost: 10, stock: 40,  reorderPoint: 10, displayOrder: 2 },
    { name: 'Mixed Fruit',       categoryId: juice.id,       price: 40,  cost: 12, stock: 40,  reorderPoint: 10, displayOrder: 3 }
  ]

  let productCount = 0
  for (const p of products) {
    const exists = await prisma.coffeeProduct.findFirst({ where: { name: p.name } })
    if (!exists) {
      await prisma.coffeeProduct.create({ data: { ...p, isAvailable: true } })
      productCount++
    }
  }
  console.log(`  ✅ ${productCount} products seeded`)

  // ── Tables ───────────────────────────────────────────────────────────────────
  const tables = [
    { number: 1, name: 'Table 1',  capacity: 2, section: 'Indoor'  },
    { number: 2, name: 'Table 2',  capacity: 2, section: 'Indoor'  },
    { number: 3, name: 'Table 3',  capacity: 4, section: 'Indoor'  },
    { number: 4, name: 'Table 4',  capacity: 4, section: 'Indoor'  },
    { number: 5, name: 'Table 5',  capacity: 4, section: 'Indoor'  },
    { number: 6, name: 'Window 1', capacity: 2, section: 'Window'  },
    { number: 7, name: 'Window 2', capacity: 2, section: 'Window'  },
    { number: 8, name: 'Patio 1',  capacity: 4, section: 'Outdoor' },
    { number: 9, name: 'Patio 2',  capacity: 4, section: 'Outdoor' },
    { number: 10, name: 'Bar 1',   capacity: 2, section: 'Bar'     },
    { number: 11, name: 'Bar 2',   capacity: 2, section: 'Bar'     },
    { number: 12, name: 'VIP',     capacity: 6, section: 'VIP'     }
  ]

  let tableCount = 0
  for (const t of tables) {
    const exists = await prisma.coffeeTable.findFirst({ where: { number: t.number } })
    if (!exists) {
      await prisma.coffeeTable.create({ data: t })
      tableCount++
    }
  }
  console.log(`  ✅ ${tableCount} tables seeded`)

  // ── Customers ────────────────────────────────────────────────────────────────
  const customers = [
    { name: 'Ahmed Hassan',   phone: '01012345678', email: 'ahmed@example.com',  notes: 'Prefers oat milk' },
    { name: 'Sara Mohamed',   phone: '01098765432', email: 'sara@example.com',   notes: 'Lactose intolerant' },
    { name: 'Omar Khaled',    phone: '01156789012', email: null,                 notes: null },
    { name: 'Layla Ibrahim',  phone: '01234567890', email: null,                 notes: 'No sugar please' },
    { name: 'Karim Adel',     phone: '01187654321', email: 'karim@example.com',  notes: null }
  ]

  let customerCount = 0
  for (const c of customers) {
    const exists = await prisma.coffeeCustomer.findFirst({ where: { phone: c.phone ?? undefined } })
    if (!exists) {
      await prisma.coffeeCustomer.create({ data: { ...c, totalSpent: 0, visitCount: 0 } })
      customerCount++
    }
  }
  console.log(`  ✅ ${customerCount} customers seeded`)

  console.log('✅ Coffee seed complete!')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
