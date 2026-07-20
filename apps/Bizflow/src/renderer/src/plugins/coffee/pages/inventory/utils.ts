import type { Product, Category, FilterMode, CategoryGroup } from './types'

export function hexToRgba(hex: string, alpha = 0.15): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

// ── Stock helpers ───────────────────────────────────────────────────────────
export function isLow(p: Product): boolean {
  return p.stock > 0 && p.stock <= p.reorderPoint
}

export function isOut(p: Product): boolean {
  return p.stock === 0
}

export function stockPercent(p: Product): number {
  if (p.stock <= 0) return 0
  const pct = (p.stock / (p.reorderPoint * 2)) * 100
  return Math.min(100, Math.max(0, pct))
}

export function stockBarColor(p: Product): string {
  if (isOut(p)) return '#dc2626'     // red
  if (isLow(p)) return '#ea580c'     // orange
  return '#16a34a'                    // green
}

// ── Filtering ───────────────────────────────────────────────────────────────
export function filterProducts(
  products: Product[],
  mode: FilterMode,
  search: string
): Product[] {
  return products.filter(p => {
    if (mode === 'low') return isLow(p)
    if (mode === 'out') return isOut(p)
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.category?.name.toLowerCase().includes(q)
    }
    return true
  })
}

// ── Grouping ────────────────────────────────────────────────────────────────
export function groupByCategory(
  products: Product[],
  categories: Category[]
): CategoryGroup[] {
  const catMap = new Map(categories.map(c => [c.id, c]))
  const groups: CategoryGroup[] = []
  const uncategorised: Product[] = []

  for (const p of products) {
    if (!p.categoryId) { uncategorised.push(p); continue }
    const g = groups.find(g => g.category?.id === p.categoryId)
    if (g) {
      g.products.push(p)
      g.totalUnits += p.stock
      g.totalValue += p.stock * p.cost
      g.expRevenue += p.stock * p.price
    } else {
      const cat = catMap.get(p.categoryId) ?? null
      groups.push({
        category: cat,
        products: [p],
        totalUnits: p.stock,
        totalValue: p.stock * p.cost,
        expRevenue: p.stock * p.price,
      })
    }
  }

  if (uncategorised.length > 0) {
    groups.push({
      category: null,
      products: uncategorised,
      totalUnits:   uncategorised.reduce((s, p) => s + p.stock, 0),
      totalValue:   uncategorised.reduce((s, p) => s + p.stock * p.cost, 0),
      expRevenue:   uncategorised.reduce((s, p) => s + p.stock * p.price, 0),
    })
  }

  return groups
}

// ── KPIs ────────────────────────────────────────────────────────────────────
export function computeKPIs(products: Product[]) {
  return {
    totalProducts: products.length,
    totalUnits:    products.reduce((s, p) => s + p.stock, 0),
    invValue:      products.reduce((s, p) => s + p.stock * p.cost, 0),
    expRevenue:    products.reduce((s, p) => s + p.stock * p.price, 0),
    lowCount:      products.filter(isLow).length,
    outCount:      products.filter(isOut).length,
  }
}
