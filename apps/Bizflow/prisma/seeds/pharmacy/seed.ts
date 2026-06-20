/**
 * Pharmacy Plugin – Development Seed
 *
 * Generates a realistic retail-pharmacy dataset:
 *   – PharmacySupplier
 *   – PharmacyProduct  (catalogue across categories)
 *   – PharmacyBatch    (with a spread of expiry dates: expired / expiring / fresh)
 *   – PharmacySale + PharmacySaleItem  (FEFO-deducted from batches)
 *   – PharmacyPurchaseOrder + items    (draft / ordered / received)
 *
 * Usage:    npm run prisma:seed:pharmacy
 * Overrides: PH_SEED_PRODUCTS, PH_SEED_SALES, PH_SEED_SUPPLIERS, PH_SEED_POS
 */

import { PrismaClient } from '../../../src/generated/prisma'

const prisma = new PrismaClient()

const CONFIG = {
  suppliers: Number(process.env.PH_SEED_SUPPLIERS ?? 8),
  sales:     Number(process.env.PH_SEED_SALES     ?? 600),
  pos:       Number(process.env.PH_SEED_POS       ?? 18),
}

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const chance = (p: number) => Math.random() < p
const money = (n: number) => Math.round(n * 100) / 100
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000)

// ─── Catalogue (name, generic, category, unit, base price) ───────────────────
const CATALOGUE: Array<[string, string, string, string, number]> = [
  ['Paracetamol 500mg', 'Paracetamol', 'painkiller', 'box', 2.5],
  ['Ibuprofen 400mg', 'Ibuprofen', 'painkiller', 'box', 3.2],
  ['Aspirin 75mg', 'Acetylsalicylic acid', 'cardiac', 'box', 2.0],
  ['Diclofenac 50mg', 'Diclofenac', 'painkiller', 'box', 3.8],
  ['Amoxicillin 500mg', 'Amoxicillin', 'antibiotic', 'box', 5.5],
  ['Azithromycin 250mg', 'Azithromycin', 'antibiotic', 'box', 8.9],
  ['Ciprofloxacin 500mg', 'Ciprofloxacin', 'antibiotic', 'box', 6.4],
  ['Cephalexin 500mg', 'Cephalexin', 'antibiotic', 'box', 7.1],
  ['Metronidazole 500mg', 'Metronidazole', 'antibiotic', 'box', 4.3],
  ['Omeprazole 20mg', 'Omeprazole', 'antacid', 'box', 4.0],
  ['Esomeprazole 40mg', 'Esomeprazole', 'antacid', 'box', 6.2],
  ['Ranitidine 150mg', 'Ranitidine', 'antacid', 'box', 3.1],
  ['Gaviscon Suspension', 'Alginate', 'antacid', 'bottle', 5.5],
  ['Loratadine 10mg', 'Loratadine', 'allergy', 'box', 3.4],
  ['Cetirizine 10mg', 'Cetirizine', 'allergy', 'box', 3.0],
  ['Chlorpheniramine 4mg', 'Chlorpheniramine', 'allergy', 'box', 2.2],
  ['Metformin 500mg', 'Metformin', 'diabetes', 'box', 4.6],
  ['Metformin 850mg', 'Metformin', 'diabetes', 'box', 5.1],
  ['Gliclazide 80mg', 'Gliclazide', 'diabetes', 'box', 6.0],
  ['Insulin Glargine', 'Insulin glargine', 'diabetes', 'vial', 24.0],
  ['Atorvastatin 20mg', 'Atorvastatin', 'cardiac', 'box', 7.5],
  ['Rosuvastatin 10mg', 'Rosuvastatin', 'cardiac', 'box', 9.0],
  ['Amlodipine 5mg', 'Amlodipine', 'cardiac', 'box', 4.2],
  ['Bisoprolol 5mg', 'Bisoprolol', 'cardiac', 'box', 5.0],
  ['Lisinopril 10mg', 'Lisinopril', 'cardiac', 'box', 4.8],
  ['Losartan 50mg', 'Losartan', 'cardiac', 'box', 5.6],
  ['Salbutamol Inhaler', 'Salbutamol', 'cough_cold', 'inhaler', 8.5],
  ['Cough Syrup', 'Guaifenesin', 'cough_cold', 'bottle', 4.5],
  ['Vitamin C 1000mg', 'Ascorbic acid', 'vitamin', 'box', 6.0],
  ['Vitamin D3 5000IU', 'Cholecalciferol', 'vitamin', 'box', 7.2],
  ['Multivitamin Complex', 'Multivitamin', 'vitamin', 'box', 9.5],
  ['Calcium + D3', 'Calcium carbonate', 'vitamin', 'box', 6.8],
  ['Folic Acid 5mg', 'Folic acid', 'vitamin', 'box', 2.8],
  ['Iron + Folic Acid', 'Ferrous sulfate', 'vitamin', 'box', 4.1],
  ['Hydrocortisone Cream', 'Hydrocortisone', 'skin', 'tube', 3.9],
  ['Clotrimazole Cream', 'Clotrimazole', 'skin', 'tube', 4.2],
  ['Betamethasone Cream', 'Betamethasone', 'skin', 'tube', 5.0],
  ['Antiseptic Solution', 'Povidone-iodine', 'skin', 'bottle', 3.5],
  ['Eye Drops Lubricant', 'Carmellose', 'eye_ear', 'bottle', 5.5],
  ['Ear Drops', 'Olive oil', 'eye_ear', 'bottle', 4.0],
  ['Chloramphenicol Eye Drops', 'Chloramphenicol', 'eye_ear', 'bottle', 4.8],
  ['ORS Sachets', 'Oral rehydration salts', 'baby_care', 'box', 3.0],
  ['Baby Paracetamol Syrup', 'Paracetamol', 'baby_care', 'bottle', 4.4],
  ['Gripe Water', 'Sodium bicarbonate', 'baby_care', 'bottle', 3.6],
  ['Diaper Rash Cream', 'Zinc oxide', 'baby_care', 'tube', 5.2],
  ['Antacid Tablets', 'Calcium carbonate', 'antacid', 'box', 2.4],
  ['Naproxen 250mg', 'Naproxen', 'painkiller', 'box', 4.0],
  ['Doxycycline 100mg', 'Doxycycline', 'antibiotic', 'box', 6.6],
  ['Prednisolone 5mg', 'Prednisolone', 'general', 'box', 3.3],
  ['Diazepam 5mg', 'Diazepam', 'general', 'box', 4.9],
  ['Levothyroxine 50mcg', 'Levothyroxine', 'general', 'box', 5.4],
  ['Warfarin 5mg', 'Warfarin', 'cardiac', 'box', 4.7],
  ['Clopidogrel 75mg', 'Clopidogrel', 'cardiac', 'box', 8.0],
  ['Pantoprazole 40mg', 'Pantoprazole', 'antacid', 'box', 5.3],
  ['Domperidone 10mg', 'Domperidone', 'general', 'box', 3.7],
  ['Ondansetron 4mg', 'Ondansetron', 'general', 'box', 6.1],
  ['Tramadol 50mg', 'Tramadol', 'painkiller', 'box', 5.8],
  ['Montelukast 10mg', 'Montelukast', 'cough_cold', 'box', 7.0],
  ['Fluticasone Nasal Spray', 'Fluticasone', 'cough_cold', 'inhaler', 9.2],
  ['Zinc Supplement', 'Zinc gluconate', 'vitamin', 'box', 4.3],
]

const SUPPLIER_NAMES = [
  'MediSource Distribution', 'PharmaCare Wholesale', 'Global Health Supplies', 'Crescent Pharma',
  'United Medical Co.', 'PrimeMed Logistics', 'HealthLink Traders', 'Apex Pharmaceuticals',
  'BlueCross Supplies', 'Vital Distributors', 'CarePoint Wholesale', 'NovaMed Trading',
]

async function main() {
  console.log('💊  Seeding pharmacy data…')

  // Wipe existing pharmacy data for a clean reseed.
  await prisma.pharmacySaleItem.deleteMany()
  await prisma.pharmacySale.deleteMany()
  await prisma.pharmacyPurchaseOrderItem.deleteMany()
  await prisma.pharmacyPurchaseOrder.deleteMany()
  await prisma.pharmacyBatch.deleteMany()
  await prisma.pharmacyProduct.deleteMany()
  await prisma.pharmacyCustomer.deleteMany()
  await prisma.pharmacySupplier.deleteMany()

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const suppliers: any[] = []
  for (let i = 0; i < Math.min(CONFIG.suppliers, SUPPLIER_NAMES.length); i++) {
    suppliers.push(await prisma.pharmacySupplier.create({
      data: {
        name: SUPPLIER_NAMES[i],
        phone: `+20 1${rand(0, 2)}${rand(1000000, 9999999)}`,
        email: `orders@${SUPPLIER_NAMES[i].toLowerCase().replace(/[^a-z]/g, '')}.com`,
        address: pick(['Cairo', 'Alexandria', 'Giza', 'Mansoura', 'Tanta']) + ', Egypt',
      },
    }))
  }
  console.log(`  ✓ ${suppliers.length} suppliers`)

  // ── Customers ─────────────────────────────────────────────────────────
  const CUSTOMER_NAMES = ['Ahmed Hassan', 'Sara Mohamed', 'Omar Ali', 'Mona Khaled', 'Youssef Adel',
    'Layla Ibrahim', 'Karim Nabil', 'Nour Tarek', 'Hassan Saleh', 'Dina Fouad', 'Tamer Wael', 'Rania Samir']
  const customers: any[] = []
  for (const name of CUSTOMER_NAMES) {
    customers.push(await prisma.pharmacyCustomer.create({
      data: {
        name,
        phone: `+20 1${rand(0, 2)}${rand(1000000, 9999999)}`,
        defaultDiscount: pick([0, 0, 0, 0, 5, 10]),
      },
    }))
  }
  console.log(`  ✓ ${customers.length} customers`)

  // ── Products + batches ───────────────────────────────────────────────────
  const products: any[] = []
  for (const [name, generic, category, unit, basePrice] of CATALOGUE) {
    const sellingPrice = money(basePrice * (1.4 + Math.random() * 0.6)) // ~40-100% markup
    // Some products are sellable by a sub-unit (e.g. ml from a bottle, tablets from a box).
    let subUnit: string | null = null, subUnitsPerContainer: number | null = null
    if (unit === 'bottle') { subUnit = 'ml'; subUnitsPerContainer = pick([60, 100, 120, 150]) }
    else if (unit === 'tube') { subUnit = 'g'; subUnitsPerContainer = pick([15, 20, 30]) }
    else if (unit === 'box' && chance(0.4)) { subUnit = 'tablet'; subUnitsPerContainer = pick([10, 20, 30]) }
    const product = await prisma.pharmacyProduct.create({
      data: {
        name, genericName: generic, category, unit,
        subUnit, subUnitsPerContainer,
        barcode: String(rand(600000000000, 699999999999)),
        sellingPrice,
        minimumStock: pick([10, 20, 20, 30, 50]),
        isActive: true,
      },
    })

    // Stock profile: ~8% out of stock, others 1-3 batches.
    const stockRoll = Math.random()
    if (stockRoll < 0.08) { products.push({ ...product, _batches: [] }); continue }

    const batchCount = rand(1, 3)
    const batches: any[] = []
    for (let b = 0; b < batchCount; b++) {
      // Expiry distribution
      let expiryDays: number
      const r = Math.random()
      if (r < 0.10) expiryDays = rand(-120, -1)        // expired
      else if (r < 0.25) expiryDays = rand(1, 30)       // expiring soon
      else if (r < 0.45) expiryDays = rand(31, 90)      // expiring this quarter
      else expiryDays = rand(120, 720)                  // fresh

      const cost = money(basePrice * (0.85 + Math.random() * 0.25))
      const qty = rand(5, 200)
      const batch = await prisma.pharmacyBatch.create({
        data: {
          productId: product.id,
          batchNumber: `LOT-${rand(10000, 99999)}`,
          quantity: qty, initialQty: qty,
          costPerUnit: cost,
          sellingPrice: chance(0.4) ? money(sellingPrice * (0.95 + Math.random() * 0.1)) : null,
          expiryDate: daysFromNow(expiryDays),
          receivedDate: daysFromNow(-rand(10, 200)),
          supplierId: suppliers.length ? pick(suppliers).id : null,
          status: 'active',
        },
      })
      batches.push(batch)
    }
    products.push({ ...product, _batches: batches })
  }
  console.log(`  ✓ ${products.length} products with batches`)

  // ── Sales (FEFO deduction across batches) ────────────────────────────────
  // In-memory batch stock so we don't oversell.
  const stock: Record<string, { id: string; quantity: number; cost: number; expiry: number; sell: number | null }[]> = {}
  for (const p of products) {
    stock[p.id] = (p._batches ?? []).map((b: any) => ({ id: b.id, quantity: b.quantity, cost: b.costPerUnit, expiry: new Date(b.expiryDate).getTime(), sell: b.sellingPrice }))
      .sort((a: any, z: any) => a.expiry - z.expiry)
  }
  const sellable = products.filter(p => (stock[p.id] ?? []).some(b => b.quantity > 0))

  const CUSTOMERS = ['Walk-in', 'Ahmed Hassan', 'Sara Mohamed', 'Omar Ali', 'Mona Khaled', 'Youssef Adel', 'Layla Ibrahim', 'Karim Nabil', '']
  let saleNumber = 0
  let made = 0
  for (let i = 0; i < CONFIG.sales && sellable.length; i++) {
    const when = daysFromNow(-rand(0, 120))
    const lineCount = rand(1, 4)
    const lines: any[] = []
    let subtotal = 0
    const usedProducts = new Set<string>()

    for (let l = 0; l < lineCount; l++) {
      const product = pick(sellable)
      if (usedProducts.has(product.id)) continue
      const bs = stock[product.id].filter(b => b.quantity > 0)
      if (bs.length === 0) continue
      usedProducts.add(product.id)
      let want = rand(1, 8)
      const unitPrice = product.sellingPrice
      for (const b of bs) {
        if (want <= 0) break
        const take = Math.min(want, b.quantity)
        b.quantity -= take
        want -= take
        lines.push({ productId: product.id, batchId: b.id, productName: product.name, quantity: take, unitPrice, costPerUnit: b.cost, lineTotal: money(take * unitPrice) })
        subtotal += take * unitPrice
      }
    }
    if (lines.length === 0) continue

    subtotal = money(subtotal)
    const discount = chance(0.25) ? money(subtotal * (Math.random() * 0.12)) : 0
    const total = money(subtotal - discount)
    // payment mix: 80% paid, 12% partial, 8% unpaid
    const payRoll = Math.random()
    const amountPaid = payRoll < 0.80 ? total : payRoll < 0.92 ? money(total * (0.3 + Math.random() * 0.4)) : 0
    const paymentStatus = amountPaid >= total - 0.005 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'
    const refunded = chance(0.04)

    saleNumber++
    const linkedCustomer = chance(0.5) ? pick(customers) : null
    await prisma.pharmacySale.create({
      data: {
        saleNumber,
        customerId: linkedCustomer?.id ?? null,
        customerName: linkedCustomer?.name ?? (pick(CUSTOMERS) || null),
        subtotal, discount, total, amountPaid, paymentStatus,
        paymentMethod: pick(['cash', 'cash', 'cash', 'card', 'other']),
        status: refunded ? 'refunded' : 'completed',
        refundedAmount: refunded ? total : 0,
        saleDate: when, createdAt: when,
        items: { create: lines },
      },
    })
    made++
    // Persist batch decrements periodically handled at end.
  }

  // Persist final batch quantities + depleted status.
  for (const p of products) {
    for (const b of (stock[p.id] ?? [])) {
      await prisma.pharmacyBatch.update({ where: { id: b.id }, data: { quantity: b.quantity, status: b.quantity <= 0 ? 'depleted' : 'active' } })
    }
  }
  console.log(`  ✓ ${made} sales`)

  // ── Purchase orders ──────────────────────────────────────────────────────
  let orderNumber = 0
  let pos = 0
  for (let i = 0; i < CONFIG.pos; i++) {
    const itemCount = rand(2, 6)
    const items: any[] = []
    let total = 0
    const used = new Set<string>()
    for (let l = 0; l < itemCount; l++) {
      const product = pick(products)
      if (used.has(product.id)) continue
      used.add(product.id)
      const qty = rand(20, 200)
      const cost = money(product.sellingPrice * (0.5 + Math.random() * 0.2))
      total += qty * cost
      items.push({
        productId: product.id, productName: product.name, quantity: qty, costPerUnit: cost,
        sellingPrice: product.sellingPrice, expiryDate: daysFromNow(rand(180, 720)),
        lineTotal: money(qty * cost), received: false,
      })
    }
    if (items.length === 0) continue
    const status = pick(['draft', 'ordered', 'ordered', 'received'])
    orderNumber++
    await prisma.pharmacyPurchaseOrder.create({
      data: {
        orderNumber, supplierId: suppliers.length ? pick(suppliers).id : null,
        status, total: money(total),
        orderDate: daysFromNow(-rand(1, 60)),
        receivedDate: status === 'received' ? daysFromNow(-rand(0, 30)) : null,
        items: { create: items.map(it => ({ ...it, received: status === 'received' })) },
      },
    })
    pos++
  }
  console.log(`  ✓ ${pos} purchase orders`)

  console.log('✅  Pharmacy seed complete.')
}

main()
  .catch((e) => { console.error('❌ Pharmacy seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
