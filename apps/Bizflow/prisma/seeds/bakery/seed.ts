/**
 * Bakery Plugin — Comprehensive Development Seed
 *
 * Simulates 4 years of real daily bakery business activity:
 *   * 6 users (admin / managers / bakers)
 *   * 12 employees with 4 years of attendance, payroll, shifts, overtime
 *   * 20 pantry ingredients with realistic stock levels + supplier names
 *   * 12 recipes with ingredients, selling prices, and rich notes
 *   * 4 years of production batches (daily baking runs)
 *   * 4 years of production schedules (historical + 30 days future)
 *   * 4 years of waste logs (all 4 types, linked to batches/pantry)
 *   * 4 years of bakery sales (batch-linked; last 3 days unsold for POS demo)
 *   * 4 years of bakery expenses (all 9 categories: rent, utilities, salaries,
 *     ingredients, equipment, packaging, marketing, maintenance, other)
 *   * 4 years of financial transactions (income + expense ledger)
 *
 * Usage:
 *   npx ts-node prisma/seeds/bakery/seed.ts
 *   -- or --
 *   npm run prisma:seed:bakery
 */

import { PrismaClient } from "../../../src/generated/prisma"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient({ log: ["warn", "error"] })

// -- helpers ------------------------------------------------------------------
const NOW    = new Date()
const MS_DAY = 86_400_000

function daysAgo(n: number)           { return new Date(NOW.getTime() - n * MS_DAY) }
function daysFromNow(n: number)       { return new Date(NOW.getTime() + n * MS_DAY) }
function randomDate(from: Date, to: Date) {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}
function ri(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rp(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function pick<T>(arr: T[]): T         { return arr[ri(0, arr.length - 1)] }
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const FOUR_YEARS_AGO  = daysAgo(4 * 365)
const THREE_YEARS_AGO = daysAgo(3 * 365)

// -- constants ----------------------------------------------------------------

const EMPLOYEE_ROLES = [
  { role: "Head Baker",        department: "Production",  salary: 5_500, type: "full-time" },
  { role: "Assistant Baker",   department: "Production",  salary: 3_800, type: "full-time" },
  { role: "Pastry Chef",       department: "Production",  salary: 4_200, type: "full-time" },
  { role: "Cake Decorator",    department: "Production",  salary: 3_500, type: "full-time" },
  { role: "Bakery Manager",    department: "Management",  salary: 6_000, type: "full-time" },
  { role: "Sales Associate",   department: "Sales",       salary: 2_500, type: "full-time" },
  { role: "Cashier",           department: "Sales",       salary: 2_300, type: "full-time" },
  { role: "Delivery Driver",   department: "Logistics",   salary: 2_800, type: "full-time" },
  { role: "Cleaning Staff",    department: "Operations",  salary: 2_000, type: "part-time" },
  { role: "Stock Controller",  department: "Operations",  salary: 2_600, type: "full-time" },
  { role: "Marketing Officer", department: "Marketing",   salary: 3_200, type: "full-time" },
  { role: "Apprentice Baker",  department: "Production",  salary: 1_800, type: "part-time" },
]

const FIRST_NAMES = ["Ahmed","Sara","Layla","Omar","Nour","Khaled","Rana","Yusuf","Hana","Tarek","Mona","Sami"]
const LAST_NAMES  = ["Hassan","Ali","Ibrahim","Mahmoud","Khalil","Nasser","Farouk","Mansour","Saleh","Bakr","Qasim","Zaki"]

const WASTE_REASONS = ["Expired","Dropped","Overbaked","Underbaked","Contaminated","Quality rejection","Overproduction"] as string[]
const WASTE_TYPES   = ["ingredient","finished_product","production_batch","other"] as string[]
const FT_EXPENSE_CATS = ["rent","utilities","salaries","ingredients","equipment","marketing","maintenance","other"] as string[]

// -- PANTRY -------------------------------------------------------------------
const PANTRY_DEFS = [
  { name: "All-Purpose Flour",  unit: "kg",  costPerUnit: 0.80,  lowStock: 10,  reorderPoint: 15,  reorderQty: 50,   supplier: "FreshMill Supplies" },
  { name: "Bread Flour",        unit: "kg",  costPerUnit: 1.00,  lowStock: 8,   reorderPoint: 12,  reorderQty: 40,   supplier: "FreshMill Supplies" },
  { name: "Cake Flour",         unit: "kg",  costPerUnit: 1.20,  lowStock: 5,   reorderPoint: 8,   reorderQty: 25,   supplier: "FreshMill Supplies" },
  { name: "Granulated Sugar",   unit: "kg",  costPerUnit: 0.90,  lowStock: 8,   reorderPoint: 12,  reorderQty: 30,   supplier: "Wholesale Baking Co." },
  { name: "Powdered Sugar",     unit: "kg",  costPerUnit: 1.10,  lowStock: 4,   reorderPoint: 6,   reorderQty: 20,   supplier: "Wholesale Baking Co." },
  { name: "Butter",             unit: "kg",  costPerUnit: 5.50,  lowStock: 5,   reorderPoint: 8,   reorderQty: 20,   supplier: "Farm Direct" },
  { name: "Eggs",               unit: "pcs", costPerUnit: 0.25,  lowStock: 30,  reorderPoint: 50,  reorderQty: 200,  supplier: "Farm Direct" },
  { name: "Whole Milk",         unit: "L",   costPerUnit: 1.20,  lowStock: 10,  reorderPoint: 15,  reorderQty: 40,   supplier: "Farm Direct" },
  { name: "Heavy Cream",        unit: "L",   costPerUnit: 2.50,  lowStock: 5,   reorderPoint: 8,   reorderQty: 20,   supplier: "Farm Direct" },
  { name: "Yeast (dry)",        unit: "g",   costPerUnit: 0.020, lowStock: 200, reorderPoint: 300, reorderQty: 1000, supplier: "Wholesale Baking Co." },
  { name: "Baking Powder",      unit: "g",   costPerUnit: 0.010, lowStock: 150, reorderPoint: 200, reorderQty: 800,  supplier: "Wholesale Baking Co." },
  { name: "Baking Soda",        unit: "g",   costPerUnit: 0.010, lowStock: 150, reorderPoint: 200, reorderQty: 800,  supplier: "Wholesale Baking Co." },
  { name: "Salt",               unit: "g",   costPerUnit: 0.003, lowStock: 200, reorderPoint: 300, reorderQty: 1000, supplier: "City Ingredients Ltd" },
  { name: "Vanilla Extract",    unit: "ml",  costPerUnit: 0.050, lowStock: 100, reorderPoint: 150, reorderQty: 500,  supplier: "City Ingredients Ltd" },
  { name: "Cocoa Powder",       unit: "g",   costPerUnit: 0.025, lowStock: 200, reorderPoint: 300, reorderQty: 1000, supplier: "City Ingredients Ltd" },
  { name: "Dark Chocolate",     unit: "kg",  costPerUnit: 8.00,  lowStock: 3,   reorderPoint: 5,   reorderQty: 15,   supplier: "City Ingredients Ltd" },
  { name: "Almond Flour",       unit: "kg",  costPerUnit: 6.50,  lowStock: 2,   reorderPoint: 4,   reorderQty: 10,   supplier: "Wholesale Baking Co." },
  { name: "Honey",              unit: "kg",  costPerUnit: 7.00,  lowStock: 2,   reorderPoint: 3,   reorderQty: 10,   supplier: "Farm Direct" },
  { name: "Cinnamon",           unit: "g",   costPerUnit: 0.030, lowStock: 100, reorderPoint: 150, reorderQty: 500,  supplier: "City Ingredients Ltd" },
  { name: "Sesame Seeds",       unit: "g",   costPerUnit: 0.015, lowStock: 200, reorderPoint: 300, reorderQty: 1000, supplier: "City Ingredients Ltd" },
]

// -- RECIPES (sellingPrice = price per single yield unit) ---------------------
const RECIPE_DEFS = [
  {
    name: "Classic White Bread",
    description: "Soft sandwich loaf, perfect for daily fresh baking. Golden crust, fluffy interior.",
    yieldQty: 4, yieldUnit: "loaves", expiryDays: 3, sellingPrice: 3.50,
    notes: "Let dough rise 1 hour before baking at 200°C. Brush with egg wash for golden top.",
    ingredients: [
      { name: "Bread Flour",  quantity: 0.50, unit: "kg",  costPerUnit: 1.00 },
      { name: "Yeast (dry)",  quantity: 7,    unit: "g",   costPerUnit: 0.020 },
      { name: "Salt",         quantity: 10,   unit: "g",   costPerUnit: 0.003 },
      { name: "Whole Milk",   quantity: 0.30, unit: "L",   costPerUnit: 1.20 },
      { name: "Butter",       quantity: 0.03, unit: "kg",  costPerUnit: 5.50 },
    ],
  },
  {
    name: "Sourdough Loaf",
    description: "Artisan sourdough with crispy crust and open chewy crumb. 24-hour slow fermentation.",
    yieldQty: 2, yieldUnit: "loaves", expiryDays: 5, sellingPrice: 6.00,
    notes: "Requires active sourdough starter. Score deeply before baking with steam injection.",
    ingredients: [
      { name: "Bread Flour", quantity: 0.80, unit: "kg", costPerUnit: 1.00 },
      { name: "Salt",        quantity: 16,   unit: "g",  costPerUnit: 0.003 },
      { name: "Whole Milk",  quantity: 0.10, unit: "L",  costPerUnit: 1.20 },
    ],
  },
  {
    name: "Chocolate Croissants",
    description: "Buttery laminated dough filled with premium dark chocolate. Flaky, rich, irresistible.",
    yieldQty: 12, yieldUnit: "pcs", expiryDays: 2, sellingPrice: 2.75,
    notes: "Laminate dough 3 times with resting 30 min in between. Cold-proof overnight in fridge.",
    ingredients: [
      { name: "All-Purpose Flour", quantity: 0.50, unit: "kg",  costPerUnit: 0.80 },
      { name: "Butter",            quantity: 0.30, unit: "kg",  costPerUnit: 5.50 },
      { name: "Eggs",              quantity: 2,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Granulated Sugar",  quantity: 0.05, unit: "kg",  costPerUnit: 0.90 },
      { name: "Yeast (dry)",       quantity: 7,    unit: "g",   costPerUnit: 0.020 },
      { name: "Dark Chocolate",    quantity: 0.20, unit: "kg",  costPerUnit: 8.00 },
      { name: "Whole Milk",        quantity: 0.15, unit: "L",   costPerUnit: 1.20 },
      { name: "Salt",              quantity: 5,    unit: "g",   costPerUnit: 0.003 },
    ],
  },
  {
    name: "Chocolate Fudge Cake",
    description: "Rich layered chocolate cake with dark chocolate ganache frosting. Serves 8.",
    yieldQty: 1, yieldUnit: "cake", expiryDays: 4, sellingPrice: 28.00,
    notes: "Bake at 175°C for 35 minutes. Cool completely before applying ganache.",
    ingredients: [
      { name: "Cake Flour",       quantity: 0.30, unit: "kg",  costPerUnit: 1.20 },
      { name: "Cocoa Powder",     quantity: 60,   unit: "g",   costPerUnit: 0.025 },
      { name: "Granulated Sugar", quantity: 0.30, unit: "kg",  costPerUnit: 0.90 },
      { name: "Butter",           quantity: 0.15, unit: "kg",  costPerUnit: 5.50 },
      { name: "Eggs",             quantity: 3,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Whole Milk",       quantity: 0.20, unit: "L",   costPerUnit: 1.20 },
      { name: "Baking Powder",    quantity: 10,   unit: "g",   costPerUnit: 0.010 },
      { name: "Dark Chocolate",   quantity: 0.20, unit: "kg",  costPerUnit: 8.00 },
      { name: "Vanilla Extract",  quantity: 5,    unit: "ml",  costPerUnit: 0.050 },
    ],
  },
  {
    name: "Butter Cookies",
    description: "Classic shortbread-style butter cookies. Crisp, buttery, melt-in-your-mouth.",
    yieldQty: 36, yieldUnit: "pcs", expiryDays: 7, sellingPrice: 0.60,
    notes: "Chill dough 30 min before cutting to shapes. Bake at 180°C for 12 min until edges turn golden.",
    ingredients: [
      { name: "All-Purpose Flour", quantity: 0.30, unit: "kg",  costPerUnit: 0.80 },
      { name: "Butter",            quantity: 0.20, unit: "kg",  costPerUnit: 5.50 },
      { name: "Powdered Sugar",    quantity: 0.10, unit: "kg",  costPerUnit: 1.10 },
      { name: "Eggs",              quantity: 1,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Vanilla Extract",   quantity: 5,    unit: "ml",  costPerUnit: 0.050 },
      { name: "Salt",              quantity: 2,    unit: "g",   costPerUnit: 0.003 },
    ],
  },
  {
    name: "Cinnamon Rolls",
    description: "Soft yeast rolls with brown sugar cinnamon filling and vanilla cream cheese icing.",
    yieldQty: 12, yieldUnit: "pcs", expiryDays: 2, sellingPrice: 2.50,
    notes: "Second rise after shaping (45 min). Bake at 190°C for 20 minutes until golden brown.",
    ingredients: [
      { name: "All-Purpose Flour", quantity: 0.50, unit: "kg",  costPerUnit: 0.80 },
      { name: "Yeast (dry)",       quantity: 7,    unit: "g",   costPerUnit: 0.020 },
      { name: "Whole Milk",        quantity: 0.25, unit: "L",   costPerUnit: 1.20 },
      { name: "Butter",            quantity: 0.10, unit: "kg",  costPerUnit: 5.50 },
      { name: "Granulated Sugar",  quantity: 0.10, unit: "kg",  costPerUnit: 0.90 },
      { name: "Eggs",              quantity: 2,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Cinnamon",          quantity: 15,   unit: "g",   costPerUnit: 0.030 },
      { name: "Salt",              quantity: 5,    unit: "g",   costPerUnit: 0.003 },
    ],
  },
  {
    name: "Almond Croissants",
    description: "Twice-baked croissants generously filled with almond frangipane, topped with flaked almonds.",
    yieldQty: 8, yieldUnit: "pcs", expiryDays: 2, sellingPrice: 3.25,
    notes: "Fill day-old croissants with frangipane. Sprinkle flaked almonds and bake at 180°C for 15 min.",
    ingredients: [
      { name: "Almond Flour",     quantity: 0.15, unit: "kg",  costPerUnit: 6.50 },
      { name: "Butter",           quantity: 0.10, unit: "kg",  costPerUnit: 5.50 },
      { name: "Granulated Sugar", quantity: 0.10, unit: "kg",  costPerUnit: 0.90 },
      { name: "Eggs",             quantity: 2,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Vanilla Extract",  quantity: 3,    unit: "ml",  costPerUnit: 0.050 },
    ],
  },
  {
    name: "Sesame Bread Rings (Ka'ak)",
    description: "Traditional Middle-Eastern sesame-coated bread rings. Crunchy crust, perfect with tea.",
    yieldQty: 20, yieldUnit: "pcs", expiryDays: 5, sellingPrice: 1.20,
    notes: "Dip rings in sesame seeds before baking. Bake at 220°C for 15 min until deep golden.",
    ingredients: [
      { name: "Bread Flour",  quantity: 0.50, unit: "kg",  costPerUnit: 1.00 },
      { name: "Sesame Seeds", quantity: 100,  unit: "g",   costPerUnit: 0.015 },
      { name: "Yeast (dry)",  quantity: 7,    unit: "g",   costPerUnit: 0.020 },
      { name: "Salt",         quantity: 10,   unit: "g",   costPerUnit: 0.003 },
      { name: "Honey",        quantity: 0.03, unit: "kg",  costPerUnit: 7.00 },
      { name: "Whole Milk",   quantity: 0.20, unit: "L",   costPerUnit: 1.20 },
    ],
  },
  {
    name: "Honey Cake",
    description: "Moist, lightly spiced cake sweetened with pure wildflower honey. Serves 10.",
    yieldQty: 1, yieldUnit: "cake", expiryDays: 5, sellingPrice: 24.00,
    notes: "Best served on day 2 when honey fully soaks in. Bake at 170°C for 40 min.",
    ingredients: [
      { name: "All-Purpose Flour", quantity: 0.30, unit: "kg",  costPerUnit: 0.80 },
      { name: "Honey",             quantity: 0.20, unit: "kg",  costPerUnit: 7.00 },
      { name: "Eggs",              quantity: 3,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Butter",            quantity: 0.10, unit: "kg",  costPerUnit: 5.50 },
      { name: "Baking Soda",       quantity: 5,    unit: "g",   costPerUnit: 0.010 },
      { name: "Cinnamon",          quantity: 5,    unit: "g",   costPerUnit: 0.030 },
      { name: "Whole Milk",        quantity: 0.10, unit: "L",   costPerUnit: 1.20 },
    ],
  },
  {
    name: "Eclairs",
    description: "Classic French choux pastry filled with vanilla pastry cream, topped with chocolate glaze.",
    yieldQty: 15, yieldUnit: "pcs", expiryDays: 2, sellingPrice: 2.80,
    notes: "Pipe onto parchment, bake at 200°C for 25 min. Fill only when completely cold.",
    ingredients: [
      { name: "All-Purpose Flour", quantity: 0.15, unit: "kg",  costPerUnit: 0.80 },
      { name: "Butter",            quantity: 0.10, unit: "kg",  costPerUnit: 5.50 },
      { name: "Eggs",              quantity: 4,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Whole Milk",        quantity: 0.30, unit: "L",   costPerUnit: 1.20 },
      { name: "Heavy Cream",       quantity: 0.20, unit: "L",   costPerUnit: 2.50 },
      { name: "Dark Chocolate",    quantity: 0.10, unit: "kg",  costPerUnit: 8.00 },
      { name: "Granulated Sugar",  quantity: 0.05, unit: "kg",  costPerUnit: 0.90 },
      { name: "Vanilla Extract",   quantity: 5,    unit: "ml",  costPerUnit: 0.050 },
    ],
  },
  {
    name: "Whole Wheat Loaf",
    description: "Hearty high-fiber whole wheat bread with nutty, earthy flavor. Great for sandwiches.",
    yieldQty: 3, yieldUnit: "loaves", expiryDays: 4, sellingPrice: 4.50,
    notes: "Mix whole wheat and bread flour for lighter crumb. Requires longer proof time than white bread.",
    ingredients: [
      { name: "Bread Flour", quantity: 0.30, unit: "kg", costPerUnit: 1.00 },
      { name: "Yeast (dry)", quantity: 7,    unit: "g",  costPerUnit: 0.020 },
      { name: "Salt",        quantity: 10,   unit: "g",  costPerUnit: 0.003 },
      { name: "Honey",       quantity: 0.02, unit: "kg", costPerUnit: 7.00 },
      { name: "Whole Milk",  quantity: 0.25, unit: "L",  costPerUnit: 1.20 },
      { name: "Butter",      quantity: 0.02, unit: "kg", costPerUnit: 5.50 },
    ],
  },
  {
    name: "Cream Puffs",
    description: "Light, airy choux pastry shells filled with fresh whipped cream. Dusted with powdered sugar.",
    yieldQty: 24, yieldUnit: "pcs", expiryDays: 1, sellingPrice: 1.50,
    notes: "Fill just before serving to keep crisp. Store unfilled shells at room temperature for up to 4 hours.",
    ingredients: [
      { name: "All-Purpose Flour", quantity: 0.15, unit: "kg",  costPerUnit: 0.80 },
      { name: "Butter",            quantity: 0.10, unit: "kg",  costPerUnit: 5.50 },
      { name: "Eggs",              quantity: 4,    unit: "pcs", costPerUnit: 0.25 },
      { name: "Heavy Cream",       quantity: 0.30, unit: "L",   costPerUnit: 2.50 },
      { name: "Powdered Sugar",    quantity: 0.03, unit: "kg",  costPerUnit: 1.10 },
      { name: "Vanilla Extract",   quantity: 5,    unit: "ml",  costPerUnit: 0.050 },
    ],
  },
]

// -- BAKERY EXPENSE TEMPLATES -------------------------------------------------
type ExpenseDef = {
  category: string; description: string; amount: [number, number]
  vendor: string | null; paymentMethod: string; recurrence: string; notes?: string
}

const MONTHLY_EXPENSES: ExpenseDef[] = [
  { category: "rent",        description: "Bakery premises monthly rent",           amount: [2200, 2800], vendor: "City Properties LLC",  paymentMethod: "transfer", recurrence: "monthly", notes: "Includes loading bay access" },
  { category: "utilities",   description: "Electricity & lighting bill",            amount: [280,  460],  vendor: "City Electric Co.",     paymentMethod: "transfer", recurrence: "monthly" },
  { category: "utilities",   description: "Gas (ovens & heating) bill",             amount: [130,  260],  vendor: "Metro Gas Corp",        paymentMethod: "transfer", recurrence: "monthly" },
  { category: "utilities",   description: "Water & sewage bill",                    amount: [60,   120],  vendor: "City Water Authority",  paymentMethod: "transfer", recurrence: "monthly" },
  { category: "salaries",    description: "Staff payroll — full month",             amount: [14500, 22000], vendor: null,                 paymentMethod: "transfer", recurrence: "monthly", notes: "Net pay after deductions" },
  { category: "ingredients", description: "Monthly bulk ingredients order",         amount: [1400, 2600],  vendor: "FreshMill Supplies",   paymentMethod: "transfer", recurrence: "monthly", notes: "Flour, sugar, butter, dairy" },
  { category: "packaging",   description: "Packaging materials restock",            amount: [200,  450],  vendor: "PackagePro Ltd",        paymentMethod: "card",     recurrence: "monthly", notes: "Boxes, bags, labels, tissue paper" },
  { category: "other",       description: "Cleaning & hygiene supplies",            amount: [60,   140],  vendor: "CleanMart",             paymentMethod: "cash",     recurrence: "monthly", notes: "Detergents, gloves, aprons" },
]

const WEEKLY_EXPENSES: ExpenseDef[] = [
  { category: "ingredients", description: "Weekly fresh produce & perishables",     amount: [280, 650], vendor: "Farm Direct",            paymentMethod: "cash",  recurrence: "weekly", notes: "Eggs, milk, cream, butter top-up" },
  { category: "ingredients", description: "Specialty chocolate & nuts order",       amount: [150, 400], vendor: "City Ingredients Ltd",   paymentMethod: "card",  recurrence: "weekly", notes: "Dark chocolate, almond flour, extracts" },
]

const QUARTERLY_EXPENSES: ExpenseDef[] = [
  { category: "equipment",   description: "Oven & mixer professional servicing",    amount: [400, 950],  vendor: "BakerEquip Services",   paymentMethod: "cheque", recurrence: "one_time", notes: "Preventative maintenance" },
  { category: "marketing",   description: "Seasonal marketing campaign",            amount: [400, 900],  vendor: "DigitalBoost Agency",   paymentMethod: "card",   recurrence: "one_time", notes: "Social media, flyers, local ads" },
  { category: "packaging",   description: "Branded seasonal packaging",             amount: [300, 700],  vendor: "PackagePro Ltd",        paymentMethod: "card",   recurrence: "one_time", notes: "Holiday and seasonal custom boxes" },
]

const OCCASIONAL_EXPENSES: (ExpenseDef & { probability: number })[] = [
  { category: "maintenance",  description: "Repair — oven thermostat / mixer belt", amount: [150, 600],  vendor: "BakerEquip Services",  paymentMethod: "cash", recurrence: "one_time", probability: 0.012 },
  { category: "equipment",    description: "New baking equipment / smallwares",     amount: [300, 2500], vendor: "BakerEquip Services",  paymentMethod: "card", recurrence: "one_time", probability: 0.005 },
  { category: "marketing",    description: "Print flyers & promotional materials",  amount: [100, 400],  vendor: "PrintShop Co",         paymentMethod: "cash", recurrence: "one_time", probability: 0.008 },
  { category: "ingredients",  description: "Urgent ingredient re-order",            amount: [100, 500],  vendor: "Wholesale Baking Co.", paymentMethod: "cash", recurrence: "one_time", probability: 0.020, notes: "Unplanned top-up order" },
  { category: "maintenance",  description: "Plumbing / electrical minor repair",    amount: [80,  400],  vendor: null,                   paymentMethod: "cash", recurrence: "one_time", probability: 0.008 },
  { category: "other",        description: "Staff uniform / protective gear",       amount: [80,  300],  vendor: "SafeWork Supplies",    paymentMethod: "cash", recurrence: "one_time", probability: 0.006 },
  { category: "other",        description: "Miscellaneous operating expense",       amount: [20,  150],  vendor: null,                   paymentMethod: "cash", recurrence: "one_time", probability: 0.040 },
]

// -- MAIN ---------------------------------------------------------------------
async function main() {
  console.log("Bakery seed starting...\n")
  const p: any = prisma

  // 1. CLEAR
  console.log("Clearing existing bakery data...")
  await p.productionSchedule?.deleteMany().catch(() => {})
  await p.bakerySale?.deleteMany().catch(() => {})
  await p.wasteLog?.deleteMany().catch(() => {})
  await p.productionBatch?.deleteMany().catch(() => {})
  await p.recipeIngredient?.deleteMany().catch(() => {})
  await p.recipe?.deleteMany().catch(() => {})
  await p.pantryIngredient?.deleteMany().catch(() => {})
  await p.bakeryExpense?.deleteMany().catch(() => {})
  await p.financialTransaction?.deleteMany().catch(() => {})
  await p.employeeOvertime?.deleteMany().catch(() => {})
  await p.employeeShift?.deleteMany().catch(() => {})
  await p.employeePayroll?.deleteMany().catch(() => {})
  await p.employeeActivityLog?.deleteMany().catch(() => {})
  await p.employeeDocument?.deleteMany().catch(() => {})
  await p.employeeAttendance?.deleteMany().catch(() => {})
  await p.employee?.deleteMany().catch(() => {})
  await p.emailReport?.deleteMany().catch(() => {})
  await p.user?.deleteMany().catch(() => {})
  console.log("Cleared\n")

  // 2. USERS
  console.log("Creating users...")
  const passwordHash = await bcrypt.hash("password123", 10)
  const adminHash    = await bcrypt.hash("setup123", 10)

  const users = await Promise.all([
    prisma.user.upsert({ where: { username: "setup" },   update: {}, create: { username: "setup",   passwordHash: adminHash,    role: "admin",   fullName: "Setup Admin",       isActive: true } }),
    prisma.user.upsert({ where: { username: "manager" }, update: {}, create: { username: "manager", passwordHash: passwordHash, role: "admin",   fullName: "Bakery Manager",    isActive: true } }),
    prisma.user.upsert({ where: { username: "baker1" },  update: {}, create: { username: "baker1",  passwordHash: passwordHash, role: "cashier", fullName: "Head Baker",        isActive: true } }),
    prisma.user.upsert({ where: { username: "baker2" },  update: {}, create: { username: "baker2",  passwordHash: passwordHash, role: "cashier", fullName: "Pastry Chef",       isActive: true } }),
    prisma.user.upsert({ where: { username: "sales1" },  update: {}, create: { username: "sales1",  passwordHash: passwordHash, role: "cashier", fullName: "Sales Associate 1", isActive: true } }),
    prisma.user.upsert({ where: { username: "sales2" },  update: {}, create: { username: "sales2",  passwordHash: passwordHash, role: "cashier", fullName: "Sales Associate 2", isActive: true } }),
  ])
  console.log(`${users.length} users\n`)

  // 3. EMPLOYEES
  console.log("Creating employees + 4 years of HR data...")
  const employees: any[] = []
  for (let i = 0; i < EMPLOYEE_ROLES.length; i++) {
    const def   = EMPLOYEE_ROLES[i]
    const fname = FIRST_NAMES[i]
    const lname = LAST_NAMES[i]
    const hire  = randomDate(FOUR_YEARS_AGO, THREE_YEARS_AGO)

    const emp = await prisma.employee.create({
      data: {
        name:           `${fname} ${lname}`,
        email:          `${fname.toLowerCase()}.${lname.toLowerCase()}@bakery.com`,
        phone:          `+1-555-${String(ri(100, 999))}-${String(ri(1000, 9999))}`,
        role:           def.role,
        department:     def.department,
        salary:         def.salary,
        employmentType: def.type,
        hireDate:       hire,
        status:         "active",
        address:        `${ri(1, 999)} Main St, City`,
        nationalId:     `EMP${String(i + 1).padStart(4, "0")}`,
        notes:          `${def.role} at the bakery since ${hire.getFullYear()}`,
      }
    })
    employees.push(emp)

    // Attendance
    const attBatch: any[] = []
    for (let d = 4 * 365; d >= 0; d--) {
      const day = daysAgo(d)
      if (day < hire) continue
      const dow = day.getDay()
      if (dow === 0 || dow === 6) continue
      const present = Math.random() > 0.05
      attBatch.push({
        employeeId: emp.id, date: day,
        status:   present ? (Math.random() > 0.1 ? "present" : "late") : "absent",
        checkIn:  present ? new Date(day.getTime() + ri(6, 9) * 3_600_000) : null,
        checkOut: present ? new Date(day.getTime() + ri(14, 18) * 3_600_000) : null,
        notes: null,
      })
      if (attBatch.length >= 500) { await prisma.employeeAttendance.createMany({ data: attBatch }); attBatch.length = 0 }
    }
    if (attBatch.length > 0) await prisma.employeeAttendance.createMany({ data: attBatch })

    // Payroll (48 months)
    for (let m = 47; m >= 0; m--) {
      const payDate   = new Date(NOW.getFullYear(), NOW.getMonth() - m, 28)
      if (payDate < hire) continue
      const bonus     = Math.random() > 0.8 ? ri(100, 500) : 0
      const deduction = Math.random() > 0.9 ? ri(50, 200) : 0
      await prisma.employeePayroll.create({ data: {
        employeeId: emp.id, month: payDate.getMonth() + 1, year: payDate.getFullYear(),
        baseSalary: def.salary, bonuses: bonus, deductions: deduction,
        netPay: def.salary + bonus - deduction, paidDate: payDate, status: "paid",
        notes: bonus > 0 ? "Performance bonus included" : null,
      }}).catch(() => {})
    }

    // Shifts (last 90 days)
    for (let d = 90; d >= 0; d--) {
      const shiftDate = daysAgo(d)
      if (shiftDate < hire) continue
      const dow = shiftDate.getDay()
      if (dow === 0 || dow === 6) continue
      const startHour = ri(5, 8)
      await prisma.employeeShift.create({ data: {
        employeeId: emp.id, date: shiftDate,
        startTime:  `${String(startHour).padStart(2, "0")}:00`,
        endTime:    `${String(startHour + ri(7, 9)).padStart(2, "0")}:00`,
        shiftType:  startHour <= 6 ? "morning" : "day", notes: null,
      }}).catch(() => {})
    }

    // Overtime (20 records)
    for (let o = 0; o < 20; o++) {
      const otDate = randomDate(FOUR_YEARS_AGO, NOW)
      if (otDate < hire) continue
      await prisma.employeeOvertime.create({ data: {
        employeeId: emp.id, date: otDate, hours: rp(1, 4),
        reason: pick(["Holiday baking","Peak season","Special order","Staff shortage","Equipment maintenance"]),
        approved: true, approvedBy: "manager", multiplier: 1.5,
      }}).catch(() => {})
    }

    // Activity log
    await prisma.employeeActivityLog.create({ data: {
      employeeId: emp.id, action: "hired",
      details: `${emp.name} joined as ${def.role}`, performedBy: "manager",
    }}).catch(() => {})
  }
  console.log(`${employees.length} employees (attendance + payroll + shifts + overtime)\n`)

  // 4. PANTRY
  console.log("Creating pantry ingredients...")
  const pantryItems: any[] = []
  for (let i = 0; i < PANTRY_DEFS.length; i++) {
    const def = PANTRY_DEFS[i]
    // Keep a subset intentionally low to exercise low-stock/reorder UI flows.
    const shouldBeLow = i % 5 === 0
    const currentStock = shouldBeLow
      ? rp(Math.max(0.05, def.lowStock * 0.35), Math.max(0.1, def.lowStock * 0.9))
      : rp(def.reorderPoint! * 1.5, def.reorderPoint! * 4)

    const item = await prisma.pantryIngredient.create({ data: {
      name: def.name,
      currentStock,
      unit:              def.unit,
      costPerUnit:       def.costPerUnit,
      lowStockThreshold: def.lowStock,
      reorderPoint:      def.reorderPoint,
      reorderQuantity:   def.reorderQty,
      lastOrderedDate:   randomDate(daysAgo(14), NOW),
      supplierName:      def.supplier,
      notes: shouldBeLow ? "Intentional low stock for dashboard demo" : null,
    }})
    pantryItems.push(item)
  }
  const pantryByName = new Map(pantryItems.map(p => [p.name, p]))
  console.log(`${pantryItems.length} pantry ingredients\n`)

  // 5. RECIPES
  console.log("Creating recipes...")
  const recipes: any[] = []
  for (const def of RECIPE_DEFS) {
    const recipe = await prisma.recipe.create({ data: {
      name: def.name, description: def.description,
      yieldQty: def.yieldQty, yieldUnit: def.yieldUnit,
      expiryDays: def.expiryDays, sellingPrice: def.sellingPrice,
      notes: def.notes, isActive: true,
    }})
    for (const ing of def.ingredients) {
      const pantry = pantryByName.get(ing.name)
      await prisma.recipeIngredient.create({ data: {
        recipeId: recipe.id, name: ing.name,
        quantity: ing.quantity, unit: ing.unit, costPerUnit: ing.costPerUnit,
        supplierName: pantry?.supplierName ?? null,
        pantryIngredientId: pantry?.id ?? null,
      }})
    }
    recipes.push(recipe)
  }
  console.log(`${recipes.length} recipes with ingredients & selling prices\n`)

  // 6. PRODUCTION BATCHES
  console.log("Creating 4 years of production batches...")
  let batchCount = 0
  const batchRecords: any[] = []
  const batchIdByRecipeDay = new Map<string, string>()

  for (let d = 4 * 365; d >= 0; d--) {
    const batchDate = daysAgo(d)
    if (batchDate.getDay() === 0) continue
    const batchesPerDay = batchDate.getDay() === 6 ? ri(2, 4) : ri(3, 6)

    for (let b = 0; b < batchesPerDay; b++) {
      const recipe        = recipes[b % recipes.length]
      const quantity      = rp(1, 4)
      const unitsProduced = Math.round(quantity * recipe.yieldQty * 10) / 10
      const recDef        = RECIPE_DEFS.find(r => r.name === recipe.name)!
      const totalCost     = recDef.ingredients.reduce((s, i) => s + i.quantity * i.costPerUnit * quantity, 0)
      const expiresAt     = recipe.expiryDays ? new Date(batchDate.getTime() + recipe.expiryDays * MS_DAY) : null
      const batchId       = uuid()

      batchRecords.push({
        id: batchId, recipeId: recipe.id, batchDate,
        quantity, unitsProduced,
        totalCost: Math.round(totalCost * 100) / 100,
        expiresAt,
        notes: Math.random() > 0.85
          ? pick(["Slight over-browning","Perfect batch","Extra glaze applied","Customer rush order","Seasonal special"])
          : null,
        createdAt: batchDate, updatedAt: batchDate,
      })
      batchIdByRecipeDay.set(`${recipe.id}_${d}`, batchId)
    }
    if (batchRecords.length >= 500) {
      await prisma.productionBatch.createMany({ data: batchRecords })
      batchCount += batchRecords.length; batchRecords.length = 0
    }
  }
  if (batchRecords.length > 0) {
    await prisma.productionBatch.createMany({ data: batchRecords })
    batchCount += batchRecords.length
  }
  console.log(`${batchCount} production batches\n`)

  // 7. PRODUCTION SCHEDULES
  console.log("Creating production schedules...")
  let schedCount = 0
  const schedRecords: any[] = []

  for (let d = 4 * 365; d >= 1; d--) {
    const schedDate = daysAgo(d)
    if (schedDate.getDay() === 0) continue
    const recipe  = recipes[d % recipes.length]
    const planned = rp(2, 5)
    // Historical status mix to exercise all Schedule filters.
    const statusRoll = Math.random()
    const status = statusRoll < 0.72
      ? "completed"
      : statusRoll < 0.86
        ? "cancelled"
        : statusRoll < 0.95
          ? "planned"
          : "in-progress"
    schedRecords.push({
      id: uuid(), recipeId: recipe.id, scheduledDate: schedDate,
      plannedQuantity: planned,
      actualQuantity: status === "completed" ? rp(planned * 0.8, planned * 1.1) : null,
      status,
      notes: status === "in-progress" ? "Carry-over production run" : null,
      createdAt: schedDate, updatedAt: schedDate,
    })
    if (schedRecords.length >= 500) {
      await prisma.productionSchedule.createMany({ data: schedRecords })
      schedCount += schedRecords.length; schedRecords.length = 0
    }
  }
  for (let d = 0; d <= 30; d++) {
    const schedDate = daysFromNow(d)
    if (schedDate.getDay() === 0) continue
    const recipe = recipes[d % recipes.length]
    schedRecords.push({
      id: uuid(), recipeId: recipe.id, scheduledDate: schedDate,
      plannedQuantity: rp(2, 5), actualQuantity: null,
      status: d === 0 ? "in-progress" : "planned",
      notes: d === 0 ? "Currently in production" : null,
      createdAt: NOW, updatedAt: NOW,
    })
  }
  if (schedRecords.length > 0) {
    await prisma.productionSchedule.createMany({ data: schedRecords })
    schedCount += schedRecords.length
  }
  console.log(`${schedCount} production schedules\n`)

  // 8. WASTE LOGS
  console.log("Creating waste logs...")
  let wasteCount = 0
  const wasteRecords: any[] = []

  for (let d = 4 * 365; d >= 0; d--) {
    const wasteDate = daysAgo(d)
    if (Math.random() > 0.40) continue
    const numLogs = ri(1, 3)
    for (let w = 0; w < numLogs; w++) {
      const wasteType = pick(WASTE_TYPES)
      const recipe    = Math.random() > 0.5 ? pick(recipes) : null
      const pantry    = wasteType === "ingredient" ? pick(pantryItems) : null
      const batchId   = recipe ? (batchIdByRecipeDay.get(`${recipe.id}_${d}`) ?? null) : null
      const recDef    = recipe ? RECIPE_DEFS.find(r => r.name === recipe.name) : null

      wasteRecords.push({
        id: uuid(), wasteType,
        recipeId:          recipe?.id ?? null,
        productionBatchId: wasteType === "production_batch" ? (batchId ?? null) : null,
        pantryIngredientId: pantry?.id ?? null,
        itemName:  pantry?.name ?? (recipe?.name ?? pick(["Croissants","Bread loaf","Cake slice","Cookie batch","Eclair tray"])),
        quantity:  rp(0.1, 5),
        unit:      pantry?.unit ?? (recDef?.yieldUnit ?? "pcs"),
        cost:      rp(1, 30),
        reason:    pick(WASTE_REASONS),
        wasteDate,
        notes: Math.random() > 0.7 ? pick([
          "Discarded per hygiene protocol","End-of-day disposal","Fell on floor",
          "Wrong bake temperature","Customer return","Quality control rejection",
        ]) : null,
        createdAt: wasteDate,
      })
    }
    if (wasteRecords.length >= 500) {
      await prisma.wasteLog.createMany({ data: wasteRecords })
      wasteCount += wasteRecords.length; wasteRecords.length = 0
    }
  }
  if (wasteRecords.length > 0) {
    await prisma.wasteLog.createMany({ data: wasteRecords })
    wasteCount += wasteRecords.length
  }
  console.log(`${wasteCount} waste logs\n`)

  // 9. BAKERY SALES (last 3 days unsold — POS demo stock)
  console.log("Creating bakery sales...")
  let saleCount = 0
  const saleRecords: any[] = []

  for (let d = 4 * 365; d >= 4; d--) {
    const saleDate = daysAgo(d)
    if (saleDate.getDay() === 0) continue

    const numRecipes = ri(3, 6)
    const shuffled   = [...recipes].sort(() => Math.random() - 0.5).slice(0, numRecipes)

    for (const recipe of shuffled) {
      const recDef  = RECIPE_DEFS.find(r => r.name === recipe.name)!
      const batchId = batchIdByRecipeDay.get(`${recipe.id}_${d}`) ?? null
      const numTx   = ri(1, 3)

      for (let tx = 0; tx < numTx; tx++) {
        const unitPrice   = Math.round(recDef.sellingPrice * (0.95 + Math.random() * 0.10) * 100) / 100
        const quantity    = ri(2, Math.max(3, Math.floor(recipe.yieldQty * 2)))
        const totalAmount = Math.round(unitPrice * quantity * 100) / 100
        const saleDt      = new Date(saleDate)
        saleDt.setHours(ri(8, 19), ri(0, 59), 0, 0)

        saleRecords.push({
          id: uuid(), recipeId: recipe.id, batchId,
          itemName: recipe.name, quantity, unitPrice, totalAmount,
          saleDate: saleDt,
          notes: Math.random() > 0.92 ? pick(["Wholesale order","Event catering","Regular customer","Walk-in sale"]) : null,
          createdAt: saleDt, updatedAt: saleDt,
        })
      }
    }
    if (saleRecords.length >= 500) {
      await prisma.bakerySale.createMany({ data: saleRecords })
      saleCount += saleRecords.length; saleRecords.length = 0
    }
  }
  if (saleRecords.length > 0) {
    await prisma.bakerySale.createMany({ data: saleRecords })
    saleCount += saleRecords.length
  }
  console.log(`${saleCount} bakery sales (last 3 days kept unsold for POS demo)\n`)

  // 10. BAKERY EXPENSES
  console.log("Creating bakery expenses...")
  let expenseCount = 0
  const expenseRecords: any[] = []

  for (let d = 4 * 365; d >= 0; d--) {
    const expDate = daysAgo(d)
    const dow     = expDate.getDay()
    const dom     = expDate.getDate()

    // Monthly (each expense has a dedicated day-of-month)
    if (dow !== 0) {
      for (let ei = 0; ei < MONTHLY_EXPENSES.length; ei++) {
        const def      = MONTHLY_EXPENSES[ei]
        const targetDom = (ei * 3 + 1)
        if (dom !== Math.min(targetDom, 28)) continue
        expenseRecords.push({
          id: uuid(), date: expDate,
          category: def.category, description: def.description,
          amount: rp(def.amount[0], def.amount[1]),
          vendor: def.vendor, paymentMethod: def.paymentMethod,
          recurrence: def.recurrence, notes: def.notes ?? null,
          createdAt: expDate, updatedAt: expDate,
        })
      }
    }

    // Weekly (every Monday)
    if (dow === 1) {
      for (const def of WEEKLY_EXPENSES) {
        if (Math.random() > 0.85) continue
        expenseRecords.push({
          id: uuid(), date: expDate,
          category: def.category, description: def.description,
          amount: rp(def.amount[0], def.amount[1]),
          vendor: def.vendor, paymentMethod: def.paymentMethod,
          recurrence: def.recurrence, notes: def.notes ?? null,
          createdAt: expDate, updatedAt: expDate,
        })
      }
    }

    // Quarterly (every 91 days)
    if (d % 91 === 0 && d > 0) {
      for (const def of QUARTERLY_EXPENSES) {
        expenseRecords.push({
          id: uuid(), date: expDate,
          category: def.category, description: def.description,
          amount: rp(def.amount[0], def.amount[1]),
          vendor: def.vendor, paymentMethod: def.paymentMethod,
          recurrence: def.recurrence, notes: def.notes ?? null,
          createdAt: expDate, updatedAt: expDate,
        })
      }
    }

    // Occasional
    for (const def of OCCASIONAL_EXPENSES) {
      if (Math.random() > def.probability) continue
      expenseRecords.push({
        id: uuid(), date: expDate,
        category: def.category, description: def.description,
        amount: rp(def.amount[0], def.amount[1]),
        vendor: def.vendor, paymentMethod: def.paymentMethod,
        recurrence: def.recurrence, notes: def.notes ?? null,
        createdAt: expDate, updatedAt: expDate,
      })
    }

    if (expenseRecords.length >= 500) {
      await prisma.bakeryExpense.createMany({ data: expenseRecords })
      expenseCount += expenseRecords.length; expenseRecords.length = 0
    }
  }
  if (expenseRecords.length > 0) {
    await prisma.bakeryExpense.createMany({ data: expenseRecords })
    expenseCount += expenseRecords.length
  }
  console.log(`${expenseCount} bakery expenses (rent, utilities, salaries, ingredients, equipment, marketing, maintenance, packaging, other)\n`)

  // 11. FINANCIAL TRANSACTIONS (ledger)
  console.log("Creating financial transactions...")
  let ftCount = 0
  const ftRecords: any[] = []

  for (let d = 4 * 365; d >= 0; d--) {
    const txDate = daysAgo(d)
    if (txDate.getDay() === 0) continue

    ftRecords.push({
      id: uuid(), type: "income",
      amount: rp(800, 3500),
      description: "Daily bakery sales revenue",
      userId: users[0].id, createdAt: txDate, updatedAt: txDate,
    })

    if (txDate.getDate() === 1) {
      for (const exp of [
        { desc: "Monthly rent",               amount: rp(2200, 2800)   },
        { desc: "Utilities (elec+gas+water)", amount: rp(480,  840)    },
        { desc: "Ingredients bulk order",     amount: rp(1500, 3000)   },
        { desc: "Staff payroll",              amount: rp(14500, 22000) },
        { desc: "Packaging materials",        amount: rp(200,  450)    },
      ]) {
        ftRecords.push({
          id: uuid(), type: "expense", amount: exp.amount,
          description: exp.desc, userId: users[0].id,
          createdAt: txDate, updatedAt: txDate,
        })
      }
    }

    if (Math.random() > 0.85) {
      const cat = pick(FT_EXPENSE_CATS)
      ftRecords.push({
        id: uuid(), type: "expense",
        amount: rp(50, 500),
        description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} expense`,
        userId: users[0].id, createdAt: txDate, updatedAt: txDate,
      })
    }

    if (ftRecords.length >= 500) {
      await prisma.financialTransaction.createMany({ data: ftRecords })
      ftCount += ftRecords.length; ftRecords.length = 0
    }
  }
  if (ftRecords.length > 0) {
    await prisma.financialTransaction.createMany({ data: ftRecords })
    ftCount += ftRecords.length
  }
  console.log(`${ftCount} financial transactions\n`)

  // SUMMARY
  console.log("=".repeat(60))
  console.log("Bakery seed complete!")
  console.log("=".repeat(60))
  console.log(`   ${users.length} users`)
  console.log(`   ${employees.length} employees  (attendance, payroll, shifts, overtime)`)
  console.log(`   ${pantryItems.length} pantry ingredients  (all linked to recipes)`)
  console.log(`   ${recipes.length} recipes  (selling prices + full ingredient data)`)
  console.log(`   ${batchCount} production batches  (4 years daily)`)
  console.log(`   ${schedCount} production schedules`)
  console.log(`   ${wasteCount} waste logs`)
  console.log(`   ${saleCount} bakery sales  (batch-linked; last 3 days for POS)`)
  console.log(`   ${expenseCount} bakery expenses  (all 9 categories)`)
  console.log(`   ${ftCount} financial transactions`)
  console.log("=".repeat(60))
  console.log("")
  console.log("Login credentials:")
  console.log("   setup   / setup123")
  console.log("   manager / password123")
  console.log("   baker1  / password123")
  console.log("")
  console.log("POS ready: batches from the last 3 days are unsold and visible in Sales -> Sell tab")
  console.log("")
}

main()
  .catch(e => { console.error("Seed failed:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
