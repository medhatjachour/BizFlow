import { PRODUCT_UNITS, DEFAULT_UNIT } from './constants'
import type { Product, ProductForm, ProductFilters } from './types'

export function getUnitConfig(unit: string) {
  return PRODUCT_UNITS.find((u) => u.value === unit) ?? PRODUCT_UNITS[0]
}

export function formatStock(value: number, unit: string = DEFAULT_UNIT): string {
  const config = getUnitConfig(unit)
  return `${value.toFixed(config.decimals)} ${config.symbol}`
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`
}

export function hexToRgba(hex: string, alpha: number = 0.15): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function productToForm(p: Product): ProductForm {
  return {
    name: p.name,
    description: p.description ?? '',
    price: String(p.price),
    cost: String(p.cost),
    unit: p.unit ?? DEFAULT_UNIT,
    stock: String(p.stock),
    reorderPoint: String(p.reorderPoint),
    isAvailable: p.isAvailable,
    displayOrder: String(p.displayOrder),
    notes: p.notes ?? '',
    categoryId: p.categoryId ?? ''
  }
}

export function formToProductData(form: ProductForm) {
  return {
    name: form.name.trim(),
    description: form.description || undefined,
    price: Number(form.price),
    cost: Number(form.cost),
    unit: form.unit,
    stock: Number(form.stock),
    reorderPoint: Number(form.reorderPoint),
    isAvailable: form.isAvailable,
    displayOrder: Number(form.displayOrder),
    notes: form.notes || undefined,
    categoryId: form.categoryId || undefined
  }
}

export function calcMargin(price: number, cost: number): { margin: number; pct: number } {
  if (price <= 0) return { margin: 0, pct: 0 }
  const margin = price - cost
  const pct = Math.round((margin / price) * 100)
  return { margin, pct }
}

export function isLowStock(product: Product): boolean {
  return product.stock <= product.reorderPoint
}

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((p) => {
    if (filters.categoryId !== 'all' && p.categoryId !== filters.categoryId) return false
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })
}
